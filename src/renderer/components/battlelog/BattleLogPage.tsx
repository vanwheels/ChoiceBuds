/**
 * BattleLogPage.tsx - Battle Log Tab Root
 * No form open -> RecordMatchForm entry point + PastBattlesList. Replaced
 * the old StartBattleFlow -> ActiveBattleView live-logging flow with a
 * single post-match record form (see RecordMatchForm.tsx and
 * src/renderer/_archived/battle-logger/README.md for why).
 */

import { useState } from 'react';
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
}

export default function BattleLogPage({ battlesState, teamsState, speciesRosterState, spriteCacheState }: BattleLogPageProps) {
  const [isRecording, setIsRecording] = useState(false);

  if (isRecording) {
    return (
      <RecordMatchForm
        teamsState={teamsState}
        battlesState={battlesState}
        speciesRosterState={speciesRosterState}
        spriteCacheState={spriteCacheState}
        onRecorded={() => setIsRecording(false)}
        onCancel={() => setIsRecording(false)}
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
        onDelete={battlesState.deleteBattle}
      />
    </div>
  );
}
