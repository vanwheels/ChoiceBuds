/**
 * CalcPokemonPanel.tsx - One Pokémon's Damage Calc Config
 * Reused for both Pokémon - species/forme (unified autocomplete - typing an
 * exact regional/gendered forme name like "Ninetales-Alola" or "Meowstic-F"
 * selects it directly), gender (icon toggle matching PokemonCard.tsx in the
 * Teams tab), item, ability, nature, status, SPs, and stat boosts. Level has
 * no visible field (Live Calc Player/Opponent Card Redesign) - VGC is always
 * Lv50, so `state.level` stays whatever `defaultPokemonState()` set it to
 * rather than being user-editable here. No IV editor and no Tera type - the
 * real Champions calc's stat table only shows Base/SPs (IVs passed to the
 * engine fixed at max, see useDamageCalc), and Tera isn't modeled here
 * currently.
 *
 * Same-species alternate-stat-block formes (e.g. Aegislash Blade/Shield) get
 * their own in-panel toggle row below the top row; Mega Evolution's toggle
 * sits IN the top row, beside the species field (Live Calc Player/Opponent
 * Card Redesign) - see utils/calcFormes.ts for why regional/gendered forms
 * are deliberately excluded from either toggle (they're already
 * independently searchable). Moves live in CalcMoveGrid, not here.
 *
 * A real dropdown-list species selection (see handleSpeciesSelect - never a
 * mid-typing character) also auto-fills ability/item/nature/Stat-Points/
 * moves from the species' highest-usage Champions ranked-ladder entries
 * (services/championsBattleData.ts, same source as the Battle Logger's
 * "Likely Set" stat-inference popover), as a starting point the saved-set
 * picker or manual edits can still override. `autoFillRequestRef` guards
 * against a slower, now-superseded fetch clobbering a faster one if the user
 * swaps species again before the first request resolves.
 *
 * The fetched `ChampionsUsageEntry` is also kept in state (Regular Calc
 * Usage-Data Auto-Populate Leg 1) rather than discarded once the top-pick
 * auto-fill above applies - `applyUsageWeighting()` (utils/
 * liveCalcUsageWeighting.ts) re-ranks item/ability/nature/move against it on
 * every render, so the Item/Ability pickers and the Nature `<select>` show
 * every ranked alternative (with its ladder %), not just the #1 pick.
 * `moveOptions`/`onMoveUsageChange` exist purely for that ranking - the
 * actual move pickers live in the sibling CalcMoveGrid (rendered by
 * CalcPage, not here), so the computed move-percentage map is lifted up via
 * `onMoveUsageChange` rather than rendered in this component. Stat Points
 * don't fit that same annotate-a-dropdown shape (usage ranks whole 6-stat
 * spreads, not one stat at a time), so `usage.statSpreads` is instead
 * rendered as its own chip row below CalcStatRows (CalcStatSpreadChips.tsx,
 * Leg 2) - picking a chip writes all 6 `sps` values via `onChange({ sps })`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { DragEvent } from 'react';
import type { CalcPokemonState, NatureStatEffect } from '../../hooks/useDamageCalc';
import { STATUS_OPTIONS, STATUS_LABELS } from '../../hooks/useDamageCalc';
import type { FormeFamily } from '../../utils/calcFormes';
import type { NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import type { Team, SavedPokemonEntry, ImportedPokemonInfo, OpponentPokemonEntry } from '../../types/pokemon';
import type { ChampionsUsageEntry } from '../../types/gameData';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import { CALC_TEAM_POKEMON_DRAG_TYPE, type CalcTeamPokemonDragPayload } from '../../utils/calcDragTypes';
import { getMegaAbility } from '../../config/megaAbilities';
import { teamPokemonToCalcUpdates, opponentEntryToCalcUpdates } from '../../utils/calcTeamImport';
import { calcStateToShowdownPokemon } from '../../utils/calcExport';
import { enrichPokemonWithAPI } from '../../services/pokeapi';
import { formatShowdownText } from '../../services/parser';
import { applyUsageWeighting, type UsageRankedCandidate } from '../../utils/liveCalcUsageWeighting';
import { normalizeSlug } from '../../utils/pokemonRules';
import CalcAutocomplete from './CalcAutocomplete';
import SavedSetPicker from '../SavedSetPicker';
import SaveToLibraryDialog from '../SaveToLibraryDialog';
import CalcStatRows from './CalcStatRows';
import CalcStatSpreadChips from './CalcStatSpreadChips';
import CalcTeamTray from './CalcTeamTray';
import CalcOpponentTray from './CalcOpponentTray';
import FormeToggle from './FormeToggle';

interface CalcPokemonPanelProps {
  title: string;
  state: CalcPokemonState;
  speciesOptions: string[];
  itemOptions: string[];
  abilityOptions: string[];
  natureOptions: NatureName[];
  /** This panel's own move-slot options (CalcPage's pokemon1MoveOptions/pokemon2MoveOptions) - used only to rank the move axis via applyUsageWeighting(); the move pickers themselves live in the sibling CalcMoveGrid, not here. */
  moveOptions: string[];
  formes: FormeFamily;
  baseStats: StatsTable | null;
  boostedStats: StatsTable | null;
  natureEffect: NatureStatEffect;
  teams: Team[];
  /** The current Battle Log session's live opponent roster, if any (see App.tsx's battleLogSession doc) - renders CalcOpponentTray when non-empty, omitted/empty otherwise. */
  opponentRoster?: OpponentPokemonEntry[];
  /** Reports the id of whichever opponent-roster entry this panel's tray just loaded - only passed to the Pokemon 2 panel (see CalcPage.tsx's linkedEntryId), since Calc's write-back link is scoped to that slot. Omitted on the Pokemon 1 panel, where loading an opponent is informational only. */
  onLoadOpponentEntry?: (entryId: string) => void;
  savedPokemonState: UseSavedPokemonReturn;
  gameDataState: UseGameDataReturn;
  databaseState: UseDatabaseReturn;
  resolveSprite: (remoteUrl: string) => string;
  onChange: (updates: Partial<CalcPokemonState>) => void;
  /** Lifts this panel's usage-ranked move percentages (keyed by normalizeSlug(name)) up to CalcPage, which forwards them into the sibling CalcMoveGrid - see this file's header comment. */
  onMoveUsageChange?: (percentByName: Record<string, number>) => void;
}

