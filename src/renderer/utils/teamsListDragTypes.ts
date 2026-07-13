/**
 * Drag-and-drop MIME type for reordering teams in the list on TeamsPage.tsx
 * (TeamCard.tsx's own header bar) - separate from utils/teamRosterDragTypes.ts
 * (reordering Pokemon within one team's roster) since the payload shape and
 * the two features are otherwise unrelated.
 */
export const TEAMS_LIST_DRAG_TYPE = 'application/x-choicebuds-teams-list';

export interface TeamsListDragPayload {
  draggedTeamId: string;
}
