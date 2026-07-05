/**
 * PokemonCard.tsx - Detailed Pokemon Card Layout Renderer
 * Vertical column layout: Compact card design for horizontal grid display
 * Displays comprehensive pokemon details with type-themed styling
 */

import type { ImportedPokemonInfo } from '../types/pokemon';
import TypeBadge from './TypeBadge';
import MoveBanner from './MoveBanner';

interface PokemonCardProps {
  pokemon: ImportedPokemonInfo;
}

/**
 * Nature stat modifier mappings
 */
const NATURE_MODIFIERS: Record<string, { boosted: string; hindered: string }> = {
  lonely: { boosted: 'attack', hindered: 'defense' },
  brave: { boosted: 'attack', hindered: 'speed' },
  adamant: { boosted: 'attack', hindered: 'specialAttack' },
  naughty: { boosted: 'attack', hindered: 'specialDefense' },
  bold: { boosted: 'defense', hindered: 'attack' },
  relaxed: { boosted: 'defense', hindered: 'speed' },
  impish: { boosted: 'defense', hindered: 'specialAttack' },
  lax: { boosted: 'defense', hindered: 'specialDefense' },
  timid: { boosted: 'speed', hindered: 'attack' },
  hasty: { boosted: 'speed', hindered: 'defense' },
  jolly: { boosted: 'speed', hindered: 'specialAttack' },
  naive: { boosted: 'speed', hindered: 'specialDefense' },
  modest: { boosted: 'specialAttack', hindered: 'attack' },
  mild: { boosted: 'specialAttack', hindered: 'defense' },
  quiet: { boosted: 'specialAttack', hindered: 'speed' },
  rash: { boosted: 'specialAttack', hindered: 'specialDefense' },
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
 * Advanced item sprite URL resolver with fallback support
 * Handles PokeAPI 404s and modern Gen 9 items with Serebii fallback
 */
function getItemSpriteUrl(itemName: string): string {
  const lower = itemName.toLowerCase().trim();
  
  // Proactive fallback for known problematic items (Gen 9+)
  const serebiiItems: Record<string, string> = {
    'fairy feather': 'https://www.serebii.net/itemdex/sprites/fairyfeather.png',
    'covert cloak': 'https://www.serebii.net/itemdex/sprites/covertcloak.png',
  };
  
  if (serebiiItems[lower]) {
    return serebiiItems[lower];
  }
  
  // Standard PokeAPI sprite path
  const slug = lower
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/[\s_]+/g, '-');
  
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}

/**
 * Fallback handler for item sprite load errors
 * Returns Serebii asset URL as secondary source
 */
function getItemSpriteFallback(itemName: string): string {
  const lower = itemName.toLowerCase().trim();
  const serebiiSlug = lower.replace(/[^a-z0-9]/g, '');
  return `https://www.serebii.net/itemdex/sprites/${serebiiSlug}.png`;
}

/**
 * Renders a detailed expanded pokemon card with vertical column layout
 */
export default function PokemonCard({ pokemon }: PokemonCardProps) {
  const { showdownData, types, spriteUrl, pokedexNumber } = pokemon;
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

  /**
   * Handle item sprite load errors with fallback
   */
  const handleItemSpriteError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const itemName = img.alt;
    
    // Prevent infinite loop if fallback also fails
    if (!img.dataset.fallbackAttempted) {
      img.dataset.fallbackAttempted = 'true';
      img.src = getItemSpriteFallback(itemName);
    } else {
      // Hide image if both sources fail
      img.style.display = 'none';
    }
  };

  return (
    <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 flex flex-col gap-3 max-w-[280px]">
      {/* Nickname and Species */}
      <div className="text-center">
        {showdownData.nickname && (
          <h4 className="text-sm font-bold text-gray-100 truncate">
            {showdownData.nickname}
          </h4>
        )}
        <p className="text-xs text-gray-300 truncate">
          {showdownData.species} #{pokedexNumber}
        </p>
      </div>

      {/* Pokemon Sprite */}
      <div className="flex justify-center">
        <div className="w-24 h-24 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden">
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={showdownData.species}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-400">No sprite</span>
          )}
        </div>
      </div>

      {/* Dual Type Badges */}
      <div className="flex gap-1 justify-center mx-auto flex-wrap">
        {types.map((type, index) => (
          <TypeBadge key={index} type={type} />
        ))}
      </div>

      {/* Held Item - Compact Centered Container */}
      {showdownData.item && (
        <div className="mx-auto w-full max-w-[120px] bg-gray-800 border border-gray-600 rounded-lg p-2 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase truncate max-w-full mb-1">
            {showdownData.item}
          </span>
          <img
            src={getItemSpriteUrl(showdownData.item)}
            alt={showdownData.item}
            title={showdownData.item}
            onError={handleItemSpriteError}
            className="w-6 h-6 object-contain"
          />
        </div>
      )}

      {/* Ability */}
      {showdownData.ability && (
        <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Ability</p>
          <p className="text-xs text-gray-100 font-medium truncate">{showdownData.ability}</p>
        </div>
      )}

      {/* Tera Type */}
      {showdownData.teraType && (
        <div className="bg-purple-900 bg-opacity-30 rounded px-2 py-1.5 border border-purple-700">
          <p className="text-xs text-purple-300 uppercase tracking-wide">Tera Type</p>
          <p className="text-xs text-purple-100 font-medium">{showdownData.teraType}</p>
        </div>
      )}

      {/* 4 Move Banners */}
      <div className="space-y-1">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Moves</p>
        {showdownData.moves.slice(0, 4).map((move, index) => (
          <MoveBanner key={index} moveName={move} />
        ))}
      </div>

      {/* Gender Indicator - Replaces Level Display */}
      <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600">
        <p className="text-xs text-gray-400 uppercase tracking-wide text-center">Gender</p>
        <div className="flex justify-center items-center">
          {showdownData.gender === 'M' && (
            <span className="text-2xl font-bold text-blue-400">♂</span>
          )}
          {showdownData.gender === 'F' && (
            <span className="text-2xl font-bold text-pink-400">♀</span>
          )}
          {showdownData.gender !== 'M' && showdownData.gender !== 'F' && (
            <span className="text-2xl font-bold text-zinc-400">⌀</span>
          )}
        </div>
      </div>

      {/* Shiny Badge */}
      {showdownData.shiny && (
        <div className="px-2 py-1 bg-yellow-600 text-white rounded text-xs font-bold text-center">
          ✨ SHINY
        </div>
      )}

      {/* Nature */}
      {showdownData.nature && (
        <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Nature</p>
          <p className="text-xs text-gray-100 font-medium">{showdownData.nature}</p>
          {modifiers && (
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="text-red-400">+{STAT_LABELS[modifiers.boosted]}</span>
              {' / '}
              <span className="text-blue-400">-{STAT_LABELS[modifiers.hindered]}</span>
            </p>
          )}
        </div>
      )}

      {/* EVs Spread - Compact 2-column grid */}
      <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">EVs</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs">
          {Object.entries(showdownData.evs).map(([stat, value]) => (
            <div key={stat} className="flex justify-between">
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
