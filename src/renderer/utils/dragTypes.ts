import type { BattleSide } from '../types/pokemon';

/**
 * Shared HTML5 drag-and-drop MIME type for dragging a roster Pokemon
 * (TeamRosterColumn.tsx, either side) onto a Battlefield slot
 * (Battlefield.tsx) - centralized so both sides of the drag/drop pair
 * agree on the exact string. The payload carries `side` alongside the id
 * so a drop target can tell a mismatched drag apart (a player card
 * dropped on an opponent slot, or vice versa) and ignore it on drop.
 */
export const POKEMON_DRAG_TYPE = 'application/x-choicebuds-pokemon';

/**
 * A second, side-specific MIME type set alongside POKEMON_DRAG_TYPE at drag
 * start - `dataTransfer.getData()` only returns real data on the `drop`
 * event (browsers blank it out during `dragover` for security), but
 * `dataTransfer.types` IS readable during `dragover`. Encoding the side in
 * the type string itself (rather than only in the JSON payload) is what
 * lets an empty Battlefield slot show a live invalid-drop indicator while
 * a drag from the wrong side is still in progress, not just reject it
 * silently on drop.
 */
export function pokemonDragTypeForSide(side: BattleSide): string {
  return `application/x-choicebuds-pokemon-${side}`;
}

export interface PokemonDragPayload {
  side: BattleSide;
  pokemonId: string;
}
