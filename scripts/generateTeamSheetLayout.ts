/**
 * One-off codegen: extracts field-label positions from the bundled official
 * Play! Pokémon team-list PDF (public/vg-team-list-template.pdf) and derives
 * where to draw each value (player info + per-Pokémon data) on top of it.
 * Same generated-snapshot approach as generateMultiHitMoves.ts - the PDF is
 * a static asset, not something read at codegen time from a live source, so
 * this only needs rerunning if that asset is ever replaced.
 *
 * Not run as part of the build - regenerate manually if the template PDF
 * changes:
 *   npx tsx scripts/generateTeamSheetLayout.ts
 *
 * The form's own layout is extremely regular: every field is a text label
 * immediately followed by a blank space to write on, on the same baseline.
 * So for every label the value position is just "label's own x + label's
 * rendered width + a small gap", at the label's own y. Verified against the
 * real template (both pages are 612x792pt / US Letter) via pdfjs-dist's
 * getTextContent(), which returns exact per-glyph x/y/width in PDF points -
 * far more precise than eyeballing a rendered image. Age Division is the one
 * exception (a checkbox square drawn to the left of "Juniors"/"Seniors"/
 * "Masters", not part of the text layer at all, so its mark position is an
 * estimate - CHECKBOX_OFFSET_X below - and is the one coordinate that most
 * needs visual verification after generating a real sample PDF.
 *
 * Per-Pokémon slot order: each page has a 2-column x 3-row grid of 6
 * identical "Pokémon" boxes. Slots are numbered column-major (left column
 * top-to-bottom = slots 0-2, right column top-to-bottom = slots 3-5),
 * matching the standard reading order for this specific official form.
 *
 * Page 0 ("For Tournament Staff") additionally has a per-Pokémon numeric
 * stat side-table (HP/Atk/Def/Sp. Atk/Sp. Def/Speed) - not present on page 1.
 * Originally left unfilled (assumed staff's handwritten field), but real
 * VGC team sheets are filled with the Pokémon's own computed stats -
 * services/teamSheetPdf.ts computes these via @smogon/calc the same way
 * useDamageCalc.ts does (level 50, max IVs, Nature, Stat Points*4 as EVs),
 * this script just locates where to draw them.
 */
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const GAP_X = 4;
const CHECKBOX_OFFSET_X = -10;
const PER_MON_FIELD_SIZE = 7;
const HEADER_FIELD_SIZE = 8;

interface TextItem { x: number; y: number; w: number; str: string }
interface Pos { x: number; y: number; size: number }

function value(item: TextItem, size: number): Pos {
  return { x: Number((item.x + item.w + GAP_X).toFixed(1)), y: Number(item.y.toFixed(1)), size };
}

