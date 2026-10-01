/**
 * Persisted app settings/player-profile domain types, and the cross-device
 * sync payload shape. Split out of types/pokemon.ts (see CLAUDE.md's
 * Architecture section).
 */

import type { SavedPokemonEntry, SyncTombstone, Team, RegulationLabel } from './pokemon';
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
  // Bumped on every field edit (PlayerProfileSection.tsx), separate from
  // AppSettings.lastModified (which bumps on *any* settings change, including
  // unrelated per-device fields like boxSortMode) - the sync Worker's
  // last-write-wins merge for this singleton object (worker/src/merge.ts's
  // mergeSingleton) needs a timestamp scoped to this object alone, or an edit
  // to an unrelated setting on one device would falsely win over a real
  // profile edit made on another.
  updatedAt: number;
}

/**
 * Box Tab's persisted browsing order (Box Tab: Reorder, see TODO.md) -
 * 'alphabetical' is BoxPage.tsx's original always-on species+label sort;
 * 'custom' switches to a drag-reordered order held directly in
 * SavedPokemonDatabase.savedPokemon's own array order (see
 * useSavedPokemon.ts::setSavedPokemonOrder) rather than a dedicated order
 * field, same as TeamsDatabase.teams already works via useTeams.ts::setTeamOrder.
 */
export type BoxSortMode = 'alphabetical' | 'custom';

/**
 * Persisted user preferences, stored as settings.json in userData directory
 */
export interface AppSettings {
  version: number;
  defaultRegulation: RegulationLabel;
  syncUsername: string | null; // account username, once signed up/logged in
  syncToken: string | null; // this device's opaque bearer token for the sync Worker - never the password itself
  lastSyncedAt: number | null; // Unix timestamp of this device's last successful sync (server-stamped, from the Worker's merge response)
  // Swaps PokemonCard.tsx's main 96px sprite (base + Mega-form) from static
  // PNG to Showdown's animated GIF CDN - see CLAUDE.md's hotlink exception #5
  // and utils/spriteUrl.ts::getAnimatedSpriteUrl. Scoped to that one render
  // site only; every other sprite in the app stays static PNG regardless.
  showAnimatedSprites: boolean;
  boxSortMode: BoxSortMode;
  // Whether boxSortMode has ever been switched to 'custom' before - gates the
  // one-time seed-from-current-alphabetical-view behavior in BoxPage.tsx's
  // sort-mode toggle (see useSavedPokemon.ts::setSavedPokemonOrder) so a
  // later toggle back to Custom never clobbers an already-dragged order.
  boxCustomOrderSeeded: boolean;
  playerProfile: PlayerProfile;
  // Version last shown in the Release Notes startup popup (hooks/useReleaseNotes.ts).
  // null means "never shown" - on a fresh install this is used to silently mark
  // the current version seen with no popup (nothing reads as "new" to a
  // first-time user), only surfacing notes starting with the next update
  // after that. See docs/investigations/release-notes-popup-scope.md.
  lastSeenReleaseNotesVersion: string | null;
  lastModified: number; // Unix timestamp
}

/**
 * Bundled payload synced via the cross-device sync Worker's per-record merge
 * (see worker/src/index.ts) - pokeapi-cache.json/game-data-cache.json/the
 * sprite cache are pure rebuildable caches and deliberately never included.
 * Each collection travels with its own pending tombstones so the Worker's
 * merge can tell "deleted here" apart from "never seen here" - see
 * types/pokemon.ts's SyncTombstone.
 */
export interface SyncPayload {
  teams: Team[];
  teamTombstones: SyncTombstone[];
  battles: Battle[];
  battleTombstones: SyncTombstone[];
  savedPokemon: SavedPokemonEntry[];
  savedPokemonTombstones: SyncTombstone[];
  // A singleton, not a collection - merged by the Worker via its own
  // last-write-wins-by-updatedAt path (mergeSingleton), not mergeCollection.
  // Optional on the wire: an un-redeployed Worker still running pre-profile-
  // sync code ignores this field entirely rather than erroring (it only
  // validates the fields it knows about), so its merge response omits it -
  // useSync.ts must tolerate that and leave the local profile untouched.
  playerProfile?: PlayerProfile;
  savedAt: number; // Unix timestamp the Worker computed this merge - client-supplied values are ignored/overwritten
}
