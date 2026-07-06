/**
 * StatsColumn.tsx - Tiny EV Stats Component
 * 3x2 CSS grid with inline +/- buttons for editing
 */

import { useState } from 'react';
import type { ImportedPokemonInfo } from '../types/pokemon';

interface StatsColumnProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
}

export default function StatsColumn({ pokemon, isEditing = false }: StatsColumnProps) {
  const evs = pokemon.showdownData.evs;
  const [activeStat, setActiveStat] = useState<string | null>(null);
  const [localEVs, setLocalEVs] = useState(evs);
  
  const totalEVs = Object.values(localEVs).reduce((sum, val) => sum + val, 0);
  
  const handleIncrement = (key: keyof typeof localEVs) => {
    if (localEVs[key] >= 32 || totalEVs >= 66) return;
    setLocalEVs(prev => ({ ...prev, [key]: prev[key] + 1 }));
  };
  
  const handleDecrement = (key: keyof typeof localEVs) => {
    if (localEVs[key] <= 0) return;
    setLocalEVs(prev => ({ ...prev, [key]: prev[key] - 1 }));
  };

  const stats = [
    { label: 'HP', key: 'hp' as keyof typeof localEVs },
    { label: 'Atk', key: 'attack' as keyof typeof localEVs },
    { label: 'Def', key: 'defense' as keyof typeof localEVs },
    { label: 'SpA', key: 'specialAttack' as keyof typeof localEVs },
    { label: 'SpD', key: 'specialDefense' as keyof typeof localEVs },
    { label: 'Spe', key: 'speed' as keyof typeof localEVs }
  ];

  return (
    <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600">
      <div className="flex justify-between items-center mb-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide">EVs</p>
        {isEditing && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            totalEVs > 66
              ? 'bg-red-600 text-white border border-red-400'
              : totalEVs === 66
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-700 text-gray-400'
          }`}>{totalEVs > 66 ? '⚠ ' : ''}{totalEVs}/66</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
        {stats.map(stat => {
          const val = isEditing ? localEVs[stat.key] : evs[stat.key];
          const isActive = activeStat === stat.label;
          const exceedsMax = val > 32;
          return (
            <div key={stat.label} className="flex flex-col items-center relative">
              <span className="text-[10px] font-bold text-gray-400 uppercase">{stat.label}</span>
              {isEditing ? (
                <div className="relative">
                  <span
                    onClick={() => setActiveStat(isActive ? null : stat.label)}
                    className={`text-sm font-mono font-bold cursor-pointer px-1.5 py-0.5 rounded border ${
                      exceedsMax
                        ? 'border-red-500 text-red-400 bg-red-950/20'
                        : 'border-transparent text-gray-100'
                    } ${isActive ? 'bg-gray-700' : ''}`}
                  >{val}</span>
                  {isActive && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 flex gap-1 mt-1 z-10">
                      <button onClick={() => handleDecrement(stat.key)} disabled={val <= 0} className="w-6 h-6 text-xs font-bold rounded border" style={{ backgroundColor: val <= 0 ? '#1f2937' : '#374151', color: val <= 0 ? '#6b7280' : '#f3f4f6', borderColor: '#4b5563', cursor: val <= 0 ? 'not-allowed' : 'pointer' }}>−</button>
                      <button onClick={() => handleIncrement(stat.key)} disabled={val >= 32 || totalEVs >= 66} className="w-6 h-6 text-xs font-bold rounded border" style={{ backgroundColor: (val >= 32 || totalEVs >= 66) ? '#1f2937' : '#374151', color: (val >= 32 || totalEVs >= 66) ? '#6b7280' : '#f3f4f6', borderColor: '#4b5563', cursor: (val >= 32 || totalEVs >= 66) ? 'not-allowed' : 'pointer' }}>+</button>
                    </div>
                  )}
                </div>
              ) : (
                <span className={`text-sm font-mono font-bold px-1.5 py-0.5 rounded border ${
                  exceedsMax ? 'border-red-500 text-red-400 bg-red-950/20' : 'border-transparent text-gray-100'
                }`}>{val}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
