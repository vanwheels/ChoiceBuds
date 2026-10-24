/**
 * Tag-chip data model (Search & Filter: Tag-Chip Redesign, Leg 1)
 * Replaces the old free-text '#tag' search syntax (see utils/tagSearch.ts)
 * with an explicit, disambiguated chip: a chip always carries its own
 * category rather than relying on a type -> move -> ability text-probing
 * fallback chain to guess it.
 */

export type TagChipCategory = 'type' | 'move' | 'ability';

export interface TagChip {
  category: TagChipCategory;
  /** Canonical hyphenated slug, e.g. 'fire', 'fire-blast', 'flash-fire' - same shape normalizeNameForAPI produces, so a chip's value can be handed straight to usePokemonTypeFilter/usePokemonMoveFilter/usePokemonAbilityFilter. */
  value: string;
}

/** A chip not yet selected, surfaced as an autocomplete suggestion. */
export interface TagChipOption extends TagChip {
  /** Prettified display label, e.g. 'Fire Blast'. */
  label: string;
}
