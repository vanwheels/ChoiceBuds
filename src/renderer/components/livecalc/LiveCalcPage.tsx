/**
 * LiveCalcPage.tsx - Live Calc Tab
 * Attacker entry, opponent species+level+known-facts, and three add/remove
 * observation lists (damage% into them, damage% into you, turn-order) wire
 * through to `inferDefenderStats()`, `inferOpponentOffensiveStats()` (Live
 * Calc Page Layout & Function Rework - Leg 1), and `inferDefenderSpeed()`
 * (Leg 15), with LiveCalcResultPanel (Live Calc Results Display - Leg 3)
 * presenting the narrowed result: per-stat SP ranges (Def/SpD/Speed today -
 * Atk/SpA already narrow under the hood via Leg 1's engine pass, but aren't
 * surfaced here yet, since that's this rework's own Leg 3) and
 * nature/ability/item candidate lists with their own certainty indication.
 * The two damage% lists are the same `LiveCalcObservationList` component
 * rendered twice with different labels (Leg 2) - see that file's header for
 * why they share one component instead of a near-duplicate.
 *
 * useLiveCalc (and the @smogon/calc import it pulls in) is instantiated
 * here rather than in App.tsx, same reasoning as CalcPage.tsx's own header
 * comment - keeps this whole module behind App.tsx's React.lazy() boundary.
 *
 * `liveCalcThreatPinsState` (Live Calc -> Speed Tiers Tie-in, Leg 6) is the
 * one piece of this tab's state that isn't local, since it's read back by
 * the sibling Speed Tiers tab - see hooks/useLiveCalcThreatPins.ts.
 *
 * The one-line intro paragraph above the panels (Live Calc Result Clarity
 * Pass) states the tab's actual 3-step flow up front - enter knowns, log
 * observations, read the result below - since per feedback the tab wasn't
 * self-explanatory to a first-time reader without it.
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
import LiveCalcResultPanel from './LiveCalcResultPanel';

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
  } = liveCalcState;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-zinc-500">
        Fill in the attacker and whatever's known about the opponent below, log each hit (either direction)
        or turn-order read you've seen in battle as an observation, then read the narrowed result at the
        bottom of the page.
      </p>
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

      <LiveCalcResultPanel
        gen={gen}
        defenderSpecies={defenderSpecies}
        defenderLevel={defenderLevel}
        inference={inference}
        liveCalcThreatPinsState={liveCalcThreatPinsState}
      />
    </div>
  );
}