async function getPageItems(doc: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<TextItem[]> {
  const page = await doc.getPage(pageNum);
  const content = await page.getTextContent();
  return content.items
    .map((item: any) => ({ x: item.transform[4], y: item.transform[5], w: item.width, str: item.str }))
    .filter((item: TextItem) => item.str.trim());
}

function findAll(items: TextItem[], str: string): TextItem[] {
  return items.filter(i => i.str === str);
}

function findOne(items: TextItem[], str: string): TextItem {
  const matches = findAll(items, str);
  if (matches.length !== 1) throw new Error(`Expected exactly 1 match for "${str}", found ${matches.length}`);
  return matches[0];
}

/** Column A (left) per-mon labels sit at x<200; column B (right) at 300<=x<450 - excludes the staff stat-table columns at x~248/540, which are deliberately never filled (see teamSheetLayout.ts header). */
function findColumnRows(items: TextItem[], str: string, column: 'A' | 'B'): TextItem[] {
  const matches = items.filter(i => i.str === str && (column === 'A' ? i.x < 200 : i.x >= 300 && i.x < 450));
  if (matches.length !== 3) throw new Error(`Expected 3 rows for "${str}" col ${column}, found ${matches.length}`);
  return matches.sort((a, b) => b.y - a.y);
}

function buildPokemonSlots(items: TextItem[]) {
  const fieldLabels: [key: string, label: string][] = [
    ['species', 'Pokémon'],
    ['statAlignment', 'Stat Alignment'],
    ['ability', 'Ability'],
    ['heldItem', 'Held Item'],
    ['move1', 'Move 1'],
    ['move2', 'Move 2'],
    ['move3', 'Move 3'],
    ['move4', 'Move 4'],
  ];
  const colA = Object.fromEntries(fieldLabels.map(([key, label]) => [key, findColumnRows(items, label, 'A')]));
  const colB = Object.fromEntries(fieldLabels.map(([key, label]) => [key, findColumnRows(items, label, 'B')]));

  const slots = [];
  for (let row = 0; row < 3; row++) {
    slots.push(Object.fromEntries(fieldLabels.map(([key]) => [key, value(colA[key][row], PER_MON_FIELD_SIZE)])));
  }
  for (let row = 0; row < 3; row++) {
    slots.push(Object.fromEntries(fieldLabels.map(([key]) => [key, value(colB[key][row], PER_MON_FIELD_SIZE)])));
  }
  return slots;
}

const STAT_FIELD_LABELS: [key: string, label: string][] = [
  ['hp', 'HP'],
  ['atk', 'Atk'],
  ['def', 'Def'],
  ['spa', 'Sp. Atk'],
  ['spd', 'Sp. Def'],
  ['spe', 'Speed'],
];

/** The per-Pokémon stat side-table sits further right than the Ability/Held Item/Move columns it lines up with - colA's numbers at 200<=x<300, colB's at x>=500, distinct from both per-mon field column ranges above. */
function findStatColumnRows(items: TextItem[], str: string, column: 'A' | 'B'): TextItem[] {
  const matches = items.filter(i => i.str === str && (column === 'A' ? (i.x >= 200 && i.x < 300) : i.x >= 500));
  if (matches.length !== 3) throw new Error(`Expected 3 rows for stat "${str}" col ${column}, found ${matches.length}`);
  return matches.sort((a, b) => b.y - a.y);
}

function buildStatsTables(items: TextItem[]) {
  const colA = Object.fromEntries(STAT_FIELD_LABELS.map(([key, label]) => [key, findStatColumnRows(items, label, 'A')]));
  const colB = Object.fromEntries(STAT_FIELD_LABELS.map(([key, label]) => [key, findStatColumnRows(items, label, 'B')]));
  const tables = [];
  for (let row = 0; row < 3; row++) {
    tables.push(Object.fromEntries(STAT_FIELD_LABELS.map(([key]) => [key, value(colA[key][row], PER_MON_FIELD_SIZE)])));
  }
  for (let row = 0; row < 3; row++) {
    tables.push(Object.fromEntries(STAT_FIELD_LABELS.map(([key]) => [key, value(colB[key][row], PER_MON_FIELD_SIZE)])));
  }
  return tables;
}

function buildHeaderStaffOnly(items: TextItem[]) {
  const playerId = findOne(items, 'Player ID:');
  const dob = findOne(items, 'Date of Birth:');
  const slashes = findAll(items, '/').filter(i => Math.abs(i.y - dob.y) < 1).sort((a, b) => a.x - b.x);
  if (slashes.length !== 2) throw new Error(`Expected 2 slashes on Date of Birth line, found ${slashes.length}`);
  const [slash1, slash2] = slashes;
  const supportId = findOne(items, 'Support ID');
  return {
    playerId: value(playerId, HEADER_FIELD_SIZE),
    dateOfBirth: {
      month: { x: Number((dob.x + dob.w + GAP_X).toFixed(1)), y: Number(dob.y.toFixed(1)), size: HEADER_FIELD_SIZE },
      day: { x: Number((slash1.x + slash1.w + GAP_X).toFixed(1)), y: Number(dob.y.toFixed(1)), size: HEADER_FIELD_SIZE },
      year: { x: Number((slash2.x + slash2.w + GAP_X).toFixed(1)), y: Number(dob.y.toFixed(1)), size: HEADER_FIELD_SIZE },
    },
    supportId: value(supportId, HEADER_FIELD_SIZE),
  };
}

function buildHeaderShared(items: TextItem[]) {
  const juniors = findOne(items, 'Juniors');
  const seniors = findOne(items, 'Seniors');
  const masters = findOne(items, 'Masters');
  const checkbox = (item: TextItem) => ({ x: Number((item.x + CHECKBOX_OFFSET_X).toFixed(1)), y: Number(item.y.toFixed(1)), size: HEADER_FIELD_SIZE });
  return {
    playerName: value(findOne(items, 'Player Name:'), HEADER_FIELD_SIZE),
    ageDivision: { juniors: checkbox(juniors), seniors: checkbox(seniors), masters: checkbox(masters) },
    trainerNameInGame: value(findOne(items, 'Trainer Name in Game:'), HEADER_FIELD_SIZE),
    battleTeamNumberName: value(findOne(items, 'Battle Team Number / Name:'), HEADER_FIELD_SIZE),
    switchProfileName: value(findOne(items, 'Switch Profile Name:'), HEADER_FIELD_SIZE),
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const pdfPath = join(__dirname, '../public/vg-team-list-template.pdf');
const data = new Uint8Array(await readFile(pdfPath));
const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
if (doc.numPages !== 2) throw new Error(`Expected 2-page template, found ${doc.numPages}`);

const page0Items = await getPageItems(doc, 1);
const page1Items = await getPageItems(doc, 2);

const page0StatsTables = buildStatsTables(page0Items);

const layout = {
  page0: { // "1 of 2: For Tournament Staff"
    ...buildHeaderShared(page0Items),
    ...buildHeaderStaffOnly(page0Items),
    pokemonSlots: buildPokemonSlots(page0Items).map((slot, i) => ({ ...slot, stats: page0StatsTables[i] })),
  },
  page1: { // "2 of 2: For Opponents"
    ...buildHeaderShared(page1Items),
    pokemonSlots: buildPokemonSlots(page1Items),
  },
};

const output = `/**
 * AUTO-GENERATED by scripts/generateTeamSheetLayout.ts - do not hand-edit.
 * Regenerate with: npx tsx scripts/generateTeamSheetLayout.ts
 *
 * Field draw positions (PDF points, origin bottom-left) for
 * public/vg-team-list-template.pdf, derived from the template's own text
 * layer - see the generator script's header for the derivation approach and
 * the one coordinate (Age Division checkboxes) that's an estimate rather
 * than an exact measurement.
 */
export interface TeamSheetFieldPos { x: number; y: number; size: number }
export interface TeamSheetStatsTable {
  hp: TeamSheetFieldPos;
  atk: TeamSheetFieldPos;
  def: TeamSheetFieldPos;
  spa: TeamSheetFieldPos;
  spd: TeamSheetFieldPos;
  spe: TeamSheetFieldPos;
}
export interface TeamSheetPokemonSlot {
  species: TeamSheetFieldPos;
  statAlignment: TeamSheetFieldPos;
  ability: TeamSheetFieldPos;
  heldItem: TeamSheetFieldPos;
  move1: TeamSheetFieldPos;
  move2: TeamSheetFieldPos;
  move3: TeamSheetFieldPos;
  move4: TeamSheetFieldPos;
}
export interface TeamSheetStaffPokemonSlot extends TeamSheetPokemonSlot {
  stats: TeamSheetStatsTable;
}
export interface TeamSheetPageLayout {
  playerName: TeamSheetFieldPos;
  ageDivision: { juniors: TeamSheetFieldPos; seniors: TeamSheetFieldPos; masters: TeamSheetFieldPos };
  trainerNameInGame: TeamSheetFieldPos;
  battleTeamNumberName: TeamSheetFieldPos;
  switchProfileName: TeamSheetFieldPos;
  pokemonSlots: TeamSheetPokemonSlot[];
}
export interface TeamSheetStaffPageLayout extends Omit<TeamSheetPageLayout, 'pokemonSlots'> {
  playerId: TeamSheetFieldPos;
  dateOfBirth: { month: TeamSheetFieldPos; day: TeamSheetFieldPos; year: TeamSheetFieldPos };
  supportId: TeamSheetFieldPos;
  pokemonSlots: TeamSheetStaffPokemonSlot[];
}
export const TEAM_SHEET_LAYOUT: { page0: TeamSheetStaffPageLayout; page1: TeamSheetPageLayout } = ${JSON.stringify(layout, null, 2)};
`;

const outPath = join(__dirname, '../src/renderer/config/teamSheetLayout.generated.ts');
await writeFile(outPath, output);
console.log(`Wrote layout for 2 pages to ${outPath}`);
