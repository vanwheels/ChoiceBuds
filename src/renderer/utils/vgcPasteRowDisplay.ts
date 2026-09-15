/**
 * Pure display-formatting helpers for VgcPasteCatalogRow.tsx (VGCPastes
 * Sample Team Catalog: Row Display Rework Leg 2, see TODO.md) - split out of
 * the component so this logic is unit-testable on its own, same rationale as
 * services/parser.ts's pure functions.
 */

import type { EVSpread, SpeciesRosterEntry } from '../types/pokemon';

const EV_LABELS: Array<[keyof EVSpread, string]> = [
  ['hp', 'HP'],
  ['attack', 'Atk'],
  ['defense', 'Def'],
  ['specialAttack', 'SpA'],
  ['specialDefense', 'SpD'],
  ['speed', 'Spe'],
];

/** Formats an EV spread as "252 HP / 4 Def / 252 Spe", or "No EVs" if all zero. */
export function formatEvs(evs: EVSpread): string {
  const parts = EV_LABELS.filter(([key]) => evs[key] > 0).map(([key, label]) => `${evs[key]} ${label}`);
  return parts.length > 0 ? parts.join(' / ') : 'No EVs';
}

function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Matches a VGCPastes sheet species-name string against the full roster by
 * normalized name (lowercased, non-alphanumeric stripped) - the sheet's text
 * doesn't always match this app's own display-name spelling exactly (e.g.
 * spacing/hyphen differences on multi-word forms). Returns undefined on no
 * match rather than throwing; callers render an empty slot in that case.
 */
export function findRosterEntry(speciesName: string, roster: SpeciesRosterEntry[]): SpeciesRosterEntry | undefined {
  const target = normalizeForMatch(speciesName);
  return roster.find(entry => normalizeForMatch(entry.name) === target);
}
