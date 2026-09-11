/**
 * BoxCard.tsx - One Box Tab Entry, Collapsed Tile or Expanded Editable Card
 *
 * Box Tab Leg 1 (see TODO.md). Collapsed default: just the sprite + the
 * saved entry's own `label` (distinct from the pokemon's `nickname` -
 * EditablePokemonCore.tsx shows the nickname once expanded). Expanded:
 * the same team-agnostic editable core PokemonCard.tsx uses for a roster
 * slot, wrapped in the same type-glow card shell, persisting edits through
 * `onUpdatePokemon` -> useSavedPokemon.ts's `updateSavedPokemon`.
 *
 * No roster-specific chrome (Roster Swap, drag-reorder, context menu) -
 * a Box entry isn't a roster slot. Rename/delete for a Box entry are still
 * only reachable via Calc's Saved Pokémon Sets modal for now (not asked for
 * in this leg's scope - see TODO.md's Box Tab item for the follow-up note).
 */

import type { CSSProperties } from 'react';
import type { ImportedPokemonInfo, SavedPokemonEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { getTypeGlowColors } from '../config/pokemonTheme';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import EditablePokemonCore from './EditablePokemonCore';

interface BoxCardProps {
  entry: SavedPokemonEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdatePokemon: (updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
}

export default function BoxCard({ entry, isExpanded, onToggleExpand, onUpdatePokemon, gameDataState, rulesetId, resolveSprite, showAnimatedSprites }: BoxCardProps) {
  const { pokemon, label } = entry;

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        title={label}
        className="flex flex-col items-center gap-1 w-28 shrink-0 p-2 rounded-lg bg-zinc-700 border border-zinc-600 hover:border-accent-gold hover:bg-zinc-600 transition-colors cursor-pointer"
      >
        <img
          src={resolveSprite(getPixelSpriteUrl(
            pokemon.pokedexNumber,
            pokemon.showdownData.species,
            pokemon.showdownData.gender || 'M',
            pokemon.showdownData.shiny
          ))}
          alt={pokemon.showdownData.species}
          draggable={false}
          className="w-16 h-16 object-contain [image-rendering:pixelated]"
        />
        <span className="text-xs font-semibold text-zinc-200 truncate w-full text-center">{label}</span>
      </button>
    );
  }

  const [glowC1, glowC2] = getTypeGlowColors(pokemon.types);

  return (
    <div className="type-glow-ring w-[280px] shrink-0" style={{ '--glow-c1': glowC1, '--glow-c2': glowC2 } as CSSProperties}>
      <div className="relative bg-zinc-700 rounded-[11px] p-3 flex flex-col gap-3 min-w-0">
        <button
          onClick={onToggleExpand}
          title="Collapse"
          className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer text-sm"
        >
          ×
        </button>

        <p className="text-center text-xs font-bold text-accent-gold uppercase tracking-wide truncate px-4">{label}</p>

        <EditablePokemonCore
          pokemon={pokemon}
          onUpdatePokemon={onUpdatePokemon}
          gameDataState={gameDataState}
          rulesetId={rulesetId}
          resolveSprite={resolveSprite}
          showAnimatedSprites={showAnimatedSprites}
        />
      </div>
    </div>
  );
}
