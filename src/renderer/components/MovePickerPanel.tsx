/**
 * MovePickerPanel.tsx - In-Slot Move Picker
 * Same "fills the slot instead of floating a dropdown" pattern as
 * ItemPickerPanel/SpeciesPickerCard/AbilityPickerPanel - replaces
 * EditOverlays' entire item/ability/move region while picking a move, so it
 * always sits solely inside the PokemonCard's own width. Shows which move
 * slot is being edited since the other 3 move bubbles are hidden while this
 * is open.
 */

import { useState } from 'react';
import type { MoveData } from '../types/pokemon';
import { validateMoveLegality, getRegulationLabel, type RegulationId } from '../utils/pokemonRules';
import { toReadableName } from '../utils/displayName';
import { getTypeTheme } from '../config/pokemonTheme';
import { useDismissable } from '../hooks/useDismissable';
import { parseTagFilter } from '../utils/tagSearch';

interface MovePickerPanelProps {
  moveIndex: number;
  moves: MoveData[];
  rulesetId: RegulationId;
  maxHeight: number;
  onSelect: (move: MoveData) => void;
  onClose: () => void;
}

function matchesTag(move: MoveData, tag: string): boolean {
  return move.category === tag || move.type.toLowerCase() === tag;
}

export default function MovePickerPanel({ moveIndex, moves, rulesetId, maxHeight, onSelect, onClose }: MovePickerPanelProps) {
  const [search, setSearch] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);

  const tag = parseTagFilter(search);
  const filtered = moves.filter(move =>
    tag !== null ? matchesTag(move, tag) : toReadableName(move.name).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="w-full flex flex-col gap-2 bg-gray-800 border-2 border-blue-500 rounded-lg p-2">
      <p className="text-[10px] font-bold text-gray-400 uppercase text-center">Select Move {moveIndex + 1}</p>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search moves... (#physical, #fire, ...)"
        autoFocus
        className="w-full px-2 py-1 text-sm font-bold text-white bg-gray-900 border border-gray-600 rounded text-center outline-none focus:border-blue-500"
      />
      <div className="overflow-y-auto flex flex-col divide-y divide-gray-700" style={{ maxHeight }}>
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-2">No moves found</p>
        ) : (
          filtered.map((move, idx) => {
            const theme = getTypeTheme(move.type);
            const isLegal = validateMoveLegality(move.name, rulesetId);
            return (
              <div
                key={idx}
                onClick={() => onSelect(move)}
                className={`px-2 py-1.5 hover:bg-gray-700 cursor-pointer transition-colors ${!isLegal ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-sm font-medium ${isLegal ? 'text-white' : 'text-gray-400'}`}>{toReadableName(move.name)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${theme.bg} ${theme.text}`}>{move.type}</span>
                  <span className="text-gray-300 text-xs capitalize">{move.category}</span>
                  {!isLegal && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-900/40 text-red-300 border border-red-800 whitespace-nowrap">
                      Not Legal in {getRegulationLabel(rulesetId)}
                    </span>
                  )}
                  <span className="text-gray-400 text-[10px] ml-auto whitespace-nowrap">
                    Pow {move.power ?? '--'} · Acc {move.accuracy ?? '--'} · PP {move.pp}
                  </span>
                </div>
                <div className="text-gray-400 text-xs truncate">{move.description}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
