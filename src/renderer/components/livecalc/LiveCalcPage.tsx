/**
 * LiveCalcPage.tsx - Live Calc Tab
 * Attacker entry, defender species+level, and two add/remove observation
 * lists (damage% and turn-order) wire through to Leg 1's
 * `inferDefenderStats()` and Leg 15's `inferDefenderSpeed()` engines, with
 * LiveCalcResultPanel (Live Calc Results Display - Leg 3) presenting the
 * narrowed result: per-stat SP ranges (Def/SpD/Speed) and nature/ability/item
 * candidate lists with their own certainty indication.
 *
 * useLiveCalc (and the @smogon/calc import it pulls in) is instantiated
 * here rather than in App.tsx, same reasoning as CalcPage.tsx's own header
 * comment - keeps this whole module behind App.tsx's React.lazy() boundary.
 *
 * `liveCalcThreatPinsState` (Live Calc -> Speed Tiers Tie-in, Leg 6) is the
 * one piece of this tab's state that isn't local, since it's read back by
 * the sibling Speed Tiers tab - see hooks/useLiveCalcThreatPins.ts.
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
    defenderSpecies, defenderLevel, setDefenderSpecies, setDefenderLevel, defenderFormes, defenderBaseStats,
    defenderDefBoost, defenderSpdBoost, setDefenderDefBoost, setDefenderSpdBoost,
    defenderAbilityOptions, defenderKnownAbility, setDefenderKnownAbility,
    observations, addObservation, updateObservation, removeObservation,
    turnOrderObservations, addTurnOrderObservation, updateTurnOrderObservation, removeTurnOrderObservation,
    inference,
  } = liveCalcState;

  return (
    <div className="flex flex-col gap-2">
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
          defBoost={defenderDefBoost}
          spdBoost={defenderSpdBoost}
          abilityOptions={defenderAbilityOptions}
          knownAbility={defenderKnownAbility}
          onChangeSpecies={setDefenderSpecies}
          onChangeLevel={setDefenderLevel}
          onChangeDefBoost={setDefenderDefBoost}
          onChangeSpdBoost={setDefenderSpdBoost}
          onChangeKnownAbility={setDefenderKnownAbility}
        />
        <LiveCalcObservationList
          observations={observations}
          moveOptions={attackerMoveOptions}
          onAdd={addObservation}
          onUpdate={updateObservation}
          onRemove={removeObservation}
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
