import type { BattleSide } from '../types/pokemon';

/**
 * Shared HTML5 drag-and-drop MIME type for dragging a roster Pokemon
 * (TeamRosterColumn.tsx, either side) onto a Battlefield slot
 * (Battlefield.tsx) - centralized so both sides of the drag/drop pair
 * agree on the exact string. The payload carries `side` alongside the id
 * so a drop target can tell a mismatched drag apart (a player card
 * dropped on an opponent slot, or vice versa) and ignore it.
 */
export const POKEMON_DRAG_TYPE = 'application/x-choicebuds-pokemon';

export interface PokemonDragPayload {
  side: BattleSide;
  pokemonId: string;
}
