/**
 * PlayerProfileSection.tsx - Player Identity for the VGC Team Sheet PDF
 * Text/date fields are local-draft-then-commit-on-blur (same pattern as
 * TeamCard.tsx's name/author/notes fields) - NOT direct-commit-per-keystroke.
 * That was the original design here, but committing on every keystroke
 * means every field's `value` prop is round-tripped through an async
 * updateSettings() (IPC + disk write) and fed straight back into the input,
 * which fights the native <input type="date"> widget's internal per-segment
 * typing buffer and visibly corrupts it mid-entry (typing "01151995" could
 * land as "0099-03-10" - reproduced live, not theoretical). Age Division
 * stays direct-commit since it's a discrete click, not free-text typing, so
 * has no such race - same as RegulationBadge elsewhere in the app.
 */

import { useState } from 'react';
import type { UseSettingsReturn } from '../hooks/useSettings';
import type { PlayerProfile } from '../types/pokemon';

interface PlayerProfileSectionProps {
  settingsState: UseSettingsReturn;
}

const AGE_DIVISIONS: PlayerProfile['ageDivision'][] = ['Juniors', 'Seniors', 'Masters'];

const inputClass = 'w-full px-3 py-1.5 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold';
const labelClass = 'block text-xs font-medium text-zinc-300 mb-1';

export default function PlayerProfileSection({ settingsState }: PlayerProfileSectionProps) {
  const { settings, updateSettings } = settingsState;
  const { playerProfile } = settings;

  const [localPlayerName, setLocalPlayerName] = useState(playerProfile.playerName);
  const [localTrainerNameInGame, setLocalTrainerNameInGame] = useState(playerProfile.trainerNameInGame);
  const [localPlayerId, setLocalPlayerId] = useState(playerProfile.playerId);
  const [localSupportId, setLocalSupportId] = useState(playerProfile.supportId);
  const [localSwitchProfileName, setLocalSwitchProfileName] = useState(playerProfile.switchProfileName);
  const [localDateOfBirth, setLocalDateOfBirth] = useState(playerProfile.dateOfBirth);

  const [revealed, setRevealed] = useState(false);

  const commitField = async (field: keyof PlayerProfile, value: string) => {
    if (value !== playerProfile[field]) {
      await updateSettings({ playerProfile: { ...playerProfile, [field]: value, updatedAt: Date.now() } });
    }
  };

  const setAgeDivision = (division: PlayerProfile['ageDivision']) => {
    const nextDivision = playerProfile.ageDivision === division ? '' : division;
    // react-hooks/purity misattributes this Date.now() call as happening
    // during render because setAgeDivision is only ever invoked from inside
    // AGE_DIVISIONS.map() below - it's actually just building an onClick
    // closure per button, same as commitField's onBlur closures elsewhere in
    // this file (which aren't flagged, since they're not built inside a
    // .map()). Confirmed via an isolated repro outside this file.
    // eslint-disable-next-line react-hooks/purity
    updateSettings({ playerProfile: { ...playerProfile, ageDivision: nextDivision, updatedAt: Date.now() } });
  };

  const maskedClass = `${inputClass} opacity-50 cursor-not-allowed select-none`;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-200">Player Profile</h2>
        <button
          type="button"
          onClick={() => setRevealed(r => !r)}
          className="text-xs font-medium text-accent-gold hover:underline cursor-pointer"
        >
          {revealed ? 'Hide personal info' : 'Reveal personal info'}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        Entered once and reused on every VGC Team Sheet PDF export (Teams page, per-team export button) -
        a team's own Battle Team Number/Name is entered separately at export time. Legal name, Player ID,
        Support ID, and date of birth stay hidden on screen until revealed, since this Settings page is
        easy to end up on camera during a stream or screen share.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Player Name</label>
          {revealed ? (
            <input
              type="text"
              value={localPlayerName}
              onChange={e => setLocalPlayerName(e.target.value)}
              onBlur={() => commitField('playerName', localPlayerName)}
              className={inputClass}
            />
          ) : (
            <div className={maskedClass}>{localPlayerName ? '••••••••' : ''}</div>
          )}
        </div>
        <div>
          <label className={labelClass}>Trainer Name in Game</label>
          <input
            type="text"
            value={localTrainerNameInGame}
            onChange={e => setLocalTrainerNameInGame(e.target.value)}
            onBlur={() => commitField('trainerNameInGame', localTrainerNameInGame)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Player ID</label>
          {revealed ? (
            <input
              type="text"
              value={localPlayerId}
              onChange={e => setLocalPlayerId(e.target.value)}
              onBlur={() => commitField('playerId', localPlayerId)}
              className={inputClass}
            />
          ) : (
            <div className={maskedClass}>{localPlayerId ? '••••••••' : ''}</div>
          )}
        </div>
        <div>
          <label className={labelClass}>Support ID</label>
          {revealed ? (
            <input
              type="text"
              value={localSupportId}
              onChange={e => setLocalSupportId(e.target.value)}
              onBlur={() => commitField('supportId', localSupportId)}
              className={inputClass}
            />
          ) : (
            <div className={maskedClass}>{localSupportId ? '••••••••' : ''}</div>
          )}
        </div>
        <div>
          <label className={labelClass}>Switch Profile Name</label>
          <input
            type="text"
            value={localSwitchProfileName}
            onChange={e => setLocalSwitchProfileName(e.target.value)}
            onBlur={() => commitField('switchProfileName', localSwitchProfileName)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Date of Birth</label>
          {revealed ? (
            <input
              type="date"
              value={localDateOfBirth}
              onChange={e => setLocalDateOfBirth(e.target.value)}
              onBlur={() => commitField('dateOfBirth', localDateOfBirth)}
              className={inputClass}
            />
          ) : (
            <div className={maskedClass}>{localDateOfBirth ? '••••••••' : ''}</div>
          )}
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Age Division</label>
          <div className="flex gap-2">
            {AGE_DIVISIONS.map(division => (
              <button
                key={division}
                type="button"
                onClick={() => setAgeDivision(division)}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                  playerProfile.ageDivision === division
                    ? 'bg-accent-gold text-zinc-900'
                    : 'text-zinc-300 bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {division}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
