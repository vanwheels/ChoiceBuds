/**
 * LiveCalcPage.tsx - Live Calc Tab
 * Layout reorganized (Live Calc Page Layout & Function Rework - Leg 3,
 * Layout & Live Range Grid Rework) to mirror CalcPage.tsx's own structure:
 * two live move grids up top (LiveCalcMoveRangeGrid, "Yours -> Them"/"Theirs
 * -> You"), then the Pokémon-panel row underneath (attacker + defender
 * panels, both damage% observation lists, the turn-order list). Each grid
 * cell shows a min-max % SPAN rather than CalcMoveGrid's single fixed
 * number, since the opponent's spread is never fully resolved here - see
 * LiveCalcMoveRangeGrid's own header for why that needed a dedicated grid
 * variant instead of reusing CalcMoveGrid.
 *
 * The narrowed result (per-stat SP ranges, nature/ability/item candidates)
 * used to sit here as its own LiveCalcResultPanel section between the grids
 * and the Pokémon-panel row; Live Calc Feedback Pass 2 (Leg 3) folded it
 * into LiveCalcDefenderPanel itself instead, since it's the live readout of
 * exactly that panel's own known-fact fields - see that file's header.
 *
 * Attacker entry, opponent species+level+known-facts, and three add/remove
 * observation lists (damage% into them, damage% into you, turn-order) wire
 * through to `inferDefenderStats()`, `inferOpponentOffensiveStats()` (Leg 1
 * of this same rework), and `inferDefenderSpeed()` (Leg 15). The two damage%
 * lists are the same `LiveCalcObservationList` component rendered twice with
 * different labels (Leg 2) - see that file's header for why they share one
 * component instead of a near-duplicate.
 *
 * useLiveCalc (and the @smogon/calc import it pulls in) is instantiated
 * here rather than in App.tsx, same reasoning as CalcPage.tsx's own header
 * comment - keeps this whole module behind App.tsx's React.lazy() boundary.
 *
 * `liveCalcThreatPinsState` (Live Calc -> Speed Tiers Tie-in, Leg 6) is the
 * one piece of this tab's state that isn't local, since it's read back by
 * the sibling Speed Tiers tab - see hooks/useLiveCalcThreatPins.ts.
 *
 * The one-line intro paragraph above the grids (Live Calc Result Clarity
 * Pass, reworded for this leg's reordered layout) states the tab's actual
 * flow up front - fill in what's known, log observations, read the live
 * grids/result below - since per feedback the tab wasn't self-explanatory
 * to a first-time reader without it.
 */

import { useLiveCalc } from '../../hooks/useLiveCalc';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../../hooks/useSettings';
import type { UseLiveCalcThreatPinsReturn } from '../../hooks/useLiveCalcThreatPins';
import { toRegulationId } from '../../utils/pokemonRules';
import CalcPokemonPanel from '../calc/CalcPokemonPanel';
import LiveCalcDefenderPanel from './LiveCalcDefenderPanel';
import LiveCalcObservationList from './LiveCalcObservationList';
import LiveCalcTurnOrderList from './LiveCalcTurnOrderList';
import LiveCalcMoveRangeGrid from './LiveCalcMoveRangeGrid';

interface LiveCalcPageProps {
  gameDataState: UseGameDataReturn;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  savedPokemonState: UseSavedPokemonReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
  liveCalcThreatPinsState: UseLiveCalcThreatPinsReturn;
}

