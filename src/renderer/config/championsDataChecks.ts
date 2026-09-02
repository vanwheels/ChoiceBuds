/**
 * championsDataChecks.ts - Tracked Champions Balance Tables
 * Lists the hand-authored files the Settings "Champions Balance Data"
 * reminder (useChampionsDataCheck.ts/ChampionsDataCheckSection.tsx) surfaces
 * staleness for. `championsMechanics.ts` is deliberately excluded - nothing
 * in the app reads its CHAMPIONS_STATUS_CONDITIONS export yet, so there's
 * nothing to flag stale.
 */

import type { ChampionsDataCheckId } from '../types/pokemon';

export interface ChampionsDataCheckDef {
  id: ChampionsDataCheckId;
  label: string;
  filePath: string;
}

export const CHAMPIONS_DATA_CHECKS: ChampionsDataCheckDef[] = [
  { id: 'moves', label: 'Move Overrides', filePath: 'src/renderer/config/championsMoveOverrides.ts' },
  { id: 'abilities', label: 'Ability Overrides', filePath: 'src/renderer/config/championsAbilityOverrides.ts' },
  { id: 'movepool', label: 'Movepool Changes', filePath: 'src/renderer/config/championsMovepoolChanges.ts' },
];
