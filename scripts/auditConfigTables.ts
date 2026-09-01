/**
 * Config-Table Referential-Integrity Audit
 * TODO.md's "Config-Table Audit Script" item, in the mold of GW2 Squaded's
 * scripts/audit-data-completeness.ts: a purely local (no network), one-shot
 * structural scan of this repo's own hand-curated config tables, console-
 * report only, run manually - not wired into build/CI.
 *
 * SCOPE: GW2's script could cross-reference against the GW2 API's own
 * structured secondary-effect data (numeric facts with types/labels) to spot
 * *missing* coverage shapes. @smogon/calc - the only offline movedex this
 * repo bundles (see scripts/generateMoveFlags.ts) - exposes only
 * id/name/flags/category/type/basePower per move at runtime, with no
 * boosts/secondary-effect data at all, so that "what's missing" style check
 * isn't buildable here without a network fetch this script deliberately
 * avoids. What IS checkable locally: referential integrity - does every
 * move/ability slug hand-typed into these tables actually name a real Gen 9
 * move/ability? A stale entry (upstream rename, typo, copy-paste slip) would
 * silently no-op forever, since every lookup in these tables is a plain `??
 * null` fallback with nothing that would ever throw or log on a miss.
 *
 * Scoped to the 4 "Curated effect tables" CLAUDE.md names by rule
 * (moveStatEffects/onSwitchInAbilities/reactiveAbilities/hitReactiveAbilities)
 * plus the 3 Champions-override files TODO.md's own item body names
 * (championsMoveOverrides/championsAbilityOverrides/championsMovepoolChanges)
 * - 7 files total. Deliberately NOT yet covering this repo's other
 * move/ability-keyed tables (moveBlockingAbilities.ts, megaAbilities.ts,
 * moveFieldEffects.ts, moveWeatherEffects.ts, moveTargeting.ts,
 * typeChangingAbilities.ts, protectMoves.ts, switchOutMoves.ts, moveFlags.ts)
 * - a smaller first slice per this project's leg-sizing convention; see
 * TODO.md for the follow-up note.
 *
 * Two gap shapes:
 *   1. Referential integrity - a table key (or, for the Champions movepool
 *      add/remove lists, a move slug inside a value array) that doesn't
 *      normalize to any real Gen 9 move/ability name.
 *   2. Movepool self-contradiction - a species listed in BOTH
 *      CHAMPIONS_MOVEPOOL_ADDITIONS and CHAMPIONS_MOVEPOOL_REMOVALS with the
 *      SAME move in both lists (adds and removes the same move at once) -
 *      needs no external data, purely an internal consistency check.
 *
 * Will NOT catch: a move/ability that's real but doesn't belong in a given
 * table (needs game knowledge, not structure - same limitation the GW2 mold
 * documents for its own "entirely absent" class), a table's coverage being
 * incomplete (the "what's missing" shape @smogon/calc can't support - see
 * above), or a species-keyed/item-keyed table's own key validity (species and
 * items are out of scope for this pass).
 *
 * Run via: npx tsx scripts/auditConfigTables.ts
 */
import { Generations } from '@smogon/calc';
import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '../src/renderer/config');

/** Same normalization convention as services/pokeapiService.ts's normalizeNameForAPI - copied
 *  rather than imported, matching scripts/generateMoveFlags.ts's existing precedent of not
 *  importing renderer code into a standalone Node script. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-');
}

const gen = Generations.get(9);
const KNOWN_MOVES = new Set(Array.from(gen.moves as unknown as Iterable<{ name: string }>).map((m) => normalize(m.name)));
const KNOWN_ABILITIES = new Set(Array.from(gen.abilities as unknown as Iterable<{ name: string }>).map((a) => normalize(a.name)));

function parseFile(fileName: string): ts.SourceFile {
  const text = readFileSync(join(CONFIG_DIR, fileName), 'utf-8');
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
}

/** Finds a top-level `const NAME = <initializer>` anywhere in the file (module-private consts
 *  included - most of these tables aren't exported, so a real `import` from this script isn't an
 *  option without changing 7 files just for tooling). */
function findConst(source: ts.SourceFile, name: string): ts.Expression {
  let found: ts.Expression | undefined;
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) {
      found = node.initializer;
    }
    node.forEachChild(visit);
  };
  source.forEachChild(visit);
  if (!found) throw new Error(`const ${name} not found in ${source.fileName}`);
  return found;
}

function propKey(prop: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(prop) && !ts.isShorthandPropertyAssignment(prop)) return undefined;
  if (ts.isStringLiteral(prop.name)) return prop.name.text;
  if (ts.isIdentifier(prop.name)) return prop.name.text;
  return undefined;
}

function objectKeys(expr: ts.Expression): string[] {
  if (!ts.isObjectLiteralExpression(expr)) throw new Error('expected an object literal');
  return expr.properties.map(propKey).filter((k): k is string => k !== undefined);
}

function stringArrayLiteral(expr: ts.Expression): string[] {
  if (!ts.isArrayLiteralExpression(expr)) throw new Error('expected an array literal');
  return expr.elements.filter(ts.isStringLiteral).map((e) => e.text);
}

/** Record<string, string[]> -> [key, values][], keeping only entries whose value is itself an
 *  array literal of string literals (skips anything shaped differently). */
