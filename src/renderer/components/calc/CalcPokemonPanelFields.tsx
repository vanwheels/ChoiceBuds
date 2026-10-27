import type { NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import type { CalcPokemonState, NatureStatEffect } from '../../hooks/useDamageCalc';
import { STATUS_OPTIONS, STATUS_LABELS } from '../../hooks/useDamageCalc';
import type { FormeFamily } from '../../utils/calcFormes';
import type { SavedPokemonEntry, RegulationLabel } from '../../types/pokemon';
import type { ChampionsUsageEntry } from '../../types/gameData';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { UseVgcPastesCacheReturn } from '../../hooks/useVgcPastesCache';
import type { UseCalcRealSetsLookupReturn } from '../../hooks/useCalcRealSetsLookup';
import { normalizeSlug } from '../../utils/pokemonRules';
import { realSetBundleToCalcUpdates } from '../../utils/calcTeamImport';
import { resolveCalcPokemonSpriteUrl } from '../../utils/calcSpriteResolve';
import { getItemFallbackSpriteUrl, getItemSpriteUrl } from '../../utils/itemSprite';
import { getNatureEffect } from '../../config/vgcData';
import TooltipContent from '../TooltipContent';
import CalcAutocomplete from './CalcAutocomplete';
import NatureEffectLabel from './NatureEffectLabel';
import SavedSetPicker from '../SavedSetPicker';
import CalcStatRows from './CalcStatRows';
import CalcCurrentHp from './CalcCurrentHp';
import CalcStatSpreadChips from './CalcStatSpreadChips';
import CalcRealSetsSection from './CalcRealSetsSection';
import FormeToggle from './FormeToggle';

interface CalcPokemonPanelFieldsProps {
  state: CalcPokemonState;
  speciesOptions: string[];
  itemOptions: string[];
  abilityOptions: string[];
  legalAbilityOptions: string[];
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
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
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
  legalAbilityOptions,
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
  gameDataState,
  speciesRosterState,
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
  // Live preview only - Calc's own species text carries no national dex id
  // the way a saved Team/Box entry's pokedexNumber does, so this resolves
  // one on the fly against the shared roster (see utils/calcSpriteResolve.ts
  // for why a plain roster lookup alone isn't enough).
  const speciesSpriteUrl = resolveCalcPokemonSpriteUrl(
    state.species,
    state.gender,
    speciesRosterState.roster,
  );

  // Synchronous cache-only read (same convention as the item/ability
  // dropdowns' own usage ranking just below) - gameDataState.items is
  // already a background-warmed collection covering every VGC-legal item
  // (see useGameData.ts's own header comment), so this is cold only for the
  // brief window before that first background fetch completes.
  const itemData = state.item ? gameDataState.getCachedItem(state.item) : null;
  const itemFallbackSpriteUrl = state.item ? getItemFallbackSpriteUrl(state.item) : null;

  return (
    <>
      <div className="flex gap-2 items-end">
        <div
          className="w-9 h-9 shrink-0 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden"
          title={state.species || undefined}
        >
          {speciesSpriteUrl ? (
            <img
              src={resolveSprite(speciesSpriteUrl)}
              alt={state.species}
              loading="lazy"
              className="w-7 h-7 object-contain [image-rendering:pixelated]"
            />
          ) : (
            <span className="text-[9px] text-zinc-500">—</span>
          )}
        </div>
        <div className="flex-1 relative min-w-0">
          <CalcAutocomplete
            label="Species (Forme)"
            value={state.species}
            options={speciesOptions}
            placeholder="Search species..."
            onChange={(species) => onChange({ species })}
            onSelect={onSpeciesSelect}
            renderOptionIcon={(option) => {
              const url = resolveCalcPokemonSpriteUrl(option, '', speciesRosterState.roster);
              return url ? (
                <img
                  src={resolveSprite(url)}
                  alt=""
                  loading="lazy"
                  className="w-7 h-7 object-contain [image-rendering:pixelated]"
                />
              ) : null;
            }}
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
        <div className="flex gap-2 items-end">
          <div className="w-9 h-9 shrink-0 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden">
            {itemData?.spriteUrl ? (
              <img
                src={resolveSprite(itemData.spriteUrl)}
                alt={state.item}
                loading="lazy"
                className="w-6 h-6 object-contain [image-rendering:pixelated]"
              />
            ) : itemFallbackSpriteUrl ? (
              // Fairy Feather and the Champions-new Mega Stones have no
              // PokeAPI sprite - fall back to Serebii's itemdex sprite (see
              // CLAUDE.md exception), same as ItemSpriteBox.tsx.
              <img
                src={resolveSprite(itemFallbackSpriteUrl)}
                alt={state.item}
                loading="lazy"
                className="w-6 h-6 object-contain"
              />
            ) : state.item ? (
              <span className="text-sm leading-none" role="img" aria-label="Unknown item">
                🎒
              </span>
            ) : (
              <span className="text-[9px] text-zinc-500">—</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <CalcAutocomplete
              label="Item"
              value={state.item}
              options={itemOptions}
              placeholder="None"
              onChange={(item) => onChange({ item })}
              usagePercentByName={itemPercentByName}
              renderTooltip={(name) => (
                <TooltipContent
                  hoveredKey="item"
                  selectedItem={name}
                  itemData={gameDataState.getCachedItem(name)}
                  selectedAbility=""
                  abilityData={null}
                  selectedMoves={[]}
                  moveDataSlots={[]}
                  moveBoosts={[]}
                />
              )}
              renderOptionIcon={(option) => {
                const url = getItemSpriteUrl(
                  option,
                  gameDataState.getCachedItem(option)?.spriteUrl,
                );
                return url ? (
                  <img
                    src={resolveSprite(url)}
                    alt=""
                    loading="lazy"
                    className="w-6 h-6 object-contain [image-rendering:pixelated]"
                  />
                ) : null;
              }}
            />
          </div>
        </div>
        <CalcAutocomplete
          label="Ability"
          value={state.ability}
          options={abilityOptions}
          placeholder="None"
          onChange={(ability) => onChange({ ability })}
          usagePercentByName={abilityPercentByName}
          priorityOptions={legalAbilityOptions}
          renderTooltip={(name) => (
            <TooltipContent
              hoveredKey="ability"
              selectedItem=""
              itemData={null}
              selectedAbility={name}
              abilityData={gameDataState.getCachedAbility(name)}
              selectedMoves={[]}
              moveDataSlots={[]}
              moveBoosts={[]}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide flex gap-2">
            Nature
            <NatureEffectLabel nature={state.nature} />
          </label>
          <select
            value={state.nature}
            onChange={(e) => onChange({ nature: e.target.value as NatureName })}
            className="px-2 py-0.5 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
          >
            {sortedNatureOptions.map((n) => {
              const percent = naturePercentByName[normalizeSlug(n)];
              const effect = getNatureEffect(n);
              const effectText = effect ? ` +${effect.plus} −${effect.minus}` : '';
              return (
                <option key={n} value={n}>
                  {n}
                  {effectText}
                  {percent != null ? ` (${percent.toFixed(1)}%)` : ''}
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

      <CalcCurrentHp
        curHp={state.curHp}
        maxHp={boostedStats?.hp ?? null}
        onChange={(curHp) => onChange({ curHp })}
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
