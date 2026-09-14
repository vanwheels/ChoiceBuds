/**
 * CalcPage.tsx - Champions Damage Calculator Tab
 * Layout matches the real calc.pokemonshowdown.com Champions mode: two
 * move grids (one per Pokémon) up top, a shared result detail panel below
 * them, then a 3-column row (Pokémon 1 | Field | Pokémon 2). Not yet wired
 * into the teams database - see useDamageCalc.ts.
 *
 * useDamageCalc (and its @smogon/calc import - the heaviest dependency in
 * the app) is instantiated here rather than in App.tsx specifically so that
 * this whole module stays behind App.tsx's React.lazy() boundary - a
 * Teams-only session never has to parse/load the calc engine.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useDamageCalc, ALL_REGULATION_IDS } from '../../hooks/useDamageCalc';
import type { OpponentPokemonEntry } from '../../types/pokemon';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../../hooks/useSettings';
import { getRegulationLabel, toRegulationId } from '../../utils/pokemonRules';
import CalcPokemonPanel from './CalcPokemonPanel';
import CalcMoveGrid from './CalcMoveGrid';
import CalcFieldPanel from './CalcFieldPanel';
import CalcResultPanel from './CalcResultPanel';
import CalcSavedSetsModal from './CalcSavedSetsModal';

interface CalcPageProps {
  gameDataState: UseGameDataReturn;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  savedPokemonState: UseSavedPokemonReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  /** The currently open Battle Log session's live opponent roster, if any (Regular Calc Battle Log Integration Leg 3, see App.tsx's battleLogSession doc) - passed only to the Pokemon 2 panel below, which is reserved for the opponent during a Battle Log session (Leg 4 - see this file's render for why Pokemon 1 never receives it). Undefined outside that flow (e.g. the plain floating launcher opened with no Battle Log session active). */
  battleLogOpponentRoster?: OpponentPokemonEntry[];
  /** Merges a write back into a specific opponent-roster entry by id (Regular Calc Battle Log Integration Leg 2/3) - the effect below calls this whenever pokemon2's moves/ability/item change, but only once the Pokemon 2 panel has actually loaded an opponent entry via its tray (see linkedEntryId below). Undefined outside a Battle Log session, same as battleLogOpponentRoster. */
  onUpdateOpponentEntry?: (entryId: string, updates: Partial<OpponentPokemonEntry>) => void;
  /** The currently open Battle Log session's own team id, if any (Regular Calc Battle Log Integration Leg 4) - passed only to the Pokemon 1 panel below as its preferred "Load from Team" default, since Pokemon 1 is reserved for the player's own side during a Battle Log session. Undefined outside that flow, same as battleLogOpponentRoster. */
  battleLogPlayerTeamId?: string;
}

