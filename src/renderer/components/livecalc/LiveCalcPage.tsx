/**
 * LiveCalcPage.tsx - Live Calc Tab (Live Calc Tab Shell - Leg 2)
 * Plumbing only, per TODO.md's own scope for this leg: attacker entry,
 * defender species+level, and an add/remove observation list all wire
 * through to Leg 1's `inferDefenderStats()` engine end-to-end, but the
 * result display below is a raw/unstyled preview - Live Calc Results
 * Display (Leg 3) is what turns this into the real per-stat range /
 * candidate-narrowing UI.
 *
 * useLiveCalc (and the @smogon/calc import it pulls in) is instantiated
 * here rather than in App.tsx, same reasoning as CalcPage.tsx's own header
 * comment - keeps this whole module behind App.tsx's React.lazy() boundary.
 */

import { useLiveCalc } from '../../hooks/useLiveCalc';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseSettingsReturn } from '../../hooks/useSettings';
import { toRegulationId } from '../../utils/pokemonRules';
import CalcPokemonPanel from '../calc/CalcPokemonPanel';
import LiveCalcDefenderPanel from './LiveCalcDefenderPanel';
import LiveCalcObservationList from './LiveCalcObservationList';

interface LiveCalcPageProps {
  gameDataState: UseGameDataReturn;
  teamsState: UseTeamsReturn;
  databaseState: UseDatabaseReturn;
  savedPokemonState: UseSavedPokemonReturn;
  spriteCacheState: UseSpriteCacheReturn;
  settingsState: UseSettingsReturn;
}

export default function LiveCalcPage({
  gameDataState, teamsState, databaseState, savedPokemonState, spriteCacheState, settingsState,
}: LiveCalcPageProps) {
  const liveCalcState = useLiveCalc(gameDataState, toRegulationId(settingsState.settings.defaultRegulation));
  const {
    attacker, setAttacker,
    speciesOptions, itemOptions, abilityOptions, natureOptions,
    attackerFormes, attackerBaseStats, attackerBoostedStats, attackerNatureEffect, attackerMoveOptions,
    defenderSpecies, defenderLevel, setDefenderSpecies, setDefenderLevel,
    observations, addObservation, updateObservation, removeObservation,
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
          onChangeSpecies={setDefenderSpecies}
          onChangeLevel={setDefenderLevel}
        />
        <LiveCalcObservationList
          observations={observations}
          moveOptions={attackerMoveOptions}
          onAdd={addObservation}
          onUpdate={updateObservation}
          onRemove={removeObservation}
        />
      </div>

      {/* Raw plumbing-confirmation preview - Leg 3 replaces this with the
          real result display (per-stat SP range, narrowed candidate lists,
          confidence indication). */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-400 flex flex-col gap-1">
        <p>Def SP: {inference.defBound.min}-{inference.defBound.max} ({inference.physicalObservationCount} physical obs.)</p>
        <p>Sp. Def SP: {inference.spdBound.min}-{inference.spdBound.max} ({inference.specialObservationCount} special obs.)</p>
        <p>Natures: {inference.natureCandidates.length}</p>
        <p>Abilities: {inference.abilityCandidates.join(', ') || '—'}</p>
        <p>Items: {inference.itemCandidates.join(', ') || '—'}</p>
        {inference.contradictions.length > 0 && (
          <div className="text-amber-400">
            {inference.contradictions.map((note, i) => <p key={i}>{note}</p>)}
          </div>
        )}
      </div>
    </div>
  );
}
