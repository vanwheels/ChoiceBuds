/**
 * LiveCalcDefenderPanel.tsx - Opponent's Known Inputs
 * Unlike CalcPokemonPanel's fully-known set (reused as-is for the Live Calc
 * attacker - see LiveCalcPage.tsx), the opponent is species+level plus
 * whatever's actually been confirmed in-battle - a forme-family toggle (for
 * stat-block and Mega formes, same `FormeToggle`/`FormeFamily`
 * CalcPokemonPanel uses) and its read-only base stats, laid out with the
 * same Base/Boost column widths as CalcStatRows so the two panels visually
 * match.
 *
 * All five combat stats (Live Calc Page Layout & Function Rework - Leg 1/2)
 * carry an editable stage-boost input (-6..+6) now, not just Def/Sp. Def -
 * once the opponent's own offense is modeled (`inferOpponentOffensiveStats()`
 * narrows their Atk/SpA from "their move -> you" observations), a seen
 * Swords Dance/Dragon Dance/etc. needs to feed the boosts object on BOTH
 * damage directions, not just the outgoing one. The `speBoost` field here is
 * a static "current known stage" snapshot fed into every calc going forward,
 * distinct from `LiveCalcTurnOrderList`'s `defenderSpeedStage` - that one is
 * a per-observation stage (what the opponent's Speed stage WAS at the moment
 * of that specific turn-order read, since it can change turn to turn), used
 * only by the Speed-narrowing pass itself. They don't conflict: this panel's
 * `speBoost` answers "what's their Speed stage right now," the turn-order
 * list answers "what was it back when I saw this particular turn."
 *
 * Ability/Item/Nature all follow the same Known-Fact Lock shape (Live Calc
 * Known-Ability Lock, generalized in Leg 1): each select's default ("Unknown")
 * keeps the engine's full-pool scan; picking a real value hard-locks that
 * axis once it's been confirmed in-battle (an Intimidate trigger, a Life Orb
 * recoil message, a crit that only makes sense off a certain nature, etc.).
 * Known Item deliberately offers the FULL item list (`itemOptions`, same pool
 * CalcPokemonPanel's own item field uses) rather than
 * `config/liveCalcDefensiveItems.ts`'s narrower defensive-berry subset - that
 * curated list is only the engine's default SCAN pool (items that change
 * incoming damage), but a hard lock can name literally anything revealed in
 * battle, offensive items included (Choice Specs, Life Orb) now that the
 * opponent's own attacks are modeled too.
 */

import type { StatsTable } from '@smogon/calc/dist/data/interface';
import type { NatureName } from '@smogon/calc/dist/data/interface';
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
  atkBoost: number;
  defBoost: number;
  spaBoost: number;
  spdBoost: number;
  speBoost: number;
  /** The defender species' own real ability pool - options for the Known
   * Ability select below. Empty until a species is picked. */
  abilityOptions: string[];
  /** Full item/nature pools, same lists CalcPokemonPanel's attacker fields
   * use - see this file's header for why Known Item isn't restricted to the
   * engine's narrower defensive-item scan pool. */
  itemOptions: string[];
  natureOptions: NatureName[];
  /** Empty string means still unknown (the engine's default full-pool scan);
   * a real value hard-locks that axis to it. */
  knownAbility: string;
  knownItem: string;
  knownNature: NatureName | '';
  onChangeSpecies: (species: string) => void;
  onChangeLevel: (level: number) => void;
  onChangeAtkBoost: (stage: number) => void;
  onChangeDefBoost: (stage: number) => void;
  onChangeSpaBoost: (stage: number) => void;
  onChangeSpdBoost: (stage: number) => void;
  onChangeSpeBoost: (stage: number) => void;
  onChangeKnownAbility: (ability: string) => void;
  onChangeKnownItem: (item: string) => void;
  onChangeKnownNature: (nature: NatureName | '') => void;
}

export default function LiveCalcDefenderPanel({
  species, level, speciesOptions, formes, baseStats,
  atkBoost, defBoost, spaBoost, spdBoost, speBoost,
  abilityOptions, itemOptions, natureOptions, knownAbility, knownItem, knownNature,
  onChangeSpecies, onChangeLevel, onChangeAtkBoost, onChangeDefBoost, onChangeSpaBoost, onChangeSpdBoost, onChangeSpeBoost,
  onChangeKnownAbility, onChangeKnownItem, onChangeKnownNature,
}: LiveCalcDefenderPanelProps) {
  const megaGroup = formes.megaFormes.length > 0 ? [formes.root, ...formes.megaFormes] : [];

  const boostForKey = (key: keyof StatsTable): { value: number; onChange: (stage: number) => void } | null => {
    if (key === 'atk') return { value: atkBoost, onChange: onChangeAtkBoost };
    if (key === 'def') return { value: defBoost, onChange: onChangeDefBoost };
    if (key === 'spa') return { value: spaBoost, onChange: onChangeSpaBoost };
    if (key === 'spd') return { value: spdBoost, onChange: onChangeSpdBoost };
    if (key === 'spe') return { value: speBoost, onChange: onChangeSpeBoost };
    return null;
  };

  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Opponent</h3>
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

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Known Ability</label>
        <select
          value={knownAbility}
          onChange={(e) => onChangeKnownAbility(e.target.value)}
          disabled={abilityOptions.length === 0}
          title="Pin the opponent's ability once it's been revealed in-battle (an Intimidate trigger, an ability-activation message, etc.) - narrows the ability axis as a hard filter instead of scanning the full pool per observation"
          className="w-full px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Unknown</option>
          {abilityOptions.map(ability => <option key={ability} value={ability}>{ability}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Known Item</label>
          <select
            value={knownItem}
            onChange={(e) => onChangeKnownItem(e.target.value)}
            title="Pin the opponent's held item once it's been revealed in-battle (a Life Orb recoil message, a Fling/Knock Off reveal, etc.)"
            className="w-full px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value="">Unknown</option>
            {itemOptions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Known Nature</label>
          <select
            value={knownNature}
            onChange={(e) => onChangeKnownNature(e.target.value as NatureName | '')}
            title="Pin the opponent's nature once it's been confirmed (a stat-boost/-reduction message, a damage roll that only fits one nature, etc.)"
            className="w-full px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value="">Unknown</option>
            {natureOptions.map(nature => <option key={nature} value={nature}>{nature}</option>)}
          </select>
        </div>
      </div>

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
