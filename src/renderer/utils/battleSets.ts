/**
 * battleSets.ts - Bo3 Set Grouping
 * Shared by PastBattlesList.tsx (display), useBattleLogActions.ts::startBattle
 * (deciding whether a new battle continues an existing set), and
 * battleStats.ts (the Statistics page's set-level record) - see
 * types/pokemon.ts's Battle.setId/opponentName doc for the data model.
 */

import type { Battle } from '../types/pokemon';

export interface BattleSetGroup {
  setId: string;
  opponentName?: string;
  battles: Battle[]; // oldest-first within the group (Game 1, 2, 3)
}

/**
 * Groups battles by setId, preserving the overall ordering of `battles`
 * (each group placed at the position of its first-encountered member) -
 * PastBattlesList.tsx relies on `battles` already being newest-first, so
 * this keeps that ordering at the group level too. Each group's own
 * `battles` are sorted oldest-first for a natural Game 1/2/3 reading order.
 */
export function groupBattlesBySet(battles: Battle[]): BattleSetGroup[] {
  const order: string[] = [];
  const bySetId = new Map<string, Battle[]>();

  for (const battle of battles) {
    if (!bySetId.has(battle.setId)) {
      order.push(battle.setId);
      bySetId.set(battle.setId, []);
    }
    bySetId.get(battle.setId)!.push(battle);
  }

  return order.map(setId => {
    const sorted = [...bySetId.get(setId)!].sort((a, b) => a.date - b.date);
    return {
      setId,
      opponentName: sorted[0]?.opponentName, // Game 1's casing, so it stays stable even if a later game's typed name differs only by case
      battles: sorted,
    };
  });
}

/** A set is decided once either side reaches 2 wins (best-of-3) - undecided while 0-0/1-0/0-1/1-1. */
export function getSetOutcome(battles: Battle[]): { wins: number; losses: number; decided: boolean } {
  const wins = battles.filter(b => b.result === 'win').length;
  const losses = battles.filter(b => b.result === 'loss').length;
  return { wins, losses, decided: wins >= 2 || losses >= 2 };
}