const CONFIRMATION_MS = 2000;

const GENDER_CYCLE: Array<CalcPokemonState['gender']> = ['M', 'F', ''];

export default function CalcPokemonPanel({
  title, state, speciesOptions, itemOptions, abilityOptions, natureOptions, moveOptions, formes, baseStats, boostedStats, natureEffect,
  teams, opponentRoster, onLoadOpponentEntry, savedPokemonState, gameDataState, databaseState, resolveSprite, onChange, onMoveUsageChange,
}: CalcPokemonPanelProps) {
  const [savedSetPickerSpecies, setSavedSetPickerSpecies] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // Enrichment happens on click (as before) so this always has a real
  // pokedexNumber/sprite to show; the name-prompt dialog only opens once
  // that's ready, and the actual addSavedPokemonBatch write waits for the
  // user's confirmed name (Save-to-Library Name Prompt Leg 1, see TODO.md).
  const [pendingSave, setPendingSave] = useState<ImportedPokemonInfo | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const autoFillRequestRef = useRef(0);
  // Remembers the ability that was active right before Mega-ing, keyed to
  // the forme family it was captured for, so toggling back off restores it
  // instead of leaving the Mega-forced ability stuck. Keying on formes.root
  // (rather than always trusting a non-null ref) guards against a stale
  // value surviving an unrelated species swap made while still Mega'd.
  const preMegaAbilityRef = useRef<{ root: string; ability: string } | null>(null);

  // Kept in state (rather than discarded once applied below) so the
  // Item/Ability pickers and Nature select can keep re-ranking against it on
  // every render - see this file's header comment.
  const [usage, setUsage] = useState<ChampionsUsageEntry | null>(null);

  const autoFillFromUsage = async (species: string) => {
    const requestId = ++autoFillRequestRef.current;
    setUsage(null); // clear the previous species' usage immediately so no stale ranking briefly shows while this fetch is in flight
    const usageEntry = await gameDataState.getChampionsUsage(species);
    if (autoFillRequestRef.current !== requestId) return;
    setUsage(usageEntry);
    if (!usageEntry) return;

    const updates: Partial<CalcPokemonState> = {};
    if (usageEntry.abilities[0]) updates.ability = usageEntry.abilities[0].name;
    if (usageEntry.items[0]) updates.item = usageEntry.items[0].name;
    if (usageEntry.natures[0]) updates.nature = usageEntry.natures[0].name as NatureName;
    if (usageEntry.statSpreads[0]) updates.sps = usageEntry.statSpreads[0].points;
    if (usageEntry.moves.length > 0) {
      updates.moves = Array.from({ length: 4 }, (_, i) => ({ name: usageEntry.moves[i]?.name ?? '', isCrit: false }));
    }
    onChange(updates);
  };

  // Re-ranks all 4 dropdown-shaped axes against the kept usage state above -
  // a no-op mirror of the base option lists when usage is null (species not
  // yet picked, or no ranked-ladder page for it at all).
  const weighted = useMemo(() => applyUsageWeighting({
    natureCandidates: natureOptions,
    abilityCandidates: abilityOptions,
    itemCandidates: itemOptions,
    moveCandidates: moveOptions,
    natureUsageCandidates: [], abilityUsageCandidates: [], itemUsageCandidates: [], moveUsageCandidates: [],
  }, usage), [usage, natureOptions, abilityOptions, itemOptions, moveOptions]);

  // percentage: 0 only ever means "no reliable data" here (either usage is
  // null entirely, or rankCandidates()'s never-empty-axis fallback) - a
  // real observed ladder % is never rounded to exactly 0, so this is a safe
  // way to tell "don't badge/reorder this" apart from a genuine low %.
  const percentByName = (candidates: UsageRankedCandidate[]): Record<string, number> =>
    Object.fromEntries(candidates.filter(c => c.percentage > 0).map(c => [normalizeSlug(c.value), c.percentage]));

  const abilityPercentByName = useMemo(() => percentByName(weighted.abilityUsageCandidates), [weighted.abilityUsageCandidates]);
  const itemPercentByName = useMemo(() => percentByName(weighted.itemUsageCandidates), [weighted.itemUsageCandidates]);
  const naturePercentByName = useMemo(() => percentByName(weighted.natureUsageCandidates), [weighted.natureUsageCandidates]);
  const movePercentByName = useMemo(() => percentByName(weighted.moveUsageCandidates), [weighted.moveUsageCandidates]);

  useEffect(() => { onMoveUsageChange?.(movePercentByName); }, [movePercentByName, onMoveUsageChange]);

  // Nature's native <select> can't render a styled badge inside an <option>
  // (browsers only show its plain text), so the ranked % is appended to the
  // label itself instead, most-used-first like the other axes.
  const sortedNatureOptions = useMemo(
    () => [...natureOptions].sort((a, b) => (naturePercentByName[normalizeSlug(b)] ?? -1) - (naturePercentByName[normalizeSlug(a)] ?? -1)),
    [natureOptions, naturePercentByName]
  );

  // Only fires on a real dropdown-list click (see CalcAutocomplete.tsx's
  // onSelect), never while typing - species is already applied via onChange
  // immediately either way, this decides whether to also offer a saved-set
  // choice for what was just picked, and kicks off the usage-based auto-fill
  // as a starting point (the saved-set picker, if opened, can still override
  // it below).
  const handleSpeciesSelect = (species: string) => {
    const sets = savedPokemonState.getSavedSetsForSpecies(species);
    if (sets.length > 0) setSavedSetPickerSpecies(species);
    autoFillFromUsage(species);
  };

  // Click handler for CalcOpponentTray - applies whatever the opponent entry
  // actually reveals (species always, ability/item/moves only once seen)
  // immediately, then layers a usage-based guess on top for exactly the
  // fields a battle log can never reveal (nature, Stat Points) plus
  // ability/item only if the opponent tile hasn't shown them yet - unlike
  // autoFillFromUsage's fresh-species case, a known revealed value must
  // never be clobbered by a generic top-of-ladder pick.
  const handleLoadOpponent = async (entry: OpponentPokemonEntry) => {
    onChange(opponentEntryToCalcUpdates(entry));
    onLoadOpponentEntry?.(entry.id);
    const requestId = ++autoFillRequestRef.current;
    setUsage(null);
    const usageEntry = await gameDataState.getChampionsUsage(entry.species);
    if (autoFillRequestRef.current !== requestId) return;
    setUsage(usageEntry);
    if (!usageEntry) return;

    const updates: Partial<CalcPokemonState> = {};
    if (usageEntry.natures[0]) updates.nature = usageEntry.natures[0].name as NatureName;
    if (usageEntry.statSpreads[0]) updates.sps = usageEntry.statSpreads[0].points;
    if (!entry.ability && usageEntry.abilities[0]) updates.ability = usageEntry.abilities[0].name;
    if (!entry.item && usageEntry.items[0]) updates.item = usageEntry.items[0].name;
    onChange(updates);
  };

  const handlePickSavedSet = (entry: SavedPokemonEntry) => {
    onChange(teamPokemonToCalcUpdates(entry.pokemon));
    setSavedSetPickerSpecies(null);
  };

  const handleCopyText = async () => {
    if (!state.species) return;
    await navigator.clipboard.writeText(formatShowdownText([calcStateToShowdownPokemon(state)]));
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), CONFIRMATION_MS);
  };

  const handleSaveSet = async () => {
    if (!state.species || isSaving) return;
    setIsSaving(true);
    try {
      const enriched = await enrichPokemonWithAPI(
        calcStateToShowdownPokemon(state), databaseState.getCachedEntry, databaseState.setCacheEntry
      );
      setPendingSave(enriched);
    } catch (err) {
      console.error('Error saving Calc Pokemon as a set:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSave = async (label: string): Promise<boolean> => {
    if (!pendingSave) return false;
    const success = await savedPokemonState.addSavedPokemonBatch([pendingSave], [label]);
    if (success) {
      setPendingSave(null);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), CONFIRMATION_MS);
    }
    return success;
  };

  const cycleGender = () => {
    const currentIndex = GENDER_CYCLE.indexOf(state.gender);
    const next = GENDER_CYCLE[(currentIndex + 1) % GENDER_CYCLE.length];
    onChange({ gender: next });
  };

  const megaGroup = formes.megaFormes.length > 0 ? [formes.root, ...formes.megaFormes] : [];

  // Accepts a drag from either panel's own CalcTeamTray (or the other panel's -
  // dragging across sides is a deliberate way to quick-swap which Pokemon
  // loads into which slot, unlike a click which always targets its own tray).
  const handleDrop = (e: DragEvent) => {
    const raw = e.dataTransfer.getData(CALC_TEAM_POKEMON_DRAG_TYPE);
    if (!raw) return;
    e.preventDefault();
    try {
      const payload: CalcTeamPokemonDragPayload = JSON.parse(raw);
      const team = teams.find(t => t.id === payload.teamId);
      const pokemon = team?.pokemon[payload.pokemonIndex];
      if (pokemon) onChange(teamPokemonToCalcUpdates(pokemon));
    } catch {
      // malformed/foreign drag payload - ignore
    }
  };

  return (
    <div
      className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2"
      onDragOver={(e) => { if (e.dataTransfer.types.includes(CALC_TEAM_POKEMON_DRAG_TYPE)) e.preventDefault(); }}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleCopyText}
            disabled={!state.species}
            title="Copy as Showdown text"
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {justCopied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            type="button"
            onClick={handleSaveSet}
            disabled={!state.species || isSaving}
            title="Save to Saved Sets"
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {justSaved ? 'Saved!' : isSaving ? 'Saving...' : 'Save Set'}
          </button>
        </div>
      </div>

      <CalcTeamTray teams={teams} resolveSprite={resolveSprite} onLoadPokemon={(p) => onChange(teamPokemonToCalcUpdates(p))} />
      {opponentRoster && (
        <CalcOpponentTray opponentRoster={opponentRoster} resolveSprite={resolveSprite} onLoadPokemon={handleLoadOpponent} />
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1 relative min-w-0">
          <CalcAutocomplete
            label="Species (Forme)"
            value={state.species}
            options={speciesOptions}
            placeholder="Search species..."
            onChange={(species) => onChange({ species })}
            onSelect={handleSpeciesSelect}
          />
          {savedSetPickerSpecies && (
            <SavedSetPicker
              species={savedSetPickerSpecies}
              sets={savedPokemonState.getSavedSetsForSpecies(savedSetPickerSpecies)}
              resolveSprite={resolveSprite}
              onPick={handlePickSavedSet}
              onBlank={() => setSavedSetPickerSpecies(null)}
              onClose={() => setSavedSetPickerSpecies(null)}
            />
          )}
        </div>
        {megaGroup.length > 0 && (
          <FormeToggle
            group={megaGroup}
            current={state.species}
            onSelect={(species) => {
              const megaAbility = getMegaAbility(species.toLowerCase());
              if (megaAbility) {
                if (preMegaAbilityRef.current?.root !== formes.root) {
                  preMegaAbilityRef.current = { root: formes.root, ability: state.ability };
                }
                onChange({ species, ability: megaAbility });
              } else {
                const revert = preMegaAbilityRef.current?.root === formes.root ? preMegaAbilityRef.current.ability : null;
                preMegaAbilityRef.current = null;
                onChange(revert !== null ? { species, ability: revert } : { species });
              }
            }}
          />
        )}
        <div
          className="w-9 h-9 shrink-0 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent-gold transition-colors"
          onClick={cycleGender}
          title="Click to toggle gender"
        >
          {state.gender === 'M' && <span className="text-lg font-bold text-blue-400">♂</span>}
          {state.gender === 'F' && <span className="text-lg font-bold text-pink-400">♀</span>}
          {state.gender === '' && <span className="text-lg font-bold text-zinc-400">⌀</span>}
        </div>
      </div>

      {formes.statFormes.length > 1 && (
        <FormeToggle group={formes.statFormes} current={state.species} onSelect={(species) => onChange({ species })} />
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
            {sortedNatureOptions.map(n => {
              const percent = naturePercentByName[normalizeSlug(n)];
              return <option key={n} value={n}>{percent != null ? `${n} (${percent.toFixed(1)}%)` : n}</option>;
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
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
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

      <AnimatePresence>
        {pendingSave && (
          <SaveToLibraryDialog
            pokemon={pendingSave}
            resolveSprite={resolveSprite}
            onSave={handleConfirmSave}
            onClose={() => setPendingSave(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
