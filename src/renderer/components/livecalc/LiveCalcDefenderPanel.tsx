/**
 * LiveCalcDefenderPanel.tsx - Defender's Known Inputs
 * Unlike CalcPokemonPanel's fully-known set (reused as-is for the Live Calc
 * attacker - see LiveCalcPage.tsx), the defender is species+level plus what
 * that species alone already reveals - a forme-family toggle (for stat-block
 * and Mega formes, same `FormeToggle`/`FormeFamily` CalcPokemonPanel uses)
 * and its read-only base stats, laid out with the same Base/Boost column
 * widths as CalcStatRows so the two panels visually match. Def/Sp. Def carry
 * an editable stage-boost input (-6..+6) - the only two stats the damage-%
 * inference engine (`liveCalcEngine.ts`) actually reads back; the other four
 * rows show base only since they're either not tracked as a stage here
 * (HP has none in-game) or, for Speed, already have their own per-turn-order-
 * observation stage field (`LiveCalcTurnOrderList`'s `defenderSpeedStage`) -
 * a second, panel-level Speed stage here would just conflict with that.
 * Everything past base stats/boosts (EVs/SPs, nature, ability, item) is
 * exactly what the tab is solving for, via the observation list next to this
 * panel - ability display/lock is deliberately still out of this leg (see
 * TODO.md's Live Calc Known-Ability Lock leg; surfacing it usefully is an
 * engine-contract change, not a UI addition).
 */

import type { StatsTable } from '@smogon/calc/dist/data/interface';
import type { FormeFamily } from '../../utils/calcFormes';
import { getStatLabelColor } from '../../config/pokemonTheme';
import CalcAutocomplete from '../calc/CalcAutocomplete';
import FormeToggle from '../calc/FormeToggle';

const STAT_FIELDS: Array<{ label: string; key: keyof StatsTable }> = [
  { label: 'HP', key: 'hp' },
  { label: 'Atk', key: 'atk' },
  { label: 'Def', key: 'def' },
  { label: 'SpA', key: 'spa' },
  { label: 'SpD', key: 'spd' },
  { label: 'Spe', key: 'spe' },
];

interface LiveCalcDefenderPanelProps {
  species: string;
  level: number;
  speciesOptions: string[];
  formes: FormeFamily;
  baseStats: StatsTable | null;
  defBoost: number;
  spdBoost: number;
  onChangeSpecies: (species: string) => void;
  onChangeLevel: (level: number) => void;
  onChangeDefBoost: (stage: number) => void;
  onChangeSpdBoost: (stage: number) => void;
}

export default function LiveCalcDefenderPanel({
  species, level, speciesOptions, formes, baseStats, defBoost, spdBoost,
  onChangeSpecies, onChangeLevel, onChangeDefBoost, onChangeSpdBoost,
}: LiveCalcDefenderPanelProps) {
  const megaGroup = formes.megaFormes.length > 0 ? [formes.root, ...formes.megaFormes] : [];

  const boostForKey = (key: keyof StatsTable): { value: number; onChange: (stage: number) => void } | null => {
    if (key === 'def') return { value: defBoost, onChange: onChangeDefBoost };
    if (key === 'spd') return { value: spdBoost, onChange: onChangeSpdBoost };
    return null;
  };

  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Defender</h3>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <CalcAutocomplete
            label="Species (Forme)"
            value={species}
            options={speciesOptions}
            placeholder="Search species..."
            onChange={onChangeSpecies}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Lv</label>
          <input
            type="number"
            min={1}
            max={100}
            value={level}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onChangeLevel(Math.max(1, Math.min(100, parsed)));
            }}
            className="w-14 px-1 py-0.5 text-sm text-center bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
          />
        </div>
      </div>

      {formes.statFormes.length > 1 && (
        <FormeToggle group={formes.statFormes} current={species} onSelect={onChangeSpecies} />
      )}
      {megaGroup.length > 0 && (
        <FormeToggle group={megaGroup} current={species} onSelect={onChangeSpecies} />
      )}

      <div className="bg-zinc-800 rounded px-2 py-1.5 border border-zinc-600 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-wide">
          <span className="w-8 shrink-0" />
          <span className="w-10 text-center shrink-0">Base</span>
          <span className="w-10 text-center shrink-0">Boost</span>
        </div>
        {STAT_FIELDS.map(({ label, key }) => {
          const boost = boostForKey(key);
          return (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-8 text-[10px] uppercase shrink-0 ${getStatLabelColor(label)}`}>{label}</span>
              <span className="w-10 text-center text-xs text-zinc-300 shrink-0">{baseStats ? baseStats[key] : '—'}</span>
              {boost ? (
                <input
                  type="number"
                  min={-6}
                  max={6}
                  value={boost.value}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (!Number.isNaN(parsed)) boost.onChange(Math.max(-6, Math.min(6, parsed)));
                  }}
                  title="Known stat stage boost (-6 to +6)"
                  className="w-10 shrink-0 px-1 py-0.5 text-xs text-center bg-zinc-900 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
                />
              ) : (
                <span className="w-10 text-center text-xs text-zinc-600 shrink-0">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
