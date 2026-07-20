/**
 * Drag-and-drop MIME type for reordering the 4 move slots within a single
 * Pokemon's own moveset (MoveBubbleGrid.tsx) - separate from
 * utils/teamRosterDragTypes.ts (whole-Pokemon-card reorder within a team)
 * since the payload shape and the two features are otherwise unrelated.
 * `ownerId` (React's own useId(), one per EditOverlays instance) scopes a
 * drag to the card it started in, since `fromIndex` alone can't tell two
 * different Pokemon cards' move grids apart if a drag strays from one
 * card's grid onto another's while dragging.
 */
export const MOVE_REORDER_DRAG_TYPE = 'application/x-choicebuds-move-reorder';

export interface MoveReorderDragPayload {
  ownerId: string;
  fromIndex: number;
}
