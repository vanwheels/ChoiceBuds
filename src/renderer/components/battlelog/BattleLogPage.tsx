/**
 * BattleLogPage.tsx - Battle Log Tab Root
 * No form open -> RecordMatchForm entry point + PastBattlesList. Replaced
 * the old StartBattleFlow -> ActiveBattleView live-logging flow with a
 * single post-match record form (see RecordMatchForm.tsx and
 * src/renderer/_archived/battle-logger/README.md for why).
 * `editingBattle` opens that same form in edit mode (see RecordMatchForm.tsx's
 * header doc) instead of a separate screen - PastBattlesList's new Edit
 * button feeds it.
 */

import { useState } from 'react';
import type { Battle } from '../../types/pokemon';
import type { UseBattlesReturn } from '../../hooks/useBattles';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import RecordMatchForm from './RecordMatchForm';
import PastBattlesList from './PastBattlesList';

interface BattleLogPageProps {
  battlesState: UseBattlesReturn;
  teamsState: UseTeamsReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  /** Threaded down to RecordMatchForm's per-opponent-tile "Calc" trigger (Regular Calc Battle Log Integration Leg 1) - see App.tsx's openCalcPopup. */
  openCalcPopup: (prefill?: { species: string }) => void;
}

export default function BattleLogPage({ battlesState, teamsState, speciesRosterState, spriteCacheState, openCalcPopup }: BattleLogPageProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [editingBattle, setEditingBattle] = useState<Battle | null>(null);

  if (isRecording || editingBattle) {
    return (
      <RecordMatchForm
        teamsState={teamsState}
        battlesState={battlesState}
        speciesRosterState={speciesRosterState}
        spriteCacheState={spriteCacheState}
        openCalcPopup={openCalcPopup}
        editingBattle={editingBattle ?? undefined}
        onRecorded={() => {
          setIsRecording(false);
          setEditingBattle(null);
        }}
        onCancel={() => {
          setIsRecording(false);
          setEditingBattle(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-accent-gold">Battle Log</h1>
        <button
          onClick={() => setIsRecording(true)}
          className="px-4 py-2 rounded-lg bg-accent-gold hover:bg-accent-gold-deep text-zinc-900 font-semibold transition-colors cursor-pointer"
        >
          + Record a Match
        </button>
      </div>

      <PastBattlesList
        battles={battlesState.battles}
        onEdit={setEditingBattle}
        onDelete={battlesState.deleteBattle}
      />
    </div>
  );
}