function objectEntriesOfStringArrays(expr: ts.Expression): [string, string[]][] {
  if (!ts.isObjectLiteralExpression(expr)) throw new Error('expected an object literal');
  const entries: [string, string[]][] = [];
  for (const prop of expr.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = propKey(prop);
    if (key === undefined || !ts.isArrayLiteralExpression(prop.initializer)) continue;
    entries.push([key, stringArrayLiteral(prop.initializer)]);
  }
  return entries;
}

interface RefIntegrityHit {
  file: string;
  table: string;
  slug: string;
  kind: 'move' | 'ability';
  context?: string;
}

const refHits: RefIntegrityHit[] = [];

function checkKeysAgainst(file: string, table: string, keys: string[], known: Set<string>, kind: 'move' | 'ability'): void {
  for (const key of keys) {
    if (!known.has(normalize(key))) refHits.push({ file, table, slug: key, kind });
  }
}

function checkMoveListAgainst(file: string, table: string, entries: [string, string[]][]): void {
  for (const [species, moves] of entries) {
    for (const move of moves) {
      if (!KNOWN_MOVES.has(normalize(move))) refHits.push({ file, table, slug: move, kind: 'move', context: species });
    }
  }
}

// --- moveStatEffects.ts ---
{
  const file = 'moveStatEffects.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'MOVE_STAT_EFFECTS', objectKeys(findConst(source, 'MOVE_STAT_EFFECTS')), KNOWN_MOVES, 'move');
}

// --- onSwitchInAbilities.ts ---
{
  const file = 'onSwitchInAbilities.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'SWITCH_IN_ABILITY_EFFECTS', objectKeys(findConst(source, 'SWITCH_IN_ABILITY_EFFECTS')), KNOWN_ABILITIES, 'ability');
}

// --- reactiveAbilities.ts ---
{
  const file = 'reactiveAbilities.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'REACTIVE_ON_STAT_LOWERED', objectKeys(findConst(source, 'REACTIVE_ON_STAT_LOWERED')), KNOWN_ABILITIES, 'ability');
}

// --- hitReactiveAbilities.ts ---
{
  const file = 'hitReactiveAbilities.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'HIT_REACTIVE_ABILITIES', objectKeys(findConst(source, 'HIT_REACTIVE_ABILITIES')), KNOWN_ABILITIES, 'ability');
}

// --- championsMoveOverrides.ts ---
{
  const file = 'championsMoveOverrides.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'CHAMPIONS_MOVE_OVERRIDES', objectKeys(findConst(source, 'CHAMPIONS_MOVE_OVERRIDES')), KNOWN_MOVES, 'move');
  checkKeysAgainst(file, 'CHAMPIONS_PP_EXCEPTIONS', objectKeys(findConst(source, 'CHAMPIONS_PP_EXCEPTIONS')), KNOWN_MOVES, 'move');
}

// --- championsAbilityOverrides.ts ---
{
  const file = 'championsAbilityOverrides.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'CHAMPIONS_ABILITY_OVERRIDES', objectKeys(findConst(source, 'CHAMPIONS_ABILITY_OVERRIDES')), KNOWN_ABILITIES, 'ability');
}

// --- championsMovepoolChanges.ts ---
interface MovepoolContradictionHit {
  species: string;
  move: string;
}
const movepoolContradictions: MovepoolContradictionHit[] = [];
{
  const file = 'championsMovepoolChanges.ts';
  const source = parseFile(file);
  const additionsExpr = findConst(source, 'CHAMPIONS_MOVEPOOL_ADDITIONS');
  const removalsExpr = findConst(source, 'CHAMPIONS_MOVEPOOL_REMOVALS');
  const additions = objectEntriesOfStringArrays(additionsExpr);
  const removals = objectEntriesOfStringArrays(removalsExpr);
  checkMoveListAgainst(file, 'CHAMPIONS_MOVEPOOL_ADDITIONS', additions);
  checkMoveListAgainst(file, 'CHAMPIONS_MOVEPOOL_REMOVALS', removals);
  checkKeysAgainst(file, 'GLOBALLY_REMOVED_MOVES', stringArrayLiteral(findConst(source, 'GLOBALLY_REMOVED_MOVES')), KNOWN_MOVES, 'move');

  const removalsBySpecies = new Map(removals.map(([species, moves]) => [species, new Set(moves.map(normalize))]));
  for (const [species, addedMoves] of additions) {
    const removedMoves = removalsBySpecies.get(species);
    if (!removedMoves) continue;
    for (const move of addedMoves) {
      if (removedMoves.has(normalize(move))) movepoolContradictions.push({ species, move });
    }
  }
}

// --- report ---
console.log('=== Config-table referential-integrity audit ===\n');

console.log(`Unrecognized move/ability slugs: ${refHits.length}`);
for (const hit of refHits) {
  const where = hit.context ? ` (under "${hit.context}")` : '';
  console.log(`  - ${hit.file}::${hit.table} — "${hit.slug}"${where} — no matching ${hit.kind} in the Gen 9 dex`);
}

console.log(`\nMovepool add/remove contradictions: ${movepoolContradictions.length}`);
for (const hit of movepoolContradictions) {
  console.log(`  - championsMovepoolChanges.ts — "${hit.species}" both adds and removes "${hit.move}"`);
}

console.log(`\nTotals: refIntegrity=${refHits.length}, movepoolContradictions=${movepoolContradictions.length}`);
