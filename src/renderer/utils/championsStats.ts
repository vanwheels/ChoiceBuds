/**
 * Champions replaces traditional 0-252 EVs with 0-32 "Stat Points" (SPs) per
 * stat, 66 total across all six - confirmed twice over: against the real
 * calc.pokemonshowdown.com Champions tab, and directly in-game (max 32/stat,
 * max 66 total). @smogon/calc has no native SP concept, so this converts at
 * the boundary: the standard stat formula already computes floor(ev/4), so
 * SP is treated as directly supplying that pre-divided term (ev = sp*4).
 * Shared by useDamageCalc.ts (Calc page) and services/teamSheetPdf.ts (VGC
 * Team Sheet PDF's real-stat side-table) - both need @smogon/calc's own
 * stat math from the same SP scale, IVs always maxed (Champions has no IV
 * input anywhere in this app, matching the real game's Hyper-Training-by-
 * default convention).
 */
import type { StatsTable } from '@smogon/calc/dist/data/interface';

export const MAX_IVS: StatsTable = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

export function spToEv(sp: number): number {
  return sp * 4;
}

export function spsToEvs(sps: StatsTable): StatsTable {
  return {
    hp: spToEv(sps.hp), atk: spToEv(sps.atk), def: spToEv(sps.def),
    spa: spToEv(sps.spa), spd: spToEv(sps.spd), spe: spToEv(sps.spe),
  };
}

/**
 * @smogon/calc has no bare "Aegislash" species entry - only its Blade/Shield
 * stat-formes (confirmed directly against the bundled Gen 9 dex: Aegislash-
 * Blade is the entry with no baseSpecies pointer, i.e. @smogon/calc's own
 * "base" record, with -Shield pointing back to it as an alternate forme -
 * there's no unnamed/neutral third entry). This app's own storage
 * convention is always bare "Aegislash" (Showdown/Pokepaste exports never
 * say Blade/Shield - Shield is simply its default/roster appearance, Blade
 * a temporary in-battle Stance Change state) - see services/pokeapi.ts's
 * normalizeSpeciesForAPI, which resolves the identical quirk for PokeAPI
 * lookups. Any @smogon/calc species lookup needs this resolved first, or it
 * either fails outright or silently resolves to Blade's very different stat
 * spread (140 Atk/SpA, 50 Def/SpD, vs. Shield's 50/140).
 */
export function resolveCalcSpecies(species: string): string {
  return species.toLowerCase() === 'aegislash' ? 'Aegislash-Shield' : species;
}
