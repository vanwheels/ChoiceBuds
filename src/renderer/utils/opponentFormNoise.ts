/**
 * opponentFormNoise.ts - Opponent-Roster Form Picker Noise
 * PokeAPI's per-forme naming surfaces Aegislash-Blade/-Shield and
 * Maushold-Family-Of-Four/-Three as independently selectable species-roster
 * rows (see useSpeciesRoster.ts and .claude/rules/external-data-sources.md's
 * Aegislash note) - useful when building your own team, where the exact
 * forme matters, but pure noise when logging what you saw an opponent
 * bring. Each pair collapses to its canonical default form here, matching
 * services/pokeapi.ts's normalizeSpeciesForAPI bare-name defaults
 * (Aegislash -> Shield, Maushold -> Family of Four).
 */

import type { SpeciesRosterEntry } from '../types/gameData';

const OPPONENT_PICKER_NOISE_FORMS = new Set(['aegislash-blade', 'maushold-family-of-three']);

export function excludeOpponentPickerNoise(roster: SpeciesRosterEntry[]): SpeciesRosterEntry[] {
  return roster.filter((entry) => !OPPONENT_PICKER_NOISE_FORMS.has(entry.name.toLowerCase()));
}
