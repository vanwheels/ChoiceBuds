/**
 * calcFormes.ts - "Same Pokémon, Alternate Stat Block" Forme Detection
 * For the Calc tab's in-panel forme toggle. Deliberately excludes regional
 * forms (Alola/Galar/Hisui/Paldea) and gendered forms (-F) - those are
 * already independently searchable/selectable species (like Rotom-Wash vs
 * Rotom-Heat), not a togglable "same slot" choice. Stat-block-only formes
 * (e.g. Aegislash Blade/Shield) and Mega Evolution are toggles because the
 * user picks one Pokémon and flips between its alternate battle states.
 *
 * General detector (walks @smogon/calc's own baseSpecies links) rather than
 * a hardcoded species list, so it keeps working if future regulations add
 * more stat-forme species - verified against the current Reg M-A/M-B legal
 * dex to have exactly one real stat-forme case (Aegislash) and ~70 Mega-
 * capable species.
 */

const REGIONAL_SUFFIXES = ['-alola', '-galar', '-hisui', '-paldea'];
const GENDER_SUFFIX = '-f';
const MEGA_SUFFIX_RE = /-mega(-x|-y)?$/i;
const GMAX_SUFFIX_RE = /-gmax$/i;
/** "Aegislash-Both" etc. - a synthetic combined-stats entry the engine uses
 * internally for stance-change auto-detection, not a real forme a player
 * picks - exclude it from the user-facing toggle. */
const SYNTHETIC_SUFFIX_RE = /-both$/i;

type Kind = 'region' | 'gender' | 'mega' | 'gmax' | 'synthetic' | 'other';

function classify(name: string): Kind {
  const lower = name.toLowerCase();
  if (REGIONAL_SUFFIXES.some(suf => lower.endsWith(suf))) return 'region';
  if (lower.endsWith(GENDER_SUFFIX)) return 'gender';
  if (MEGA_SUFFIX_RE.test(lower)) return 'mega';
  if (GMAX_SUFFIX_RE.test(lower)) return 'gmax';
  if (SYNTHETIC_SUFFIX_RE.test(lower)) return 'synthetic';
  return 'other';
}

export interface CalcSpeciesRef {
  name: string;
  baseSpecies?: string;
}

function findRoot(name: string, byName: Map<string, CalcSpeciesRef>): string {
  let current = name;
  const seen = new Set<string>();
  while (true) {
    const specie = byName.get(current);
    if (!specie?.baseSpecies || seen.has(current)) return current;
    seen.add(current);
    current = specie.baseSpecies;
  }
}

export interface FormeFamily {
  /** The plain, non-region/gender/mega/gmax species this family reverts to */
  root: string;
  /** All "other" (stat-block-only) siblings, including root - length 1 means no toggle needed */
  statFormes: string[];
  /** Mega Evolution siblings, if any (not necessarily Reg-legal, toggle is opt-in) */
  megaFormes: string[];
}

export function getFormeFamily(allSpecies: CalcSpeciesRef[], speciesName: string): FormeFamily {
  if (!speciesName) return { root: '', statFormes: [], megaFormes: [] };

  const byName = new Map(allSpecies.map(s => [s.name, s]));
  const root = findRoot(speciesName, byName);
  const family = allSpecies.filter(s => s.name === root || findRoot(s.name, byName) === root);

  return {
    root,
    statFormes: family.filter(s => classify(s.name) === 'other').map(s => s.name),
    megaFormes: family.filter(s => classify(s.name) === 'mega').map(s => s.name),
  };
}

/** Common leading "-"-separated segments shared by every name in the group */
function commonPrefixLength(names: string[]): number {
  if (names.length === 0) return 0;
  const partsList = names.map(n => n.split('-'));
  const minLen = Math.min(...partsList.map(p => p.length));
  let i = 0;
  while (i < minLen && partsList.every(p => p[i] === partsList[0][i])) i++;
  return i;
}

/** "Charizard"/"Charizard-Mega-X"/"Charizard-Mega-Y" -> "Base"/"Mega X"/"Mega Y" */
export function formeDisplayLabel(group: string[], name: string): string {
  const prefixLen = commonPrefixLength(group);
  const remainder = name.split('-').slice(prefixLen).join(' ');
  return remainder || 'Base';
}
