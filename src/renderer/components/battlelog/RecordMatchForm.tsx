/**
 * RecordMatchForm.tsx - Post-Match Record
 * Replaces the old StartBattleFlow -> ActiveBattleView live-logging flow
 * (see src/renderer/_archived/battle-logger/README.md) with a single
 * ~30-second form: pick a Team, check which of the 6 were brought, add the
 * opponent Pokemon seen, record the result, jot a freeform note. Submits one
 * `addBattle` call.
 *
 * Still builds a full `Battle` object (not a new leaner type) so the
 * Statistics page and its aggregations in utils/battleStats.ts need zero
 * changes - the turn-log/field-state fields it doesn't populate are just
 * left at their empty defaults, same as a fresh live battle used to start.
 *
 * Doubles as the edit flow for an already-saved battle when `editingBattle`
 * is passed (see BattleLogPage.tsx/PastBattlesList.tsx): team/date/setId are
 * locked (Battle.playerRoster is a point-in-time snapshot, not a live
 * reference to the team, so there's no sound way to let the team change
 * mid-edit) and only brought selection, opponent roster, opponent name,
 * result, and notes are editable, persisted via `updateBattle` instead of
 * `addBattle`.
 */

import { useEffect, useState } from 'react';
import type { Battle, BroughtPokemonSnapshot, OpponentPokemonEntry, SpeciesRosterEntry, Team } from '../../types/pokemon';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseBattlesReturn } from '../../hooks/useBattles';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { groupBattlesBySet, getSetOutcome } from '../../utils/battleSets';
import { toRegulationId } from '../../utils/pokemonRules';
import SpeciesPickerCard from '../SpeciesPickerCard';
import BroughtToggleTile from './BroughtToggleTile';

const MAX_BROUGHT = 4;
const MAX_OPPONENT_ROSTER_SIZE = 6;

/** Shared toggle logic for both brought-4 pickers below (player roster, opponent roster) - add up to `max` ids, remove on re-click. */
function toggleId(prev: string[], id: string, max: number): string[] {
  if (prev.includes(id)) return prev.filter(existing => existing !== id);
  if (prev.length >= max) return prev;
  return [...prev, id];
}

interface RecordMatchFormProps {
  teamsState: UseTeamsReturn;
  battlesState: UseBattlesReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  onRecorded: () => void;
  onCancel: () => void;
  /** Opens the global Calc popup, optionally prefilling pokemon2's species and linking Calc's moves/ability/item write-back to a specific opponent-roster entry - wired to each opponent tile's "Calc" trigger below (Regular Calc Battle Log Integration Leg 1/2). */
  openCalcPopup: (prefill?: { species: string; entryId?: string; onUpdate?: (updates: Partial<OpponentPokemonEntry>) => void }) => void;
  /** Tears down the Calc write-back link (Leg 2) - called on unmount below so a stale closure over this form's own setOpponentRoster never survives the form (see App.tsx's calcLink doc). */
  clearCalcLink: () => void;
  /** When set, the form edits this already-saved battle instead of creating a new one - see the header doc above. */
  editingBattle?: Battle;
}

function snapshotRoster(team: Team): BroughtPokemonSnapshot[] {
  return team.pokemon.map(p => ({
    id: crypto.randomUUID(),
    species: p.showdownData.species,
    nickname: p.showdownData.nickname,
    ability: p.showdownData.ability,
    item: p.showdownData.item,
    teraType: p.showdownData.teraType,
    moves: p.showdownData.moves,
    gender: p.showdownData.gender,
    pokedexNumber: p.pokedexNumber,
    types: p.types,
    spriteUrl: p.spriteUrl,
    nature: p.showdownData.nature,
    evs: p.showdownData.evs,
    level: p.showdownData.level,
  }));
}

