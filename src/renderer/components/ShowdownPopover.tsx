import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { MoveData, AbilityData } from '../types/pokemon';
import { getTypeTheme } from '../config/pokemonTheme';
import { validateMoveLegality, getRegulationLabel, type RegulationId } from '../utils/pokemonRules';
import { toReadableName } from '../utils/displayName';

// Species selection uses SpeciesPickerCard and item selection uses
// ItemPickerPanel instead of this generic dropdown - both fill their slot in
// place rather than floating below it. This is left for ability/move, which
// stay as floating dropdowns (moves just get a wider one - see below).
type ShowdownPopoverProps =
  | { mode: 'ability'; data: AbilityData[]; onSelect: (selected: AbilityData) => void; onClose: () => void }
  | { mode: 'move'; data: MoveData[]; onSelect: (selected: MoveData) => void; onClose: () => void; rulesetId?: RegulationId };

function matchesSearch(name: string, search: string): boolean {
  return name.toLowerCase().includes(search.toLowerCase());
}

/** Small "Not Legal in Reg M-B" flag - illegal choices stay visible/selectable, just visually flagged */
function IllegalBadge({ rulesetId }: { rulesetId: RegulationId }) {
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-900/40 text-red-300 border border-red-800 whitespace-nowrap">
      Not Legal in {getRegulationLabel(rulesetId)}
    </span>
  );
}

function PopoverShell({
  search,
  onSearchChange,
  onClose,
  widthClassName,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  widthClassName: string;
  children: ReactNode;
}) {
  // Escape cancels, same as clicking the invisible full-screen catcher below -
  // neither ever calls onSelect, so the underlying data is never touched.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute z-50 top-full left-0 mt-1 drop-shadow-xl bg-slate-900 border-2 border-slate-700 rounded-lg max-h-[32rem] flex flex-col ${widthClassName}`}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white border-b-2 border-gray-600 focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </>
  );
}

export function ShowdownPopover(props: ShowdownPopoverProps) {
  const [search, setSearch] = useState('');
  const { onClose } = props;

  if (props.mode === 'ability') {
    const filtered = props.data.filter(ability => matchesSearch(toReadableName(ability.name), search));
    return (
      <PopoverShell search={search} onSearchChange={setSearch} onClose={onClose} widthClassName="w-[600px]">
        <div className="divide-y divide-gray-700">
          {filtered.map((ability, idx) => (
            <div
              key={idx}
              onClick={() => { props.onSelect(ability); onClose(); }}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <div className="text-white font-medium">{toReadableName(ability.name)}</div>
              <div className="text-gray-400 text-sm">{ability.description}</div>
            </div>
          ))}
        </div>
      </PopoverShell>
    );
  }

  const { rulesetId } = props;
  const filtered = props.data.filter(move => matchesSearch(toReadableName(move.name), search));
  return (
    // 2 PokemonCard-widths (280px each + grid gap) so descriptions are easy to read
    <PopoverShell search={search} onSearchChange={setSearch} onClose={onClose} widthClassName="w-[576px]">
      <div className="divide-y divide-gray-700">
        {filtered.map((move, idx) => {
          const theme = getTypeTheme(move.type);
          const isLegal = !rulesetId || validateMoveLegality(move.name, rulesetId);
          return (
            <div
              key={idx}
              onClick={() => { props.onSelect(move); onClose(); }}
              className={`px-4 py-2 hover:bg-gray-700 cursor-pointer ${!isLegal ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`font-medium ${isLegal ? 'text-white' : 'text-gray-400'}`}>{toReadableName(move.name)}</span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${theme.bg} ${theme.text}`}>
                  {move.type}
                </span>
                <span className="text-gray-300 text-sm capitalize">{move.category}</span>
                {!isLegal && rulesetId && <IllegalBadge rulesetId={rulesetId} />}
                <span className="text-gray-400 text-xs ml-auto">
                  Pow: {move.power ?? '--'} | Acc: {move.accuracy ?? '--'} | PP: {move.pp}
                </span>
              </div>
              <div className="text-gray-400 text-sm">{move.description}</div>
            </div>
          );
        })}
      </div>
    </PopoverShell>
  );
}
