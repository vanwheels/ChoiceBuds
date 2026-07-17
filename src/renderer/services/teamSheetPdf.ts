/**
 * Generates a filled VGC Team Sheet PDF for a saved Team, by overlaying text
 * at fixed coordinates (config/teamSheetLayout.ts) on top of the bundled
 * official Play! Pokémon template (public/vg-team-list-template.pdf) - see
 * that config file's header for why coordinate overlay rather than named
 * form fields. Powers TeamSheetPdfModal.tsx's Download button; the returned
 * bytes are handed to a Blob + `<a download>`, same pattern
 * TeamExportImageModal.tsx already uses for its poster PNG.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Generations, Pokemon } from '@smogon/calc';
import type { NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import type { Team, PlayerProfile, ImportedPokemonInfo } from '../types/pokemon';
import { TEAM_SHEET_LAYOUT, type TeamSheetFieldPos, type TeamSheetPageLayout, type TeamSheetPokemonSlot, type TeamSheetStaffPokemonSlot } from '../config/teamSheetLayout';
import { formatSpeciesWithGenderSuffix } from '../config/pokemonRules';
import { MAX_IVS, spsToEvs } from '../utils/championsStats';

const GEN_NUM = 9;

function splitDateOfBirth(iso: string): { month: string; day: string; year: string } {
  const [year, month, day] = iso.split('-');
  return { month: month ?? '', day: day ?? '', year: year ?? '' };
}

/**
 * Real computed stats (base + Nature + Stat Points, level 50, max IVs) for
 * the PDF's per-Pokémon numeric side-table (page 0 only) - real VGC team
 * sheets are filled with these, not left blank for staff. Same @smogon/calc
 * math useDamageCalc.ts uses for the Calc page's own stat rows, via the same
 * SP->EV conversion (utils/championsStats.ts) - `rawStats` is base+nature+
 * EVs with no in-battle stage boost, matching what a team sheet (not a live
 * battle state) should show. `species` is passed through unmodified (not
 * the gender-suffixed display form below) since @smogon/calc resolves
 * gender-divergent formes via its own `gender` option, same as
 * utils/calcTeamImport.ts's already-working Calc-page pattern. Returns null
 * (drawn as blank) if @smogon/calc doesn't recognize the species/nature.
 */
function computeRealStats(pokemon: ImportedPokemonInfo): StatsTable | null {
  const { showdownData } = pokemon;
  try {
    const gen = Generations.get(GEN_NUM);
    const sps: StatsTable = {
      hp: showdownData.evs.hp, atk: showdownData.evs.attack, def: showdownData.evs.defense,
      spa: showdownData.evs.specialAttack, spd: showdownData.evs.specialDefense, spe: showdownData.evs.speed,
    };
    const calcPokemon = new Pokemon(gen, showdownData.species, {
      level: showdownData.level || 50,
      gender: showdownData.gender === 'M' || showdownData.gender === 'F' || showdownData.gender === 'N' ? showdownData.gender : undefined,
      nature: (showdownData.nature || 'Hardy') as NatureName,
      evs: spsToEvs(sps),
      ivs: MAX_IVS,
    });
    return calcPokemon.rawStats;
  } catch {
    return null;
  }
}

