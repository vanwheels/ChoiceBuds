/**
 * Persisted app settings/player-profile domain types, and the cross-device
 * sync payload shape. Split out of types/pokemon.ts (see CLAUDE.md's
 * Architecture section).
 */

import type { Team } from './pokemon';
import type { Battle } from './battle';

/**
 * Player identity fields for the VGC Team Sheet PDF export
 * (services/teamSheetPdf.ts) - stable across tournaments (unlike a Team's
 * own battleTeamNumber/battleTeamName above), so entered once in Settings
 * and reused for every generated sheet. All optional/blank-by-default;
 * an empty field just draws nothing on the generated PDF rather than
 * blocking generation.
 */
export interface PlayerProfile {
  playerName: string;
  ageDivision: 'Juniors' | 'Seniors' | 'Masters' | '';
  trainerNameInGame: string;
  playerId: string;
  dateOfBirth: string; // ISO "YYYY-MM-DD" from a native <input type="date">, split into the form's own MM/DD/YYYY 3-blank layout at draw time, see teamSheetPdf.ts
  supportId: string;
  switchProfileName: string;
}

/**
 * Identifies one of the hand-authored Champions balance-patch tables tracked
 * by the "last verified against regulation X" reminder (see
 * config/championsDataChecks.ts / hooks/useChampionsDataCheck.ts).
 */
export type ChampionsDataCheckId = 'moves' | 'abilities' | 'movepool';

/**
 * Persisted user preferences, stored as settings.json in userData directory
 */
export interface AppSettings {
  version: number;
  defaultRegulation: 'Reg M-A' | 'Reg M-B';
  syncIdentifier: string | null; // "username#XXXX" pairing identifier, once set up
  lastPushedAt: number | null; // Unix timestamp of this device's last successful Push
  lastPulledAt: number | null; // Unix timestamp of this device's last successful Pull
  lastSeasonDataCheckedAt: number | null; // Unix timestamp config/seasons.ts was last manually verified against Bulbapedia/Serebii
  // Per-file "last verified against regulation X" state for the hand-authored
  // Champions balance tables (championsMoveOverrides.ts/
  // championsAbilityOverrides.ts/championsMovepoolChanges.ts). Unlike
  // lastSeasonDataCheckedAt above, staleness here is regulation-change-driven
  // rather than date-window-driven - see useChampionsDataCheck.ts. Missing
  // entries fall back to DEFAULT_SETTINGS via useSettings.ts's existing
  // spread-over-defaults pattern, so no migration was needed to add this.
  championsDataChecks: Partial<Record<ChampionsDataCheckId, { regulation: string; checkedAt: number }>>;
  // Swaps PokemonCard.tsx's main 96px sprite (base + Mega-form) from static
  // PNG to Showdown's animated GIF CDN - see CLAUDE.md's hotlink exception #5
  // and utils/spriteUrl.ts::getAnimatedSpriteUrl. Scoped to that one render
  // site only; every other sprite in the app stays static PNG regardless.
  showAnimatedSprites: boolean;
  playerProfile: PlayerProfile;
  lastModified: number; // Unix timestamp
}

/**
 * Bundled payload synced as a single blob via the cross-device sync Worker -
 * pokeapi-cache.json/game-data-cache.json/the sprite cache are pure
 * rebuildable caches and deliberately never included.
 */
export interface SyncPayload {
  teams: Team[];
  battles: Battle[];
  savedAt: number; // Unix timestamp this payload was pushed
}
