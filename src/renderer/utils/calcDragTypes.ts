/**
 * Drag-and-drop MIME type for dragging a team Pokemon (from CalcTeamTray.tsx)
 * onto either Pokemon panel in the Calc tab - separate from
 * utils/dragTypes.ts (Battle Logger's own drag type) since the payload
 * shape and the two features are otherwise unrelated.
 */
export const CALC_TEAM_POKEMON_DRAG_TYPE = 'application/x-choicebuds-calc-team-pokemon';

export interface CalcTeamPokemonDragPayload {
  teamId: string;
  pokemonIndex: number;
}