export async function generateTeamSheetPdf(team: Team, playerProfile: PlayerProfile): Promise<Uint8Array> {
  const templateUrl = `${import.meta.env.BASE_URL}vg-team-list-template.pdf`;
  const templateBytes = await fetch(templateUrl).then(res => res.arrayBuffer());

  const doc = await PDFDocument.load(templateBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const [page0, page1] = doc.getPages();

  const draw = (page: typeof page0, text: string, pos: TeamSheetFieldPos) => {
    if (!text) return;
    page.drawText(text, { x: pos.x, y: pos.y, size: pos.size, font });
  };

  /** Stat numbers only - `pos.x` there is a column-wide CENTER anchor (see
   * generateTeamSheetLayout.ts), not a left edge like every other field, so
   * the actual draw x has to shift left by half this specific string's own
   * rendered width to land centered. */
  const drawCentered = (page: typeof page0, text: string, pos: TeamSheetFieldPos) => {
    if (!text) return;
    const width = font.widthOfTextAtSize(text, pos.size);
    page.drawText(text, { x: pos.x - width / 2, y: pos.y, size: pos.size, font });
  };

  const battleTeamNumberName = [team.battleTeamNumber, team.battleTeamName].filter(Boolean).join(' - ');

  const drawSharedHeader = (page: typeof page0, layout: TeamSheetPageLayout) => {
    draw(page, playerProfile.playerName, layout.playerName);
    draw(page, playerProfile.trainerNameInGame, layout.trainerNameInGame);
    draw(page, battleTeamNumberName, layout.battleTeamNumberName);
    draw(page, playerProfile.switchProfileName, layout.switchProfileName);
    const ageDivisionPos = playerProfile.ageDivision === 'Juniors' ? layout.ageDivision.juniors
      : playerProfile.ageDivision === 'Seniors' ? layout.ageDivision.seniors
      : playerProfile.ageDivision === 'Masters' ? layout.ageDivision.masters
      : null;
    if (ageDivisionPos) draw(page, 'X', ageDivisionPos);
  };

  const drawPokemonSlots = (page: typeof page0, slots: TeamSheetPokemonSlot[]) => {
    team.pokemon.slice(0, 6).forEach((pokemon, i) => {
      const slot = slots[i];
      const { showdownData } = pokemon;
      draw(page, formatSpeciesWithGenderSuffix(showdownData.species, showdownData.gender), slot.species);
      draw(page, showdownData.nature ?? '', slot.statAlignment);
      draw(page, showdownData.ability ?? '', slot.ability);
      draw(page, showdownData.item ?? '', slot.heldItem);
      draw(page, showdownData.moves[0] ?? '', slot.move1);
      draw(page, showdownData.moves[1] ?? '', slot.move2);
      draw(page, showdownData.moves[2] ?? '', slot.move3);
      draw(page, showdownData.moves[3] ?? '', slot.move4);
    });
  };

  const drawStatsTables = (page: typeof page0, slots: TeamSheetStaffPokemonSlot[]) => {
    team.pokemon.slice(0, 6).forEach((pokemon, i) => {
      const stats = computeRealStats(pokemon);
      if (!stats) return;
      const pos = slots[i].stats;
      drawCentered(page, String(stats.hp), pos.hp);
      drawCentered(page, String(stats.atk), pos.atk);
      drawCentered(page, String(stats.def), pos.def);
      drawCentered(page, String(stats.spa), pos.spa);
      drawCentered(page, String(stats.spd), pos.spd);
      drawCentered(page, String(stats.spe), pos.spe);
    });
  };

  // Page 0: "1 of 2 - For Tournament Staff" - shared header + staff-only fields
  drawSharedHeader(page0, TEAM_SHEET_LAYOUT.page0);
  draw(page0, playerProfile.playerId, TEAM_SHEET_LAYOUT.page0.playerId);
  draw(page0, playerProfile.supportId, TEAM_SHEET_LAYOUT.page0.supportId);
  if (playerProfile.dateOfBirth) {
    const dob = splitDateOfBirth(playerProfile.dateOfBirth);
    draw(page0, dob.month, TEAM_SHEET_LAYOUT.page0.dateOfBirth.month);
    draw(page0, dob.day, TEAM_SHEET_LAYOUT.page0.dateOfBirth.day);
    draw(page0, dob.year, TEAM_SHEET_LAYOUT.page0.dateOfBirth.year);
  }
  drawPokemonSlots(page0, TEAM_SHEET_LAYOUT.page0.pokemonSlots);
  drawStatsTables(page0, TEAM_SHEET_LAYOUT.page0.pokemonSlots);

  // Page 1: "2 of 2 - For Opponents" - shared header only, no player-identity fields
  drawSharedHeader(page1, TEAM_SHEET_LAYOUT.page1);
  drawPokemonSlots(page1, TEAM_SHEET_LAYOUT.page1.pokemonSlots);

  return doc.save();
}