/** Mirrors the old useBattleLogActions.ts::startBattle Bo3-continuation rule: a non-blank opponent name joins the most recently-updated still-open set (undecided, not full, no in-progress member) against that name instead of starting a fresh one. */
function resolveSetId(battles: Battle[], opponentName: string): string {
  const trimmed = opponentName.trim();
  if (!trimmed) return crypto.randomUUID();

  const matchingSets = groupBattlesBySet(
    battles.filter(b => b.opponentName?.trim().toLowerCase() === trimmed.toLowerCase())
  );
  const openSet = matchingSets
    .filter(group => {
      const outcome = getSetOutcome(group.battles);
      return !outcome.decided && group.battles.length < 3;
    })
    .sort((a, b) => Math.max(...b.battles.map(x => x.updatedAt)) - Math.max(...a.battles.map(x => x.updatedAt)))[0];

  return openSet?.setId ?? crypto.randomUUID();
}

/** Builds the Battle object handleSave persists - pulled out to a plain top-level function (rather than inlined in the handler) so the id/timestamp generation reads as one deliberate snapshot step, same spirit as snapshotRoster above. */
function buildMatchRecord(args: {
  team: Team;
  playerRoster: BroughtPokemonSnapshot[];
  broughtIds: string[];
  opponentRoster: OpponentPokemonEntry[];
  opponentBroughtIds: string[];
  opponentName: string;
  result: 'win' | 'loss';
  notes: string;
  existingBattles: Battle[];
}): Battle {
  const { team, playerRoster, broughtIds, opponentRoster, opponentBroughtIds, opponentName, result, notes, existingBattles } = args;
  const trimmedName = opponentName.trim();
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    date: now,
    teamId: team.id,
    teamName: team.name,
    format: team.format,
    setId: resolveSetId(existingBattles, trimmedName),
    opponentName: trimmedName || undefined,
    playerRoster,
    broughtIds,
    playerActiveIds: [null, null],
    playerFaintedIds: [],
    opponentRoster,
    opponentBroughtIds,
    opponentActiveIds: [null, null],
    megaEvolvedIds: [],
    statStages: {},
    statusConditions: {},
    statusSetOnTurn: {},
    turns: [],
    fieldState: { playerSide: {}, opponentSide: {} },
    result,
    notes: notes.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export default function RecordMatchForm({ teamsState, battlesState, speciesRosterState, spriteCacheState, onRecorded, onCancel, openCalcPopup, clearCalcLink, editingBattle }: RecordMatchFormProps) {
  const eligibleTeams = teamsState.teams.filter(t => t.pokemon.length >= 4);
  const priorOpponentNames = Array.from(
    new Set(battlesState.battles.map(b => b.opponentName).filter((n): n is string => !!n))
  );

  const [teamId, setTeamId] = useState<string>('');
  const [opponentName, setOpponentName] = useState(editingBattle?.opponentName ?? '');
  const [broughtIds, setBroughtIds] = useState<string[]>(editingBattle?.broughtIds ?? []);
  const [opponentRoster, setOpponentRoster] = useState<OpponentPokemonEntry[]>(editingBattle?.opponentRoster ?? []);
  const [opponentBroughtIds, setOpponentBroughtIds] = useState<string[]>(editingBattle?.opponentBroughtIds ?? []);
  // Snapshotted once per team selection (see handleSelectTeam) rather than
  // derived in render - snapshotRoster mints fresh crypto.randomUUID() ids,
  // so deriving it every render (as this used to) handed out new ids on
  // every re-render, including the one right after a brought-tile click:
  // the id just selected no longer matched anything, so no tile ever
  // visually showed as selected even though broughtIds.length was correct.
  const [playerRoster, setPlayerRoster] = useState<BroughtPokemonSnapshot[]>(editingBattle?.playerRoster ?? []);
  const [isAddingOpponent, setIsAddingOpponent] = useState(false);
  const [result, setResult] = useState<'win' | 'loss' | null>(
    editingBattle && editingBattle.result !== 'in-progress' ? editingBattle.result : null
  );
  const [notes, setNotes] = useState(editingBattle?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode locks the team - playerRoster is a point-in-time snapshot, not
  // a live reference, so the stored snapshot is used as-is rather than
  // re-derived from the (possibly since-changed) live team.
  const team = editingBattle
    ? teamsState.teams.find(t => t.id === editingBattle.teamId)
    : eligibleTeams.find(t => t.id === teamId);
  const rulesetFormat = editingBattle ? (team?.format ?? editingBattle.format) : team?.format;
  const canSave = editingBattle
    ? broughtIds.length > 0 && result !== null && !isSaving
    : !!team && broughtIds.length > 0 && result !== null && !isSaving;

  // Species Clause: no legal team fields the same species twice, so once a
  // species is on the opponent's observed roster it's removed from the
  // picker's own candidate list entirely (rather than left pickable-again
  // and disabled) - otherwise the same opponent Pokemon could be added a
  // second time and both entries independently marked brought, double-
  // counting one Pokemon in the opponent's brought-4.
  const opponentSpeciesSeen = new Set(opponentRoster.map(o => o.species.toLowerCase()));
  const opponentPickerRoster = speciesRosterState.roster.filter(s => !opponentSpeciesSeen.has(s.name.toLowerCase()));

  const handleSelectTeam = (nextTeamId: string) => {
    setTeamId(nextTeamId);
    setBroughtIds([]); // roster identity (crypto.randomUUID() ids) is re-rolled per snapshot, so a prior selection can't carry over
    const nextTeam = eligibleTeams.find(t => t.id === nextTeamId);
    setPlayerRoster(nextTeam ? snapshotRoster(nextTeam) : []);
  };

  const toggleBrought = (pokemonId: string) => setBroughtIds(prev => toggleId(prev, pokemonId, MAX_BROUGHT));
  const toggleOpponentBrought = (pokemonId: string) => setOpponentBroughtIds(prev => toggleId(prev, pokemonId, MAX_BROUGHT));

  const handleAddOpponent = (species: SpeciesRosterEntry) => {
    setIsAddingOpponent(false);
    setOpponentRoster(prev => [...prev, {
      id: crypto.randomUUID(),
      species: species.name,
      pokedexNumber: species.id,
      spriteUrl: species.spriteUrl,
      types: [],
      moves: [],
      fainted: false,
      addedAt: Date.now(),
    }]);
  };

  const removeOpponent = (id: string) => {
    setOpponentRoster(prev => prev.filter(o => o.id !== id));
    setOpponentBroughtIds(prev => prev.filter(broughtId => broughtId !== id)); // drop a stale brought-selection if its entry is removed entirely
  };

  // Tears the Calc write-back link down whenever this form goes away -
  // BattleLogPage always unmounts RecordMatchForm on both onRecorded and
  // onCancel (its conditional render flips off), so a plain unmount cleanup
  // covers every exit path without needing to intercept each handler
  // separately. `clearCalcLink`'s identity must stay stable (App.tsx wraps
  // it in useCallback) - an unstable one here would clear the link the
  // instant it's set, since this effect would re-run every render.
  useEffect(() => () => clearCalcLink(), [clearCalcLink]);

  /** Thin wrapper passed as the Calc popup's write-back link (Leg 2) - merges pokemon2's moves/ability/item back into this specific opponent entry by id whenever Calc reports a change, while the link to this entry is still active. Moves union rather than overwrite (case-insensitive, since `OpponentPokemonEntry.moves` is a growable tag list, not the Calc grid's fixed 4 slots) - ability/item overwrite directly since they're single values. */
  const handleCalcUpdate = (entryId: string) => (updates: Partial<OpponentPokemonEntry>) => {
    setOpponentRoster(prev => prev.map(o => {
      if (o.id !== entryId) return o;
      const next = { ...o };
      if (updates.ability !== undefined) next.ability = updates.ability;
      if (updates.item !== undefined) next.item = updates.item;
      if (updates.moves !== undefined) {
        const existingLower = new Set(o.moves.map(m => m.toLowerCase()));
        next.moves = [...o.moves, ...updates.moves.filter(m => !existingLower.has(m.toLowerCase()))];
      }
      return next;
    }));
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);

    const trimmedName = opponentName.trim();
    const trimmedNotes = notes.trim();

    const success = editingBattle
      ? await battlesState.updateBattle(editingBattle.id, {
          broughtIds,
          opponentRoster,
          opponentBroughtIds,
          opponentName: trimmedName || undefined,
          result,
          notes: trimmedNotes || undefined,
        })
      : team
        ? await battlesState.addBattle(buildMatchRecord({
            team, playerRoster, broughtIds, opponentRoster, opponentBroughtIds, opponentName, result, notes,
            existingBattles: battlesState.battles,
          }))
        : false;

    setIsSaving(false);
    if (success) onRecorded();
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-100">{editingBattle ? 'Edit Match' : 'Record a Match'}</h2>
        <button onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-200">Cancel</button>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Team</label>
        {editingBattle ? (
          // Locked in edit mode - playerRoster is a snapshot tied to this team, so it can't be reselected (see header doc).
          <p className="text-sm text-zinc-100">{editingBattle.teamName} ({editingBattle.format})</p>
        ) : eligibleTeams.length === 0 ? (
          <p className="text-sm text-zinc-400">No saved teams with at least 4 Pokemon yet - build one in the Teams tab first.</p>
        ) : (
          <select
            value={teamId}
            onChange={e => handleSelectTeam(e.target.value)}
            className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-gold"
          >
            <option value="">Select a team...</option>
            {eligibleTeams.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.format})</option>
            ))}
          </select>
        )}
      </div>

      {(editingBattle || team) && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Brought ({broughtIds.length}/{MAX_BROUGHT})
          </label>
          <div className="flex flex-wrap gap-2">
            {playerRoster.map(p => (
              <BroughtToggleTile
                key={p.id}
                spriteUrl={p.spriteUrl}
                resolveSprite={spriteCacheState.resolveSprite}
                label={p.nickname || p.species}
                selected={broughtIds.includes(p.id)}
                onToggle={() => toggleBrought(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Opponent's Team ({opponentRoster.length}/{MAX_OPPONENT_ROSTER_SIZE}) · Brought ({opponentBroughtIds.length}/{MAX_BROUGHT})
        </label>
        <div className="flex flex-wrap gap-2">
          {opponentRoster.map(o => (
            <BroughtToggleTile
              key={o.id}
              spriteUrl={o.spriteUrl}
              resolveSprite={spriteCacheState.resolveSprite}
              label={o.species}
              selected={opponentBroughtIds.includes(o.id)}
              onToggle={() => toggleOpponentBrought(o.id)}
              trailing={
                <>
                  <button onClick={() => openCalcPopup({ species: o.species, entryId: o.id, onUpdate: handleCalcUpdate(o.id) })} title="Open in Calc" className="text-xs text-zinc-500 hover:text-accent-gold cursor-pointer">Calc</button>
                  <button onClick={() => removeOpponent(o.id)} title="Remove" className="text-zinc-500 hover:text-red-400 cursor-pointer">×</button>
                </>
              }
            />
          ))}
          {opponentRoster.length < MAX_OPPONENT_ROSTER_SIZE && (
            isAddingOpponent ? (
              <SpeciesPickerCard
                roster={opponentPickerRoster}
                rulesetId={toRegulationId(rulesetFormat ?? 'Reg M-B')}
                resolveSprite={spriteCacheState.resolveSprite}
                onSelect={handleAddOpponent}
                onClose={() => setIsAddingOpponent(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingOpponent(true)}
                className="px-3 py-2 rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-xs"
              >
                + Add Opponent Pokemon
              </button>
            )
          )}
        </div>
      </div>

      <div>
        <label htmlFor="opponentName" className="block text-sm font-medium text-zinc-300 mb-2">
          Opponent Name{' '}
          {!editingBattle && (
            <span className="text-zinc-500 font-normal">(optional - type the same name again to continue a Bo3 set)</span>
          )}
        </label>
        <input
          id="opponentName"
          type="text"
          list="prior-opponent-names"
          value={opponentName}
          onChange={e => setOpponentName(e.target.value)}
          placeholder="Who did you play?"
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
        />
        <datalist id="prior-opponent-names">
          {priorOpponentNames.map(name => <option key={name} value={name} />)}
        </datalist>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Result</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setResult('win')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${result === 'win' ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
          >
            Win
          </button>
          <button
            type="button"
            onClick={() => setResult('loss')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${result === 'loss' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
          >
            Loss
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-300 mb-2">Notes <span className="text-zinc-500 font-normal">(optional)</span></label>
        <textarea
          id="notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything worth remembering about this match..."
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="px-4 py-2 rounded-lg bg-accent-gold hover:bg-accent-gold-deep disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {editingBattle ? 'Save Changes' : 'Save Match'}
      </button>
    </div>
  );
}
