/**
 * CalcPokemonPanel.tsx - One Pokémon's Damage Calc Config
 * Reused for both Pokémon - species/forme (unified autocomplete - typing an
 * exact regional/gendered forme name like "Ninetales-Alola" or "Meowstic-F"
 * selects it directly), level, gender (icon toggle matching PokemonCard.tsx
 * in the Teams tab), item, ability, nature, status, SPs, and stat boosts.
 * No IV editor and no Tera type - the real Champions calc's stat table only
 * shows Base/SPs (IVs passed to the engine fixed at max, see
 * useDamageCalc), and Tera isn't modeled here currently.
 *
 * Same-species alternate-stat-block formes (e.g. Aegislash Blade/Shield) and
 * Mega Evolution get their own in-panel toggle rows instead of requiring a
 * fresh species search - see utils/calcFormes.ts for why regional/gendered
 * forms are deliberately excluded from this (they're already independently
 * searchable). Moves live in CalcMoveGrid, not here.
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import type { CalcPokemonState, NatureStatEffect } from '../../hooks/useDamageCalc';
import { STATUS_OPTIONS } from '../../hooks/useDamageCalc';
import type { FormeFamily } from '../../utils/calcFormes';
import { formeDisplayLabel } from '../../utils/calcFormes';
import type { NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import type { Team, SavedPokemonEntry } from '../../types/pokemon';
import type { UseSavedPokemonReturn } from '../../hooks/useSavedPokemon';
import { CALC_TEAM_POKEMON_DRAG_TYPE, type CalcTeamPokemonDragPayload } from '../../utils/calcDragTypes';
import { teamPokemonToCalcUpdates } from '../../utils/calcTeamImport';
import CalcAutocomplete from './CalcAutocomplete';
import CalcSavedSetPicker from './CalcSavedSetPicker';
import CalcStatRows from './CalcStatRows';
import CalcTeamTray from './CalcTeamTray';

interface CalcPokemonPanelProps {
  title: string;
  state: CalcPokemonState;
  speciesOptions: string[];
  itemOptions: string[];
  abilityOptions: string[];
  natureOptions: NatureName[];
  formes: FormeFamily;
  baseStats: StatsTable | null;
  boostedStats: StatsTable | null;
  natureEffect: NatureStatEffect;
  teams: Team[];
  savedPokemonState: UseSavedPokemonReturn;
  resolveSprite: (remoteUrl: string) => string;
  onChange: (updates: Partial<CalcPokemonState>) => void;
}

const STATUS_LABELS: Record<string, string> = {
  slp: 'Asleep', psn: 'Poisoned', brn: 'Burned', frz: 'Frozen', par: 'Paralyzed', tox: 'Badly Poisoned',
};

const GENDER_CYCLE: Array<CalcPokemonState['gender']> = ['M', 'F', ''];

function FormeToggle({ group, current, onSelect }: { group: string[]; current: string; onSelect: (name: string) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {group.map(name => (
        <button
          key={name}
          type="button"
          onClick={() => onSelect(name)}
          className={`px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
            current === name ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {formeDisplayLabel(group, name)}
        </button>
      ))}
    </div>
  );
}

export default function CalcPokemonPanel({
  title, state, speciesOptions, itemOptions, abilityOptions, natureOptions, formes, baseStats, boostedStats, natureEffect,
  teams, savedPokemonState, resolveSprite, onChange,
}: CalcPokemonPanelProps) {
  const [savedSetPickerSpecies, setSavedSetPickerSpecies] = useState<string | null>(null);

  // Only fires on a real dropdown-list click (see CalcAutocomplete.tsx's
  // onSelect), never while typing - species is already applied via onChange
  // immediately either way, this just decides whether to also offer a
  // saved-set choice for what was just picked.
  const handleSpeciesSelect = (species: string) => {
    const sets = savedPokemonState.getSavedSetsForSpecies(species);
    if (sets.length > 0) setSavedSetPickerSpecies(species);
  };

  const handlePickSavedSet = (entry: SavedPokemonEntry) => {
    onChange(teamPokemonToCalcUpdates(entry.pokemon));
    setSavedSetPickerSpecies(null);
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
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>

      <CalcTeamTray teams={teams} resolveSprite={resolveSprite} onLoadPokemon={(p) => onChange(teamPokemonToCalcUpdates(p))} />

      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <CalcAutocomplete
            label="Species (Forme)"
            value={state.species}
            options={speciesOptions}
            placeholder="Search species..."
            onChange={(species) => onChange({ species })}
            onSelect={handleSpeciesSelect}
          />
          {savedSetPickerSpecies && (
            <CalcSavedSetPicker
              species={savedSetPickerSpecies}
              sets={savedPokemonState.getSavedSetsForSpecies(savedSetPickerSpecies)}
              resolveSprite={resolveSprite}
              onPick={handlePickSavedSet}
              onClose={() => setSavedSetPickerSpecies(null)}
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Lv</label>
          <input
            type="number"
            min={1}
            max={100}
            value={state.level}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onChange({ level: Math.max(1, Math.min(100, parsed)) });
            }}
            className="w-14 px-1 py-0.5 text-sm text-center bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
          />
        </div>
        <div
          className="w-9 h-9 shrink-0 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
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
      {megaGroup.length > 0 && (
        <FormeToggle group={megaGroup} current={state.species} onSelect={(species) => onChange({ species })} />
      )}

      <div className="grid grid-cols-2 gap-2">
        <CalcAutocomplete
          label="Item"
          value={state.item}
          options={itemOptions}
          placeholder="None"
          onChange={(item) => onChange({ item })}
        />
        <CalcAutocomplete
          label="Ability"
          value={state.ability}
          options={abilityOptions}
          placeholder="None"
          onChange={(ability) => onChange({ ability })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Nature</label>
          <select
            value={state.nature}
            onChange={(e) => onChange({ nature: e.target.value as NatureName })}
            className="px-2 py-0.5 text-sm bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
          >
            {natureOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Status</label>
          <select
            value={state.status}
            onChange={(e) => onChange({ status: e.target.value as CalcPokemonState['status'] })}
            className="px-2 py-0.5 text-sm bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
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
    </div>
  );
}
