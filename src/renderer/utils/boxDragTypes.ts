/**
 * Drag-and-drop MIME type for reordering Box Tab entries (Box Tab: Reorder,
 * see TODO.md) - same whole-entry-reorder-by-dragging-one-onto-another shape
 * as utils/teamsListDragTypes.ts (TeamCard.tsx's own team-list reorder), just
 * scoped to SavedPokemonEntry ids instead of Team ids. Separate from
 * utils/teamRosterDragTypes.ts (reordering Pokemon within one team's own
 * roster) since a Box entry isn't a roster slot.
 */
export const BOX_DRAG_TYPE = 'application/x-choicebuds-box';

export interface BoxDragPayload {
  draggedId: string;
}
