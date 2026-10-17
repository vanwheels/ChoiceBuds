import type { NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import type { CalcPokemonState, NatureStatEffect } from '../../hooks/useDamageCalc';
import { STATUS_OPTIONS, STATUS_LABELS } from '../../hooks/useDamageCalc';
import type { FormeFamily } from '../../utils/calcFormes';
import type { SavedPokemonEntry, RegulationLabel } from '../../types/pokemon';
import type { ChampionsUsageEntry } from '../../types/gameData';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { UseVgcPastesCacheReturn } from '../../hooks/useVgcPastesCache';
import type { UseCalcRealSetsLookupReturn } from '../../hooks/useCalcRealSetsLookup';
import { normalizeSlug } from '../../utils/pokemonRules';
import { realSetBundleToCalcUpdates } from '../../utils/calcTeamImport';
import CalcAutocomplete from './CalcAutocomplete';
import SavedSetPicker from '../SavedSetPicker';
import CalcStatRows from './CalcStatRows';
import CalcStatSpreadChips from './CalcStatSpreadChips';
import CalcRealSetsSection from './CalcRealSetsSection';
import FormeToggle from './FormeToggle';

interface CalcPokemonPanelFieldsProps {
  state: CalcPokemonState;
  speciesOptions: string[];
  itemOptions: string[];
  abilityOptions: string[];
  sortedNatureOptions: NatureName[];
  formes: FormeFamily;
  megaGroup: string[];
  baseStats: StatsTable | null;
  boostedStats: StatsTable | null;
  natureEffect: NatureStatEffect;
  usage: ChampionsUsageEntry | null;
  itemPercentByName: Record<string, number>;
  abilityPercentByName: Record<string, number>;
  naturePercentByName: Record<string, number>;
  savedSetPickerSpecies: string | null;
  savedPokemonState: UseSavedPokemonReturn;
  resolveSprite: (remoteUrl: string) => string;
  regulation: RegulationLabel;
  vgcPastesState: UseVgcPastesCacheReturn;
  realSets: UseCalcRealSetsLookupReturn;
  onChange: (updates: Partial<CalcPokemonState>) => void;
  onSpeciesSelect: (species: string) => void;
  onPickSavedSet: (entry: SavedPokemonEntry) => void;
  onCloseSavedSetPicker: () => void;
  onMegaToggle: (species: string) => void;
  onCycleGender: () => void;
}

// SPECIES/CONFIG FIELDS - split out of CalcPokemonPanel.tsx (File Cap Splits:
// CalcPokemonPanel.tsx, see TODO.md) with no behavior change. All state and
// handlers stay in CalcPokemonPanel.tsx; this is a pure JSX extraction, same
// split shape as TeamCard.tsx/BoxPage.tsx's earlier splits.
export default function CalcPokemonPanelFields({
  state,
  speciesOptions,
  itemOptions,
  abilityOptions,
  sortedNatureOptions,
  formes,
  megaGroup,
  baseStats,
  boostedStats,
  natureEffect,
  usage,
  itemPercentByName,
  abilityPercentByName,
  naturePercentByName,
  savedSetPickerSpecies,
  savedPokemonState,
  resolveSprite,
  regulation,
  vgcPastesState,
  realSets,
  onChange,
  onSpeciesSelect,
  onPickSavedSet,
  onCloseSavedSetPicker,
  onMegaToggle,
  onCycleGender,
}: CalcPokemonPanelFieldsProps) {
  return (
    <>
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative min-w-0">
          <CalcAutocomplete
            label="Species (Forme)"
            value={state.species}
            options={speciesOptions}
            placeholder="Search species..."
            onChange={(species) => onChange({ species })}
            onSelect={onSpeciesSelect}
          />
          {savedSetPickerSpecies && (
            <SavedSetPicker
              species={savedSetPickerSpecies}
              sets={savedPokemonState.getSavedSetsForSpecies(savedSetPickerSpecies)}
              resolveSprite={resolveSprite}
              onPick={onPickSavedSet}
              onBlank={onCloseSavedSetPicker}
              onClose={onCloseSavedSetPicker}
            />
          )}
        </div>
        {megaGroup.length > 0 && (
          <FormeToggle group={megaGroup} current={state.species} onSelect={onMegaToggle} />
        )}
        <div
          className="w-9 h-9 shrink-0 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent-gold transition-colors"
          onClick={onCycleGender}
          title="Click to toggle gender"
        >
          {state.gender === 'M' && <span className="text-lg font-bold text-blue-400">♂</span>}
          {state.gender === 'F' && <span className="text-lg font-bold text-pink-400">♀</span>}
          {state.gender === '' && <span className="text-lg font-bold text-zinc-400">⌀</span>}
        </div>
      </div>

      {formes.statFormes.length > 1 && (
        <FormeToggle
          group={formes.statFormes}
          current={state.species}
          onSelect={(species) => onChange({ species })}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <CalcAutocomplete
          label="Item"
          value={state.item}
          options={itemOptions}
          placeholder="None"
          onChange={(item) => onChange({ item })}
          usagePercentByName={itemPercentByName}
        />
        <CalcAutocomplete
          label="Ability"
          value={state.ability}
          options={abilityOptions}
          placeholder="None"
          onChange={(ability) => onChange({ ability })}
          usagePercentByName={abilityPercentByName}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Nature</label>
          <select
            value={state.nature}
            onChange={(e) => onChange({ nature: e.target.value as NatureName })}
            className="px-2 py-0.5 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
          >
            {sortedNatureOptions.map((n) => {
              const percent = naturePercentByName[normalizeSlug(n)];
              return (
                <option key={n} value={n}>
                  {percent != null ? `${n} (${percent.toFixed(1)}%)` : n}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Status</label>
          <select
            value={state.status}
            onChange={(e) => onChange({ status: e.target.value as CalcPokemonState['status'] })}
            className="px-2 py-0.5 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
          >
            <option value="">Healthy</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CalcStatRows
        baseStats={baseStats}
        boostedStats={boostedStats}
        sps={state.sps}
        boosts={state.boosts}
        natureEffect={natureEffect}
        onChangeSp={(key, value) => onChange({ sps: { ...state.sps, [key]: value } })}
        onChangeBoost={(key, value) => onChange({ boosts: { ...state.boosts, [key]: value } })}
      />

      {usage && (
        <CalcStatSpreadChips
          statSpreads={usage.statSpreads}
          currentSps={state.sps}
          onSelect={(sps) => onChange({ sps })}
        />
      )}

      {state.species && (
        <CalcRealSetsSection
          species={state.species}
          regulation={regulation}
          hasCatalogRows={vgcPastesState.getRows(regulation).length > 0}
          isCatalogRefreshing={vgcPastesState.isRefreshing}
          onRefreshCatalog={() => realSets.refreshCatalogAndRetry(state.species)}
          entry={realSets.entry}
          isLoading={realSets.isLoading}
          progress={realSets.progress}
          error={realSets.error}
          onPickBundle={(bundle) => onChange(realSetBundleToCalcUpdates(bundle))}
        />
      )}
    </>
  );
}
