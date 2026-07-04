/**
 * StatsColumn.tsx - Pokemon Stats Display Component
 * Left column layout showing Level, Gender, Nature, EVs, and IVs
 * Nature modifiers highlighted: red for boosted stats, blue for hindered stats
 */

import type { ImportedPokemonInfo } from '../types/pokemon';

interface StatsColumnProps {
  pokemon: ImportedPokemonInfo;
}

/**
 * Nature stat modifier mappings
 * Maps nature name to { boosted: stat, hindered: stat }
 */
const NATURE_MODIFIERS: Record<string, { boosted: string; hindered: string }> = {
  // Attack boosting
  lonely: { boosted: 'attack', hindered: 'defense' },
  brave: { boosted: 'attack', hindered: 'speed' },
  adamant: { boosted: 'attack', hindered: 'specialAttack' },
  naughty: { boosted: 'attack', hindered: 'specialDefense' },
  // Defense boosting
  bold: { boosted: 'defense', hindered: 'attack' },
  relaxed: { boosted: 'defense', hindered: 'speed' },
  impish: { boosted: 'defense', hindered: 'specialAttack' },
  lax: { boosted: 'defense', hindered: 'specialDefense' },
  // Speed boosting
  timid: { boosted: 'speed', hindered: 'attack' },
  hasty: { boosted: 'speed', hindered: 'defense' },
  jolly: { boosted: 'speed', hindered: 'specialAttack' },
  naive: { boosted: 'speed', hindered: 'specialDefense' },
  // Special Attack boosting
  modest: { boosted: 'specialAttack', hindered: 'attack' },
  mild: { boosted: 'specialAttack', hindered: 'defense' },
  quiet: { boosted: 'specialAttack', hindered: 'speed' },
  rash: { boosted: 'specialAttack', hindered: 'specialDefense' },
  // Special Defense boosting
  calm: { boosted: 'specialDefense', hindered: 'attack' },
  gentle: { boosted: 'specialDefense', hindered: 'defense' },
  sassy: { boosted: 'specialDefense', hindered: 'speed' },
  careful: { boosted: 'specialDefense', hindered: 'specialAttack' },
};

/**
 * Stat display labels
 */
const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Atk',
  defense: 'Def',
  specialAttack: 'SpA',
  specialDefense: 'SpD',
  speed: 'Spe',
};

/**
 * Renders the left column with pokemon stats, nature, EVs, and IVs
 */
export default function StatsColumn({ pokemon }: StatsColumnProps) {
  const { showdownData } = pokemon;
  const nature = showdownData.nature?.toLowerCase() || '';
  const modifiers = NATURE_MODIFIERS[nature];

  /**
   * Get text color class for a stat based on nature modifiers
   */
  const getStatColor = (statKey: string): string => {
    if (!modifiers) return 'text-gray-300';
    if (modifiers.boosted === statKey) return 'text-red-400';
    if (modifiers.hindered === statKey) return 'text-blue-400';
    return 'text-gray-300';
  };

  return (
    <div className="space-y-4">
      {/* Level and Gender */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Level</p>
          <p className="text-lg font-bold text-gray-100">{showdownData.level}</p>
        </div>
        {showdownData.gender && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Gender</p>
            <p className="text-lg font-bold text-gray-100">
              {showdownData.gender === 'M' ? '♂' : '♀'}
            </p>
          </div>
        )}
        {showdownData.shiny && (
          <div className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-bold">
            ✨ SHINY
          </div>
        )}
      </div>

      {/* Nature */}
      {showdownData.nature && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Nature</p>
          <p className="text-sm text-gray-100 font-medium">{showdownData.nature}</p>
          {modifiers && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="text-red-400">+{STAT_LABELS[modifiers.boosted]}</span>
              {' / '}
              <span className="text-blue-400">-{STAT_LABELS[modifiers.hindered]}</span>
            </p>
          )}
        </div>
      )}

      {/* EVs Spread */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">EVs</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(showdownData.evs).map(([stat, value]) => (
            <div key={stat} className="flex justify-between text-sm">
              <span className={getStatColor(stat)}>
                {STAT_LABELS[stat as keyof typeof STAT_LABELS]}:
              </span>
              <span className="text-gray-100 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
