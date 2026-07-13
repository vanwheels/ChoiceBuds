/**
 * Drag-and-drop MIME type for reordering a Pokemon within its own team's
 * roster grid (TeamCard.tsx/PokemonCard.tsx) - separate from
 * utils/dragTypes.ts (Battle Logger roster -> Battlefield) and
 * utils/calcDragTypes.ts (Calc team tray -> Calc panel) since the payload
 * shape and the three features are otherwise unrelated.
 */
export const TEAM_ROSTER_DRAG_TYPE = 'application/x-choicebuds-team-roster-pokemon';

export interface TeamRosterDragPayload {
  teamId: string;
  fromIndex: number;
}
