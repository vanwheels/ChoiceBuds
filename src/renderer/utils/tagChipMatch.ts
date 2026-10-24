/**
 * Pure matching/dedupe logic for TagChipInput (see components/TagChipInput.tsx).
 * Kept free of React so it's directly unit-testable - see tagChipMatch.test.ts.
 *
 * Matching is space/hyphen-insensitive: 'fireblast', 'fire blast', and
 * 'fire-blast' all normalize to the same comparison key, regardless of
 * which separator style a candidate list's slug or a user's typed query
 * happens to use.
 */

import type { TagChip, TagChipCategory, TagChipOption } from '../types/tagChip';

/** Candidate option lists an autocomplete query is matched against, one per category. */
export interface TagChipCandidates {
  types: string[];
  moves: string[];
  abilities: string[];
}

/** Lowercases and strips spaces/hyphens, so e.g. 'Fire Blast' and 'fire-blast' compare equal. */
export function normalizeChipText(text: string): string {
  return text.toLowerCase().replace(/[\s-]+/g, '');
}

function prettifyLabel(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function chipsEqual(a: TagChip, b: TagChip): boolean {
  return a.category === b.category && normalizeChipText(a.value) === normalizeChipText(b.value);
}

/** Appends `chip`, or returns `chips` unchanged if an equal chip (per chipsEqual) is already present. */
export function addChip(chips: TagChip[], chip: TagChip): TagChip[] {
  if (chips.some((existing) => chipsEqual(existing, chip))) return chips;
  return [...chips, chip];
}

export function removeChip(chips: TagChip[], chip: TagChip): TagChip[] {
  return chips.filter((existing) => !chipsEqual(existing, chip));
}

/**
 * Builds the autocomplete option list for a typed query across all three
 * categories. A name that's both a type and a move (e.g. 'psychic')
 * naturally surfaces as two distinct options here, one per category, since
 * each candidate list is matched independently - the caller/UI labels each
 * option by its own `category` rather than needing to guess.
 */
export function buildChipOptions(query: string, candidates: TagChipCandidates): TagChipOption[] {
  const normalizedQuery = normalizeChipText(query);
  if (normalizedQuery.length === 0) return [];

  const matchesQuery = (slug: string): boolean => normalizeChipText(slug).includes(normalizedQuery);

  const toOptions = (category: TagChipCategory, slugs: string[]): TagChipOption[] =>
    slugs.filter(matchesQuery).map((value) => ({ category, value, label: prettifyLabel(value) }));

  return [
    ...toOptions('type', candidates.types),
    ...toOptions('move', candidates.moves),
    ...toOptions('ability', candidates.abilities),
  ];
}

/** Drops any option that's an equal chip (per chipsEqual) to one already selected. */
export function excludeSelectedOptions(
  options: TagChipOption[],
  chips: TagChip[],
): TagChipOption[] {
  return options.filter((option) => !chips.some((chip) => chipsEqual(chip, option)));
}
