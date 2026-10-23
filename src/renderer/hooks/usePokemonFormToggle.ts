/**
 * usePokemonFormToggle Hook - Shared "Currently Displayed Form" Toggle State
 * Mega & Alt-Form Toggle State, Leg 1 (see TODO.md) - the foundation Legs
 * 2-4 of that milestone, plus the separate Type Matchup Rework milestone,
 * consume.
 *
 * Tracks which alternate form - a Mega Evolution or a stat-only forme like
 * Aegislash Blade/Shield - is currently "active" for display purposes on a
 * given roster slot (team card, team builder, battle logger), keyed by that
 * slot's own stable `ImportedPokemonInfo.id`/`BroughtPokemonSnapshot.id`
 * rather than by species, so two roster slots of the same species toggle
 * independently.
 *
 * Deliberately NOT persisted to Team/SavedPokemonEntry/Battle data and NOT
 * synced - Mega Evolution and Aegislash's Blade/Shield only happen in-battle,
 * they're never a held/set-in-stone part of a saved set (see
 * config/megaEvolution.ts's normalizeMegaSpeciesOnImport doc comment for the
 * same point made about import data). This is purely a display-time
 * override, reset every session the same way useMegaSprite's module-level
 * sprite cache is - a fresh app launch always starts every Pokémon back at
 * its stored base form.
 *
 * "Shared" means every mounted consumer reading the same pokemonId sees the
 * same value and re-renders when it changes, even across independently
 * mounted components (team card vs. battle logger) - a plain per-component
 * useState wouldn't give that, so state lives in this module-level store
 * instead and components subscribe to it via useSyncExternalStore.
 */

import { useCallback, useSyncExternalStore } from 'react';

const state = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();

function notify(pokemonId: string): void {
  listeners.get(pokemonId)?.forEach((callback) => callback());
}

function subscribe(pokemonId: string, callback: () => void): () => void {
  let set = listeners.get(pokemonId);
  if (!set) {
    set = new Set();
    listeners.set(pokemonId, set);
  }
  set.add(callback);
  return () => {
    set!.delete(callback);
    if (set!.size === 0) listeners.delete(pokemonId);
  };
}

function getSnapshot(pokemonId: string): string | null {
  return state.get(pokemonId) ?? null;
}

/**
 * Explicit setter - usable directly (without the hook) by any mutation path
 * that needs to clear/force a slot's toggle outside of React, e.g. a future
 * cleanup when a roster slot's held item or species changes out from under
 * an active override.
 */
export function setPokemonActiveForm(pokemonId: string, form: string | null): void {
  if (state.get(pokemonId) === form) return;
  if (form === null) {
    state.delete(pokemonId);
  } else {
    state.set(pokemonId, form);
  }
  notify(pokemonId);
}

export interface PokemonFormToggle {
  /** The form slug currently displayed in place of this slot's stored base
   * form (e.g. "charizard-mega-x", "aegislash-blade"), or null for the
   * stored base form (e.g. a non-Mega-evolved Pokémon, or Aegislash's
   * default Shield). */
  activeForm: string | null;
  /** Sets the active form directly - null reverts to the stored base form. */
  setActiveForm: (form: string | null) => void;
  /** Flips between `form` and the base form: activates `form` unless it's
   * already active, in which case it reverts to null. Matches a single
   * click/tap toggle (a mega-stone icon, a two-way Blade/Shield switch). */
  toggleActiveForm: (form: string) => void;
}

/** `pokemonId` is this roster slot's own stable id - see this file's header
 * comment for why it's keyed this way rather than by species. */
export function usePokemonFormToggle(pokemonId: string): PokemonFormToggle {
  const activeForm = useSyncExternalStore(
    useCallback((callback) => subscribe(pokemonId, callback), [pokemonId]),
    () => getSnapshot(pokemonId),
  );

  const setActiveForm = useCallback(
    (form: string | null) => setPokemonActiveForm(pokemonId, form),
    [pokemonId],
  );

  const toggleActiveForm = useCallback(
    (form: string) => setPokemonActiveForm(pokemonId, activeForm === form ? null : form),
    [pokemonId, activeForm],
  );

  return { activeForm, setActiveForm, toggleActiveForm };
}
