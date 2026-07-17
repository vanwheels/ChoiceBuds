/**
 * LikelySetsPopover.tsx - Ranked-Usage "Likely Set" Suggestion
 * Deliberately separate from OpponentRowFields.tsx's real ability/item/move
 * controls - this is guessed data from championsbattledata.com's ranked
 * usage stats (see services/championsBattleData.ts), never a confirmed
 * reveal. Visually distinct (dashed border, amber accent, never the app's
 * existing confirmed-state blue/red) so it can never be mistaken for
 * OpponentPokemonEntry's actually-observed fields.
 *
 * Phase 2: Item/Moves/Nature/Stat Points sections alongside Phase 1's
 * Ability-only slice. Nature and Stat Points have no confirmed counterpart
 * in OpponentPokemonEntry at all (out of scope per TODO.md - the app tracks
 * neither field for opponents), so those two sections never hide - they're
 * always a pure suggestion for as long as usage data exists.
 */

import type { ChampionsUsageEntry } from '../../types/pokemon';
import { useDismissable } from '../../hooks/useDismissable';

interface LikelySetsPopoverProps {
  usage: ChampionsUsageEntry;
  hideAbility: boolean;
  hideItem: boolean;
  confirmedMoves: string[];
  onClose: () => void;
}

const STAT_POINT_LABELS: Array<{ key: keyof ChampionsUsageEntry['statSpreads'][number]['points']; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'Atk' },
  { key: 'def', label: 'Def' },
  { key: 'spa', label: 'SpA' },
  { key: 'spd', label: 'SpD' },
  { key: 'spe', label: 'Spe' },
];

function formatStatSpread(points: ChampionsUsageEntry['statSpreads'][number]['points']): string {
  return STAT_POINT_LABELS
    .filter(({ key }) => points[key] > 0)
    .map(({ key, label }) => `${points[key]} ${label}`)
    .join(' / ');
}

function formatNature(name: string, statUp?: string, statDown?: string): string {
  return statUp && statDown ? `${name} (+${statUp}/-${statDown})` : name;
}

export default function LikelySetsPopover({ usage, hideAbility, hideItem, confirmedMoves, onClose }: LikelySetsPopoverProps) {
  const ref = useDismissable<HTMLDivElement>(onClose);
  const abilities = hideAbility ? [] : usage.abilities.slice(0, 3);
  const items = hideItem ? [] : usage.items.slice(0, 3);
  const confirmedMovesLower = confirmedMoves.map(m => m.toLowerCase());
  const moves = usage.moves.filter(m => !confirmedMovesLower.includes(m.name.toLowerCase())).slice(0, 4);
  const natures = usage.natures.slice(0, 2);
  const statSpreads = usage.statSpreads.slice(0, 2);

  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-0 w-56 p-2 rounded-lg bg-gray-800 border-2 border-dashed border-amber-700 shadow-lg flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Likely Set (unconfirmed)</span>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-400 cursor-pointer text-xs shrink-0">×</button>
      </div>
      {abilities.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-gray-500 uppercase">Ability</span>
          {abilities.map(a => (
            <div key={a.name} className="flex items-center justify-between text-[10px] text-gray-200">
              <span className="truncate">{a.name}</span>
              <span className="text-gray-500 shrink-0 ml-1">{a.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      {items.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-gray-500 uppercase">Item</span>
          {items.map(i => (
            <div key={i.name} className="flex items-center justify-between text-[10px] text-gray-200">
              <span className="truncate">{i.name}</span>
              <span className="text-gray-500 shrink-0 ml-1">{i.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      {moves.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-gray-500 uppercase">Moves</span>
          {moves.map(m => (
            <div key={m.name} className="flex items-center justify-between text-[10px] text-gray-200">
              <span className="truncate">{m.name}</span>
              <span className="text-gray-500 shrink-0 ml-1">{m.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      {natures.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-gray-500 uppercase">Nature</span>
          {natures.map(n => (
            <div key={n.name} className="flex items-center justify-between text-[10px] text-gray-200">
              <span className="truncate">{formatNature(n.name, n.statUp, n.statDown)}</span>
              <span className="text-gray-500 shrink-0 ml-1">{n.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      {statSpreads.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-gray-500 uppercase">Stat Points</span>
          {statSpreads.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] text-gray-200 gap-1">
              <span className="truncate">{formatStatSpread(s.points)}</span>
              <span className="text-gray-500 shrink-0">{s.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      <span className="text-[8px] text-gray-600">Champions ranked usage · {usage.season}</span>
    </div>
  );
}