export default function CalcPage({
  gameDataState, teamsState, databaseState, savedPokemonState, spriteCacheState, settingsState,
  battleLogOpponentRoster, onUpdateOpponentEntry, battleLogPlayerTeamId,
}: CalcPageProps) {
  const [isSavedSetsOpen, setIsSavedSetsOpen] = useState(false);
  // Which opponent-roster entry (if any) the Pokemon 2 panel's "Load from
  // Opponent" tray last loaded - set via onLoadOpponentEntry below, and the
  // target of the write-back effect further down. Reset to null (React's
  // "adjust state during render" pattern - see docs/investigations/
  // set-state-in-effect-lint-fix.md for why this project prefers it over a
  // reset useEffect) whenever onUpdateOpponentEntry's identity changes,
  // i.e. the Battle Log session boundary itself changes (a session
  // starting, ending, or being replaced by a different one) - a link must
  // never survive into an unrelated session.
  const [linkedEntryId, setLinkedEntryId] = useState<string | null>(null);
  const [prevOnUpdateOpponentEntry, setPrevOnUpdateOpponentEntry] = useState(() => onUpdateOpponentEntry);
  if (onUpdateOpponentEntry !== prevOnUpdateOpponentEntry) {
    setPrevOnUpdateOpponentEntry(() => onUpdateOpponentEntry);
    setLinkedEntryId(null);
  }
  // Computed inside each side's CalcPokemonPanel (that's where the fetched
  // ChampionsUsageEntry lives) and lifted up here purely to reach the move
  // grids above, which CalcPage renders as CalcPokemonPanel's siblings, not
  // its children - see CalcPokemonPanel.tsx's header comment.
  const [pokemon1MovePercentByName, setPokemon1MovePercentByName] = useState<Record<string, number>>({});
  const [pokemon2MovePercentByName, setPokemon2MovePercentByName] = useState<Record<string, number>>({});
  const calcState = useDamageCalc(gameDataState, toRegulationId(settingsState.settings.defaultRegulation));
  const {
    regulationId, setRegulationId,
    pokemon1, pokemon2, setPokemon1, setPokemon2, setPokemon1Move, setPokemon2Move,
    field, setField, setPokemon1Side, setPokemon2Side,
    speciesOptions, pokemon1MoveOptions, pokemon2MoveOptions, itemOptions, abilityOptions, natureOptions,
    pokemon1Formes, pokemon2Formes, pokemon1BaseStats, pokemon2BaseStats,
    pokemon1BoostedStats, pokemon2BoostedStats,
    pokemon1NatureEffect, pokemon2NatureEffect, pokemon1Speed, pokemon2Speed,
    p1Results, p2Results, selectedResult, setSelectedResult, selectedEntry,
  } = calcState;

  // Write-back to the linked opponent entry (Regular Calc Battle Log
  // Integration Leg 2/3) - reports pokemon2's moves/ability/item whenever
  // any of them actually change, but only once the Pokemon 2 panel's own
  // "Load from Opponent" tray has set linkedEntryId (and only while a
  // Battle Log session is actually open, i.e. onUpdateOpponentEntry is set).
  //
  // linkBaselineRef tracks the per-field values as of the link's own start
  // (or its last reported update) and only ever reports what has actually
  // moved off that baseline - never a full snapshot of all three (or of all
  // 4 move slots) every time any one of them changes. That distinction
  // matters specifically for moves: RecordMatchForm.handleCalcUpdate unions
  // a reported `moves` list into the entry's existing tags rather than
  // overwriting it (a growable list, not a fixed 4 slots), so a stale,
  // not-yet-touched slot riding along on some other slot's edit would get
  // permanently baked into the entry even though ability/item's plain
  // overwrite would have self-corrected on the next real change. Moves are
  // diffed per slot index against the baseline (not as one joined string)
  // for the same reason - editing slot 0 must not resurface slot 1's still-
  // stale leftover name as if it were newly set. Establishing a new link's
  // baseline (a fresh linkedEntryId) reports nothing.
  const linkBaselineRef = useRef<{ entryId: string; moves: string[]; ability: string; item: string } | null>(null);
  useEffect(() => {
    if (!onUpdateOpponentEntry || !linkedEntryId) {
      linkBaselineRef.current = null;
      return;
    }
    const currentMoves = pokemon2.moves.map(m => m.name);
    const currentAbility = pokemon2.ability;
    const currentItem = pokemon2.item;
    const baseline = linkBaselineRef.current;
    if (!baseline || baseline.entryId !== linkedEntryId) {
      linkBaselineRef.current = { entryId: linkedEntryId, moves: currentMoves, ability: currentAbility, item: currentItem };
      return;
    }

    const updates: Partial<OpponentPokemonEntry> = {};
    const changedMoves = currentMoves.filter((name, i) => name && name !== baseline.moves[i]);
    if (changedMoves.length > 0) updates.moves = changedMoves;
    if (currentAbility !== baseline.ability && currentAbility) updates.ability = currentAbility;
    if (currentItem !== baseline.item && currentItem) updates.item = currentItem;

    if (Object.keys(updates).length > 0) {
      onUpdateOpponentEntry(linkedEntryId, updates);
      linkBaselineRef.current = { entryId: linkedEntryId, moves: currentMoves, ability: currentAbility, item: currentItem };
    }
  }, [onUpdateOpponentEntry, linkedEntryId, pokemon2.moves, pokemon2.ability, pokemon2.item]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsSavedSetsOpen(true)}
          className="px-3 py-1 text-xs font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          Saved Sets
        </button>
        {ALL_REGULATION_IDS.map(id => (
          <button
            key={id}
            onClick={() => setRegulationId(id)}
            className={`px-3 py-1 text-xs font-bold uppercase tracking-wide rounded transition-colors cursor-pointer ${
              regulationId === id ? 'bg-accent-gold text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {getRegulationLabel(id)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <CalcMoveGrid
          title="Pokémon 1's Moves"
          moves={pokemon1.moves}
          results={p1Results}
          moveOptions={pokemon1MoveOptions}
          selectedIndex={selectedResult?.side === 'p1' ? selectedResult.index : null}
          onChangeMove={setPokemon1Move}
          onSelect={(index) => setSelectedResult({ side: 'p1', index })}
          usagePercentByName={pokemon1MovePercentByName}
        />
        <CalcMoveGrid
          title="Pokémon 2's Moves"
          moves={pokemon2.moves}
          results={p2Results}
          moveOptions={pokemon2MoveOptions}
          selectedIndex={selectedResult?.side === 'p2' ? selectedResult.index : null}
          onChangeMove={setPokemon2Move}
          onSelect={(index) => setSelectedResult({ side: 'p2', index })}
          usagePercentByName={pokemon2MovePercentByName}
        />
      </div>

      <CalcResultPanel entry={selectedEntry} />

      <div className="flex flex-wrap gap-3">
        <CalcPokemonPanel
          title="Pokémon 1"
          state={pokemon1}
          speciesOptions={speciesOptions}
          itemOptions={itemOptions}
          abilityOptions={abilityOptions}
          natureOptions={natureOptions}
          moveOptions={pokemon1MoveOptions}
          formes={pokemon1Formes}
          baseStats={pokemon1BaseStats}
          boostedStats={pokemon1BoostedStats}
          natureEffect={pokemon1NatureEffect}
          teams={teamsState.teams}
          preferredTeamId={battleLogPlayerTeamId}
          savedPokemonState={savedPokemonState}
          gameDataState={gameDataState}
          databaseState={databaseState}
          resolveSprite={spriteCacheState.resolveSprite}
          onChange={setPokemon1}
          onMoveUsageChange={setPokemon1MovePercentByName}
        />
        <CalcFieldPanel
          field={field}
          onChangeField={setField}
          onChangePokemon1Side={setPokemon1Side}
          onChangePokemon2Side={setPokemon2Side}
          pokemon1Ability={pokemon1.ability}
          pokemon2Ability={pokemon2.ability}
          pokemon1Speed={pokemon1Speed}
          pokemon2Speed={pokemon2Speed}
        />
        <CalcPokemonPanel
          title="Pokémon 2"
          state={pokemon2}
          speciesOptions={speciesOptions}
          itemOptions={itemOptions}
          abilityOptions={abilityOptions}
          natureOptions={natureOptions}
          moveOptions={pokemon2MoveOptions}
          formes={pokemon2Formes}
          baseStats={pokemon2BaseStats}
          boostedStats={pokemon2BoostedStats}
          natureEffect={pokemon2NatureEffect}
          teams={teamsState.teams}
          opponentRoster={battleLogOpponentRoster}
          onLoadOpponentEntry={setLinkedEntryId}
          savedPokemonState={savedPokemonState}
          gameDataState={gameDataState}
          databaseState={databaseState}
          resolveSprite={spriteCacheState.resolveSprite}
          onChange={setPokemon2}
          onMoveUsageChange={setPokemon2MovePercentByName}
        />
      </div>

      <p className="text-center text-[10px] text-zinc-600">Powered by @smogon/calc</p>

      <AnimatePresence>
        {isSavedSetsOpen && (
          <CalcSavedSetsModal
            onClose={() => setIsSavedSetsOpen(false)}
            databaseState={databaseState}
            savedPokemonState={savedPokemonState}
            resolveSprite={spriteCacheState.resolveSprite}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
