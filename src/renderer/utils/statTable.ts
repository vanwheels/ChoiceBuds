/**
 * statTable.ts - Pure Sort/BST Helpers for the Add Pokémon Sortable
 * Base-Stat Table (Add Pokémon: Sortable Base-Stat Table Leg 1, see TODO.md)
 *
 * Split out of AddPokemonStatTable.tsx so the actual sort/BST math is
 * unit-testable, matching the rest of the app's pure-utils testing
 * convention (CLAUDE.md) - the component itself only wires this to
 * search/legality filtering and rendering.
 */
import type { PokemonStats } from '../types/pokemon';

export type StatTableSortKey = keyof PokemonStats | 'bst';
export type StatTableSortDirection = 'asc' | 'desc';

export interface StatTableSort {
  key: StatTableSortKey;
  direction: StatTableSortDirection;
}

export function computeBST(stats: PokemonStats): number {
  return stats.hp + stats.attack + stats.defense + stats.specialAttack + stats.specialDefense + stats.speed;
}

/**
 * Column-header click state machine: clicking a new column starts it
 * descending (highest stat first - the more useful default for "which
 * species hits hardest"); clicking the already-active column flips direction
 * instead of cycling back to unsorted.
 */
export function nextStatTableSort(current: StatTableSort | null, key: StatTableSortKey): StatTableSort {
  if (!current || current.key !== key) return { key, direction: 'desc' };
  return { key, direction: current.direction === 'desc' ? 'asc' : 'desc' };
}

/**
 * Sorts rows by a resolved numeric value per row - the component resolves
 * each row's stat/BST value via `getValue` since the row shape itself is the
 * component's own, not this file's concern. Rows with no cached base stats
 * yet (getValue returns null) always sort to the bottom regardless of
 * direction, rather than being treated as 0 and cluttering the top of an
 * ascending sort.
 */
export function sortStatTableRows<T>(rows: T[], sort: StatTableSort, getValue: (row: T) => number | null): T[] {
  const withValue = rows.map(row => ({ row, value: getValue(row) }));
  withValue.sort((a, b) => {
    if (a.value === null && b.value === null) return 0;
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return sort.direction === 'asc' ? a.value - b.value : b.value - a.value;
  });
  return withValue.map(w => w.row);
}
