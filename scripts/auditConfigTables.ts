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
 * Leg 1 scoped this to the 4 "Curated effect tables" CLAUDE.md names by rule
 * (moveStatEffects/onSwitchInAbilities/reactiveAbilities/hitReactiveAbilities)
 * plus the 3 Champions-override files TODO.md's own item body named
 * (championsMoveOverrides/championsAbilityOverrides/championsMovepoolChanges)
 * - 7 files total, a smaller first slice per this project's leg-sizing
 * convention. Leg 2 (TODO.md's own follow-up note) extends coverage to this
 * repo's remaining move/ability-keyed tables - moveBlockingAbilities.ts,
 * megaAbilities.ts, moveFieldEffects.ts, moveWeatherEffects.ts,
 * moveTargeting.ts, typeChangingAbilities.ts, protectMoves.ts,
 * switchOutMoves.ts, moveFlags.ts - 16 files total. Several of these don't
 * fit the flat Record<string,X>/string[] shape Leg 1's helpers assumed, so
 * this pass adds a few narrowly-scoped helpers rather than one fully generic
 * walker (matching this script's existing per-file-block style):
 *   - objectValueEntries: Record<string,string> -> [key,value][], for a
 *     table keyed by something out of scope but whose *values* are ability
 *     names worth checking (megaAbilities.ts's Mega-slug keys).
 *   - newSetStringArray: parses a `new Set([...])` literal
 *     (typeChangingAbilities.ts's VARIABLE_TYPE_MOVES) - not every move list
 *     in this codebase is a plain array literal.
 *   - moveBlockingAbilities.ts's MOVE_BLOCKING_ABILITIES gets its own bespoke
 *     block: its BlockRule union nests a `moves` array one level down inside
 *     some (not all) values, and one of those (`soundproof`) points at the
 *     SOUND_BASED_MOVES identifier instead of repeating the array inline -
 *     resolved against the same SOUND_BASED_MOVES list this file's own
 *     top-level export is parsed into, rather than re-parsing it twice.
 *
 * Left out of Leg 2, still out of scope: any key/value that isn't itself a
 * move or ability name - megaAbilities.ts's Mega-slug keys (species are out
 * of scope per the standing rule below), moveTargeting.ts's
 * TARGET_CATEGORY_MAP (keyed by PokeAPI's raw `target` slug, not a move -
 * only its MOVE_TARGET_OVERRIDES sub-table is move-keyed), and
 * moveFlags.ts's MOVE_FLAG_LABELS/VISIBLE_MOVE_FLAGS (a fixed internal enum,
 * not game data to verify).
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

/** Record<string, X> -> [key, valueExpr][], keeping every property assignment regardless of what
 *  shape the value itself is - callers narrow the value expression further. */
function objectEntries(expr: ts.Expression): [string, ts.Expression][] {
  if (!ts.isObjectLiteralExpression(expr)) throw new Error('expected an object literal');
  const entries: [string, ts.Expression][] = [];
  for (const prop of expr.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = propKey(prop);
    if (key !== undefined) entries.push([key, prop.initializer]);
  }
  return entries;
}

/** Record<string, string> -> [key, value][], skipping any property whose value isn't itself a
 *  string literal (e.g. megaAbilities.ts's MEGA_ABILITIES, whose keys are out of scope but whose
 *  string values are ability names worth checking). */
function objectValueEntries(expr: ts.Expression): [string, string][] {
  return objectEntries(expr)
    .filter((entry): entry is [string, ts.StringLiteral] => ts.isStringLiteral(entry[1]))
    .map(([key, value]) => [key, value.text]);
}

/** `new Set([...])` of string literals - not every move list in this codebase is a plain array
 *  literal (e.g. typeChangingAbilities.ts's VARIABLE_TYPE_MOVES). */
function newSetStringArray(expr: ts.Expression): string[] {
  if (!ts.isNewExpression(expr) || !ts.isIdentifier(expr.expression) || expr.expression.text !== 'Set') {
    throw new Error('expected a `new Set([...])` expression');
  }
  const arg = expr.arguments?.[0];
  if (!arg || !ts.isArrayLiteralExpression(arg)) throw new Error('expected Set(...) to be called with an array literal');
  return stringArrayLiteral(arg);
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

// --- moveBlockingAbilities.ts ---
let soundBasedMoves: string[] = [];
{
  const file = 'moveBlockingAbilities.ts';
  const source = parseFile(file);
  soundBasedMoves = stringArrayLiteral(findConst(source, 'SOUND_BASED_MOVES'));
  checkKeysAgainst(file, 'SOUND_BASED_MOVES', soundBasedMoves, KNOWN_MOVES, 'move');

  const abilityEntries = objectEntries(findConst(source, 'MOVE_BLOCKING_ABILITIES'));
  checkKeysAgainst(file, 'MOVE_BLOCKING_ABILITIES', abilityEntries.map(([key]) => key), KNOWN_ABILITIES, 'ability');
  // BlockRule's 'move-list' variant nests its move array one level down as a `moves` property -
  // either an inline array literal, or (soundproof only) a reference to SOUND_BASED_MOVES above.
  for (const [ability, ruleExpr] of abilityEntries) {
    if (!ts.isObjectLiteralExpression(ruleExpr)) continue;
    const movesProp = ruleExpr.properties.find((p) => propKey(p) === 'moves');
    if (!movesProp || !ts.isPropertyAssignment(movesProp)) continue;
    let moves: string[] | undefined;
    if (ts.isArrayLiteralExpression(movesProp.initializer)) moves = stringArrayLiteral(movesProp.initializer);
    else if (ts.isIdentifier(movesProp.initializer) && movesProp.initializer.text === 'SOUND_BASED_MOVES') moves = soundBasedMoves;
    if (!moves) continue;
    for (const move of moves) {
      if (!KNOWN_MOVES.has(normalize(move))) refHits.push({ file, table: 'MOVE_BLOCKING_ABILITIES', slug: move, kind: 'move', context: ability });
    }
  }
}

// --- megaAbilities.ts --- (keys are Mega-slugs, out of scope; values are ability names)
{
  const file = 'megaAbilities.ts';
  const source = parseFile(file);
  const entries = objectValueEntries(findConst(source, 'MEGA_ABILITIES'));
  for (const [megaSlug, ability] of entries) {
    if (!KNOWN_ABILITIES.has(normalize(ability))) refHits.push({ file, table: 'MEGA_ABILITIES', slug: ability, kind: 'ability', context: megaSlug });
  }
}

// --- moveFieldEffects.ts ---
{
  const file = 'moveFieldEffects.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'MOVE_FIELD_EFFECTS', objectKeys(findConst(source, 'MOVE_FIELD_EFFECTS')), KNOWN_MOVES, 'move');
}

// --- moveWeatherEffects.ts ---
{
  const file = 'moveWeatherEffects.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'MOVE_WEATHER_EFFECTS', objectKeys(findConst(source, 'MOVE_WEATHER_EFFECTS')), KNOWN_MOVES, 'move');
}

// --- moveTargeting.ts --- (TARGET_CATEGORY_MAP is keyed by PokeAPI's raw `target` slug, not a
// move - only MOVE_TARGET_OVERRIDES is move-keyed)
{
  const file = 'moveTargeting.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'MOVE_TARGET_OVERRIDES', objectKeys(findConst(source, 'MOVE_TARGET_OVERRIDES')), KNOWN_MOVES, 'move');
}

// --- typeChangingAbilities.ts ---
{
  const file = 'typeChangingAbilities.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'TYPE_CHANGING_ABILITIES', objectKeys(findConst(source, 'TYPE_CHANGING_ABILITIES')), KNOWN_ABILITIES, 'ability');
  checkKeysAgainst(file, 'VARIABLE_TYPE_MOVES', newSetStringArray(findConst(source, 'VARIABLE_TYPE_MOVES')), KNOWN_MOVES, 'move');
}

// --- protectMoves.ts ---
{
  const file = 'protectMoves.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'PROTECT_FAMILY_MOVES', stringArrayLiteral(findConst(source, 'PROTECT_FAMILY_MOVES')), KNOWN_MOVES, 'move');
}

// --- switchOutMoves.ts ---
{
  const file = 'switchOutMoves.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'SWITCH_OUT_MOVES', stringArrayLiteral(findConst(source, 'SWITCH_OUT_MOVES')), KNOWN_MOVES, 'move');
}

// --- moveFlags.ts --- (CHAMPIONS_ADDED_FLAGS is keyed by move; its values are MoveFlagKey
// literals, an internal enum, not game data to verify)
{
  const file = 'moveFlags.ts';
  const source = parseFile(file);
  checkKeysAgainst(file, 'CHAMPIONS_ADDED_FLAGS', objectKeys(findConst(source, 'CHAMPIONS_ADDED_FLAGS')), KNOWN_MOVES, 'move');
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
