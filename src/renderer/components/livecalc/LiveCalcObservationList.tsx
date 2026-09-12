/**
 * LiveCalcObservationList.tsx - Damage% Observation Add/Remove List
 * One row per observed hit: which move was used, the damage it dealt as a
 * percent of the TARGET's max HP (a health-bar read, not exact HP - see
 * docs/investigations/live-calc-stat-inference-scope.md), how many targets
 * it actually hit that turn, whether it was a crit, and whether the target
 * survived or fainted from it. The targets-hit toggle is shown on every row
 * rather than only spread-capable moves - the engine (utils/liveCalcEngine.ts)
 * only lets it affect a move that's actually spread-capable, so it's
 * harmless noise on a single-target move rather than something this list
 * needs to pre-filter. The outcome select works the same way: 'survived'
 * (default) keeps the damage% reading as exact-ish, 'fainted' tells the
 * engine to treat it as a lower bound only (Live Calc Observation Inputs:
 * Crit + Fainted/Survived - Leg 1; see liveCalcEngine.ts's header for why a
 * KO reading can't be trusted as exact).
 *
 * Reused for both directions (Live Calc Page Layout & Function Rework -
 * Leg 2): `LiveCalcObservation` ("your move -> them", narrows the opponent's
 * Def/SpD) and `LiveCalcReverseObservation` ("their move -> you", narrows
 * the opponent's Atk/SpA) are structurally identical rows - only which
 * Pokémon's HP the percent is read against differs - so this one component
 * serves both lists via `title`/`emptyMessage`/`damageHpOwner` rather than a
 * near-duplicate file (unlike LiveCalcTurnOrderList, which stays its own
 * component since ITS row shape actually differs - no damage%, an order
 * toggle instead of a targets-hit one).
 *
 * Each row wraps (Live Calc Feedback Pass 2 - Leg 1) rather than forcing the
 * move search box plus every extension control (damage%, targets-hit,
 * outcome, crit, remove) onto one line - this list's own container can be as
 * narrow as its `min-w-[280px]` floor once the page's panel row has 5+
 * flex-1 siblings, and a single unwrapped line overflowed it. The move
 * search always takes its own full-width line (`w-full` instead of
 * `flex-1`) so it stays usable even at that floor; the rest of the controls
 * wrap onto however many lines they need below it.
 */

import type { LiveCalcObservationEntry, LiveCalcReverseObservationEntry } from '../../hooks/useLiveCalc';
import type { LiveCalcObservation, LiveCalcReverseObservation, LiveCalcObservationOutcome } from '../../utils/liveCalcEngine';
import CalcAutocomplete from '../calc/CalcAutocomplete';

interface LiveCalcObservationListProps {
  title?: string;
  emptyMessage?: string;
  /** Whose max HP `damagePercent` is read against, for the field's tooltip -
   * "the defender's" for the forward list, "your Pokémon's" for the reverse
   * one. */
  damageHpOwner?: string;
  observations: LiveCalcObservationEntry[] | LiveCalcReverseObservationEntry[];
  moveOptions: string[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<LiveCalcObservation> | Partial<LiveCalcReverseObservation>) => void;
  onRemove: (id: string) => void;
}

export default function LiveCalcObservationList({
  title = 'Observations',
  emptyMessage = "No observations yet - add one for each hit you've seen land.",
  damageHpOwner = "the defender's",
  observations, moveOptions, onAdd, onUpdate, onRemove,
}: LiveCalcObservationListProps) {
  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
        >
          + Add
        </button>
      </div>

      {observations.length === 0 && (
        <p className="text-xs text-zinc-500">{emptyMessage}</p>
      )}

      {observations.map(obs => (
        <div key={obs.id} className="flex flex-wrap items-center gap-2">
          <div className="w-full">
            <CalcAutocomplete
              value={obs.moveName}
              options={moveOptions}
              placeholder="Search moves..."
              onChange={(moveName) => onUpdate(obs.id, { moveName })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={obs.damagePercent}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (!Number.isNaN(parsed)) onUpdate(obs.id, { damagePercent: Math.max(0, Math.min(100, parsed)) });
              }}
              title={`Damage dealt, as a percent of ${damageHpOwner} max HP`}
              className="w-16 px-1 py-0.5 text-sm text-center bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
            />
          </div>
          <select
            value={obs.targetsHit}
            onChange={(e) => onUpdate(obs.id, { targetsHit: Number(e.target.value) as 1 | 2 })}
            title="How many targets this hit actually landed on (only matters for spread moves)"
            className="px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value={1}>1 target</option>
            <option value={2}>2 targets</option>
          </select>
          <select
            value={obs.outcome}
            onChange={(e) => onUpdate(obs.id, { outcome: e.target.value as LiveCalcObservationOutcome })}
            title="Whether the target survived or fainted from this hit - a fainted read is treated as a lower bound, not an exact percent"
            className="px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value="survived">Survived</option>
            <option value="fainted">Fainted</option>
          </select>
          <label
            title="Was this hit a critical hit?"
            className="flex items-center gap-1 text-xs text-zinc-400 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              checked={obs.isCrit}
              onChange={(e) => onUpdate(obs.id, { isCrit: e.target.checked })}
              className="cursor-pointer accent-accent-gold"
            />
            Crit
          </label>
          <button
            type="button"
            onClick={() => onRemove(obs.id)}
            title="Remove observation"
            className="px-2 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-red-900/60 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
