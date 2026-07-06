import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ItemData, MoveData, AbilityData, SpeciesRosterEntry } from '../types/pokemon';
import { getTypeTheme } from '../config/pokemonTheme';

type ShowdownPopoverProps =
  | { mode: 'pokemon'; data: SpeciesRosterEntry[]; onSelect: (selected: SpeciesRosterEntry) => void; onClose: () => void }
  | { mode: 'item'; data: ItemData[]; onSelect: (selected: ItemData) => void; onClose: () => void }
  | { mode: 'ability'; data: AbilityData[]; onSelect: (selected: AbilityData) => void; onClose: () => void }
  | { mode: 'move'; data: MoveData[]; onSelect: (selected: MoveData) => void; onClose: () => void };

function matchesSearch(name: string, search: string): boolean {
  return name.toLowerCase().includes(search.toLowerCase());
}

function PopoverShell({
  search,
  onSearchChange,
  onClose,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl w-[600px] max-h-[500px] flex flex-col">
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

  if (props.mode === 'pokemon') {
    const filtered = props.data.filter(pkmn => matchesSearch(pkmn.name, search));
    return (
      <PopoverShell search={search} onSearchChange={setSearch} onClose={onClose}>
        <div className="divide-y divide-gray-700">
          {filtered.map((pkmn, idx) => (
            <div
              key={idx}
              onClick={() => { props.onSelect(pkmn); onClose(); }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <img src={pkmn.spriteUrl} alt={pkmn.name} className="w-10 h-10 object-contain [image-rendering:pixelated]" />
              <span className="text-white font-medium flex-1">{pkmn.name}</span>
              <span className="text-gray-400 text-xs">#{pkmn.id}</span>
            </div>
          ))}
        </div>
      </PopoverShell>
    );
  }

  if (props.mode === 'item') {
    const filtered = props.data.filter(item => matchesSearch(item.name, search));
    return (
      <PopoverShell search={search} onSearchChange={setSearch} onClose={onClose}>
        <div className="divide-y divide-gray-700">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => { props.onSelect(item); onClose(); }}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <div className="text-white font-medium">{item.name}</div>
              <div className="text-gray-400 text-sm">{item.description}</div>
            </div>
          ))}
        </div>
      </PopoverShell>
    );
  }

  if (props.mode === 'ability') {
    const filtered = props.data.filter(ability => matchesSearch(ability.name, search));
    return (
      <PopoverShell search={search} onSearchChange={setSearch} onClose={onClose}>
        <div className="divide-y divide-gray-700">
          {filtered.map((ability, idx) => (
            <div
              key={idx}
              onClick={() => { props.onSelect(ability); onClose(); }}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <div className="text-white font-medium">{ability.name}</div>
              <div className="text-gray-400 text-sm">{ability.description}</div>
            </div>
          ))}
        </div>
      </PopoverShell>
    );
  }

  const filtered = props.data.filter(move => matchesSearch(move.name, search));
  return (
    <PopoverShell search={search} onSearchChange={setSearch} onClose={onClose}>
      <div className="divide-y divide-gray-700">
        {filtered.map((move, idx) => {
          const theme = getTypeTheme(move.type);
          return (
            <div
              key={idx}
              onClick={() => { props.onSelect(move); onClose(); }}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium">{move.name}</span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${theme.bg} ${theme.text}`}>
                  {move.type}
                </span>
                <span className="text-gray-300 text-sm capitalize">{move.category}</span>
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
