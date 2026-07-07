/**
 * Move Flags (Sound/Bullet/Punch/etc.) - Visible Move Tags
 *
 * Pokemon Champions displays small tags on moves (e.g. [Sound], [Bullet])
 * so a move's interaction with abilities like Soundproof/Bulletproof/Strong
 * Jaw is clear at a glance, without memorizing which moves carry which
 * flag. The underlying flags are standard Pokemon move properties (not a
 * Champions-specific balance change) - see scripts/generateMoveFlags.ts for
 * how moveFlagsData.generated.ts was produced from @smogon/calc's bundled
 * Gen 9 Showdown movedex.
 *
 * ASSUMPTION - not yet confirmed in-game: which of the 8 tracked flags
 * Champions actually surfaces as a UI tag. `contact` is excluded from
 * VISIBLE_MOVE_FLAGS since nearly every physical move has it and no known
 * Pokemon game's UI has ever shown it as a callout tag; the other 7 are
 * included as a reasonable default. Adjust VISIBLE_MOVE_FLAGS once
 * confirmed against the real game.
 */
import type { MoveData } from '../types/pokemon';
import { MOVE_FLAGS_DATA } from './moveFlagsData.generated';

export type MoveFlagKey = 'contact' | 'bite' | 'sound' | 'punch' | 'bullet' | 'pulse' | 'slicing' | 'wind';

export const MOVE_FLAG_LABELS: Record<MoveFlagKey, string> = {
  contact: 'Contact',
  bite: 'Bite',
  sound: 'Sound',
  punch: 'Punch',
  bullet: 'Bullet',
  pulse: 'Pulse',
  slicing: 'Slicing',
  wind: 'Wind',
};

export const VISIBLE_MOVE_FLAGS: MoveFlagKey[] = ['sound', 'bullet', 'punch', 'bite', 'pulse', 'slicing', 'wind'];

/**
 * Champions reclassified these 4 moves as slicing (Sharpness-boostable) -
 * mainline Scarlet/Violet does not, so @smogon/calc's bundled data (the
 * source for moveFlagsData.generated.ts) doesn't mark them either. Verified
 * against Serebii's per-move descriptions and the "Data Comparative
 * Champions" community spreadsheet (see championsMoveOverrides.ts for full
 * source citation) - both note the "considered a slicing move" text
 * directly on these moves' Champions-specific entries.
 */
const CHAMPIONS_ADDED_FLAGS: Record<string, MoveFlagKey[]> = {
  'dire-claw': ['slicing'],
  'crush-claw': ['slicing'],
  'shadow-claw': ['slicing'],
  'dragon-claw': ['slicing'],
};

/** All flags a move has (normalized move name -> flag key list), not just the visible subset. */
export function getMoveFlags(normalizedMoveName: string): MoveFlagKey[] {
  const base = (MOVE_FLAGS_DATA[normalizedMoveName] as MoveFlagKey[] | undefined) ?? [];
  const added = CHAMPIONS_ADDED_FLAGS[normalizedMoveName];
  if (!added) return base;
  return [...new Set([...base, ...added])];
}

/** Applied at the same read boundary as the Champions overrides (useGameData.ts) - see that file. */
export function applyMoveFlags(move: MoveData): MoveData {
  return { ...move, flags: getMoveFlags(move.name) };
}
