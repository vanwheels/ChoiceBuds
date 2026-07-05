import React, { useState } from 'react';

interface ShowdownPopoverProps {
  mode: 'pokemon' | 'item' | 'ability' | 'move';
  data: any[];
  onSelect: (selected: any) => void;
  onClose: () => void;
}

export const ShowdownPopover: React.FC<ShowdownPopoverProps> = ({ mode, data, onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  const filtered = data.filter(item => {
    const name = item.name?.toLowerCase() || '';
    return name.includes(search.toLowerCase());
  });

  const handleRowClick = (item: any) => {
    onSelect(item);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-2xl w-[600px] max-h-[500px] flex flex-col">
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 bg-gray-700 text-white border-b-2 border-gray-600 focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <div className="overflow-y-auto flex-1">
          {mode === 'pokemon' && (
            <div className="divide-y divide-gray-700">
              {filtered.map((pkmn, idx) => (
                <div
                  key={idx}
                  onClick={() => handleRowClick(pkmn)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <img src={pkmn.sprite} alt={pkmn.name} className="w-10 h-10" />
                  <span className="text-white font-medium flex-1">{pkmn.name}</span>
                  <div className="flex gap-1">
                    {pkmn.types?.map((type: string, i: number) => (
                      <span key={i} className="px-2 py-1 rounded text-xs font-bold uppercase bg-gray-600 text-white">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {mode === 'item' && (
            <div className="divide-y divide-gray-700">
              {filtered.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleRowClick(item)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <img src={item.sprite} alt={item.name} className="w-8 h-8" />
                  <div className="flex-1">
                    <div className="text-white font-medium">{item.name}</div>
                    <div className="text-gray-400 text-sm">{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {mode === 'ability' && (
            <div className="divide-y divide-gray-700">
              {filtered.map((ability, idx) => (
                <div
                  key={idx}
                  onClick={() => handleRowClick(ability)}
                  className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <div className="text-white font-medium">{ability.name}</div>
                  <div className="text-gray-400 text-sm">{ability.description}</div>
                </div>
              ))}
            </div>
          )}
          {mode === 'move' && (
            <div className="divide-y divide-gray-700">
              {filtered.map((option, idx) => (
                <div
                  key={idx}
                  onClick={() => handleRowClick(option)}
                  className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">{option.name}</span>
                    <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-gray-600 text-white">
                      {option.type}
                    </span>
                    <span className="text-gray-300 text-sm">{option.category}</span>
                    <span className="text-gray-400 text-xs ml-auto">
                      Pow: {option.power || '--'} | Acc: {option.accuracy || '--'} | PP: {option.pp || '--'}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm">{option.description || 'Loading description...'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