export default function LiveCalcPage({
  gameDataState, teamsState, databaseState, savedPokemonState, spriteCacheState, settingsState, liveCalcThreatPinsState,
}: LiveCalcPageProps) {
  const liveCalcState = useLiveCalc(gameDataState, toRegulationId(settingsState.settings.defaultRegulation));
  const {
    gen,
    attacker, setAttacker,
    speciesOptions, itemOptions, abilityOptions, natureOptions,
    attackerFormes, attackerBaseStats, attackerBoostedStats, attackerNatureEffect, attackerMoveOptions,
    defenderMoveOptions,
    defenderSpecies, defenderLevel, setDefenderSpecies, setDefenderLevel, defenderFormes, defenderBaseStats,
    defenderAtkBoost, defenderDefBoost, defenderSpaBoost, defenderSpdBoost, defenderSpeBoost,
    setDefenderAtkBoost, setDefenderDefBoost, setDefenderSpaBoost, setDefenderSpdBoost, setDefenderSpeBoost,
    defenderAbilityOptions, defenderKnownAbility, setDefenderKnownAbility,
    defenderKnownItem, setDefenderKnownItem, defenderKnownNature, setDefenderKnownNature,
    observations, addObservation, updateObservation, removeObservation,
    turnOrderObservations, addTurnOrderObservation, updateTurnOrderObservation, removeTurnOrderObservation,
    reverseObservations, addReverseObservation, updateReverseObservation, removeReverseObservation,
    inference,
    setAttackerMove, defenderMoves, setDefenderMove, yourMoveRanges, theirMoveRanges,
  } = liveCalcState;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500">
        Fill in the attacker and whatever's known about the opponent in the panels below, log each hit
        (either direction) or turn-order read you've seen in battle as an observation - the move grids
        above narrow live as you go, and the full result sits between them and the panels.
      </p>
      <div className="flex flex-wrap gap-3">
        <LiveCalcMoveRangeGrid
          title="Yours -> Them"
          moves={attacker.moves}
          ranges={yourMoveRanges}
          moveOptions={attackerMoveOptions}
          onChangeMove={setAttackerMove}
        />
        <LiveCalcMoveRangeGrid
          title="Theirs -> You"
          moves={defenderMoves}
          ranges={theirMoveRanges}
          moveOptions={defenderMoveOptions}
          onChangeMove={setDefenderMove}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <CalcPokemonPanel
          title="Attacker"
          state={attacker}
          speciesOptions={speciesOptions}
          itemOptions={itemOptions}
          abilityOptions={abilityOptions}
          natureOptions={natureOptions}
          formes={attackerFormes}
          baseStats={attackerBaseStats}
          boostedStats={attackerBoostedStats}
          natureEffect={attackerNatureEffect}
          teams={teamsState.teams}
          savedPokemonState={savedPokemonState}
          gameDataState={gameDataState}
          databaseState={databaseState}
          resolveSprite={spriteCacheState.resolveSprite}
          onChange={setAttacker}
        />
        <LiveCalcDefenderPanel
          gen={gen}
          species={defenderSpecies}
          level={defenderLevel}
          speciesOptions={speciesOptions}
          formes={defenderFormes}
          baseStats={defenderBaseStats}
          atkBoost={defenderAtkBoost}
          defBoost={defenderDefBoost}
          spaBoost={defenderSpaBoost}
          spdBoost={defenderSpdBoost}
          speBoost={defenderSpeBoost}
          abilityOptions={defenderAbilityOptions}
          itemOptions={itemOptions}
          natureOptions={natureOptions}
          knownAbility={defenderKnownAbility}
          knownItem={defenderKnownItem}
          knownNature={defenderKnownNature}
          onChangeSpecies={setDefenderSpecies}
          onChangeLevel={setDefenderLevel}
          onChangeAtkBoost={setDefenderAtkBoost}
          onChangeDefBoost={setDefenderDefBoost}
          onChangeSpaBoost={setDefenderSpaBoost}
          onChangeSpdBoost={setDefenderSpdBoost}
          onChangeSpeBoost={setDefenderSpeBoost}
          onChangeKnownAbility={setDefenderKnownAbility}
          onChangeKnownItem={setDefenderKnownItem}
          onChangeKnownNature={setDefenderKnownNature}
          inference={inference}
          liveCalcThreatPinsState={liveCalcThreatPinsState}
        />
        <LiveCalcObservationList
          title="Your Moves -> Them"
          emptyMessage="No observations yet - add one for each hit you've seen land on them."
          damageHpOwner="the opponent's"
          observations={observations}
          moveOptions={attackerMoveOptions}
          onAdd={addObservation}
          onUpdate={updateObservation}
          onRemove={removeObservation}
        />
        <LiveCalcObservationList
          title="Their Moves -> You"
          emptyMessage="No observations yet - add one for each hit their Pokémon has landed on you."
          damageHpOwner="your Pokémon's"
          observations={reverseObservations}
          moveOptions={defenderMoveOptions}
          onAdd={addReverseObservation}
          onUpdate={updateReverseObservation}
          onRemove={removeReverseObservation}
        />
        <LiveCalcTurnOrderList
          observations={turnOrderObservations}
          moveOptions={attackerMoveOptions}
          onAdd={addTurnOrderObservation}
          onUpdate={updateTurnOrderObservation}
          onRemove={removeTurnOrderObservation}
        />
      </div>
    </div>
  );
}
