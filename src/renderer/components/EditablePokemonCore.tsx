/**
 * EditablePokemonCore.tsx - Team-Agnostic "Just Edit This Pokémon" Layer
 *
 * Extracted out of PokemonCard.tsx (Extract Editable Pokémon Card Core Leg 1,
 * see TODO.md) as a prerequisite for Leg 3's editable Box card. Holds the
 * nickname input, gender/shiny toggles, sprite + type badges, EditOverlays
 * (item/ability/moves), and StatsColumn (EVs) - everything that's equally
 * meaningful whether `pokemon` came from a team roster slot or a saved-
 * library entry. Persists through an injected `onUpdatePokemon` callback
 * (operating on the whole `ImportedPokemonInfo`, not just `showdownData`,
 * since the gender toggle also needs to rewrite the top-level `spriteUrl`
 * field for form-divergent species below) instead of closing over
 * `team`/`pokemonIndex`/`updateTeam` directly - the caller decides what
 * persisting an update actually means (`updateTeam` for a roster slot,
 * `updateSavedPokemon` for a library entry).
 *
 * Everything roster-specific - Roster Swap, remove-from-team, drag-reorder,
 * export-as-team-member, copy/paste-into-slot, the right-click context menu -
 * stays in PokemonCard.tsx's thin wrapper. `onSpriteClick`/`spriteOverlay`
 * are how that wrapper still hangs its Roster Swap trigger + SavedSetPicker
 * popover off this component's sprite box without this component knowing
 * anything about swapping species.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ImportedPokemonInfo, ShowdownPokemon } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { isGenderless, isFemaleLocked } from '../config/pokemonRules';
import { getMegaApiSlug } from '../config/megaEvolution';
import { useMegaSprite } from '../hooks/useMegaSprite';
import { getPixelSpriteUrl, getAnimatedSpriteUrl } from '../utils/spriteUrl';
import { getTotalSP, MAX_TOTAL_SP } from '../utils/evTotal';
import TypeBadge from './TypeBadge';
import StatsColumn from './StatsColumn';
import EditOverlays from './EditOverlays';

interface EditablePokemonCoreProps {
  pokemon: ImportedPokemonInfo;
  onUpdatePokemon: (updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
  // Roster Swap's click-to-open-picker affordance on the sprite box - undefined
  // (no click behavior at all) for a context with nothing to swap into, e.g. a
  // future Box card.
  onSpriteClick?: () => void;
  // Slot for a caller-owned popover anchored off the sprite box (PokemonCard.tsx
  // uses this for SavedSetPicker) - kept in the same relative-positioned
  // container the sprite box itself sits in, matching its prior nesting.
  spriteOverlay?: ReactNode;
}

const FORM_DIVERGENT: Record<string, boolean> = { 'basculegion': true, 'indeedee': true, 'meowstic': true, 'oinkologne': true };

export default function EditablePokemonCore({ pokemon, onUpdatePokemon, gameDataState, rulesetId, resolveSprite, showAnimatedSprites, onSpriteClick, spriteOverlay }: EditablePokemonCoreProps) {
  const { showdownData, types, pokedexNumber } = pokemon;
  const [isLocalShiny, setIsLocalShiny] = useState(showdownData.shiny);
  const [localGender, setLocalGender] = useState<'M' | 'F' | 'N' | '' | undefined>(showdownData.gender);
  const [localNickname, setLocalNickname] = useState(showdownData.nickname || '');
  // Tracks the specific animated URL that last failed to load, not just a
  // bare "give up" flag - so a subsequent gender/shiny/Mega-state change
  // (which produces a different candidate URL) gets a fresh chance rather
  // than being stuck on the static fallback for the rest of this card's
  // lifetime.
  const [failedAnimatedUrl, setFailedAnimatedUrl] = useState<string | null>(null);
  const spriteUrl = getPixelSpriteUrl(pokedexNumber, showdownData.species, localGender || 'M', isLocalShiny);
  // Over-cap SP warning (Speed Tiers Save Override: Over-Cap SP Warning, see
  // TODO.md) - a Speed Tiers Preview Strip save only sees Speed's SP in
  // isolation, so it can legitimately push this total over the 66 cap that
  // StatsColumn.tsx's own live editing gates against. Not a rewire of that
  // gate; StatsColumn already shows its own totalEVs/66 pill down in the EV
  // grid, but that's only visible once you're already looking at the EVs -
  // this header-level badge surfaces the same overage where a quick scan of
  // the expanded card actually looks first.
  const totalSP = getTotalSP(showdownData.evs);
  const isOverSPCap = totalSP > MAX_TOTAL_SP;

  // Mega sprite only applies while holding this exact species' own Mega
  // Stone - see config/megaEvolution.ts for the verified stone->species map.
  const megaApiSlug = getMegaApiSlug(showdownData.item, showdownData.species);
  const megaSprite = useMegaSprite(megaApiSlug);
  const staticSpriteUrl = megaSprite ? (isLocalShiny ? megaSprite.shinySpriteUrl : megaSprite.spriteUrl) : spriteUrl;

  // Showdown's sprite roster can lag official reveals (a newly-added Mega,
  // in particular) - onError below records this exact URL as failed so the
  // card degrades to the static PNG instead of a broken image.
  const animatedCandidateUrl = showAnimatedSprites
    ? getAnimatedSpriteUrl(megaApiSlug || showdownData.species, localGender || 'M', isLocalShiny)
    : null;
  const useAnimated = animatedCandidateUrl !== null && animatedCandidateUrl !== failedAnimatedUrl;
  const displaySpriteUrl = useAnimated ? animatedCandidateUrl : staticSpriteUrl;

  // Item/ability/move/EV edits commit immediately through this, same
  // "write on every mutation" convention gender/shiny toggling below uses.
  // Narrower than `onUpdatePokemon` (showdownData fields only) to match
  // EditOverlays'/StatsColumn's existing `Partial<ShowdownPokemon>` contract.
  const updateShowdownData = async (updates: Partial<ShowdownPokemon>): Promise<boolean> => {
    return onUpdatePokemon({ showdownData: { ...showdownData, ...updates } });
  };

  const handleNicknameBlur = async () => {
    if (localNickname !== (showdownData.nickname || '')) {
      await updateShowdownData({ nickname: localNickname });
    }
  };

  const handleGenderToggle = async () => {
    const species = showdownData.species;
    if (species.toLowerCase().includes('basculegion')) return;
    if (isGenderless(species) || isFemaleLocked(species)) return;
    const currentGender = localGender || 'M';
    const newGender = currentGender === 'M' ? 'F' : 'M';
    setLocalGender(newGender);
    const updates: Partial<ImportedPokemonInfo> = {
      showdownData: { ...showdownData, gender: newGender },
    };
    const speciesLower = species.toLowerCase();
    const baseSpecies = speciesLower.split('-')[0];
    if (FORM_DIVERGENT[baseSpecies]) {
      const currentSpriteUrl = pokemon.spriteUrl;
      let newSpriteUrl = currentSpriteUrl;
      if (newGender === 'F') {
        if (!currentSpriteUrl.includes('-female')) newSpriteUrl = currentSpriteUrl.replace(/\/(\d+)\.png$/, '/$1-female.png');
      } else {
        newSpriteUrl = currentSpriteUrl.replace(/-female\.png$/, '.png');
      }
      updates.spriteUrl = newSpriteUrl;
    }
    await onUpdatePokemon(updates);
  };

  const handleShinyToggle = async () => {
    const newShinyState = !isLocalShiny;
    setIsLocalShiny(newShinyState);
    await updateShowdownData({ shiny: newShinyState });
  };

  const isGenderClickable = (): boolean => {
    const species = showdownData.species;
    const speciesLower = species.toLowerCase();
    if (speciesLower.includes('basculegion') || speciesLower.includes('indeedee') || speciesLower.includes('meowstic') || speciesLower.includes('oinkologne')) return false;
    return !isGenderless(species) && !isFemaleLocked(species);
  };

  return (
    <>
      {/* Nickname Input - permanently editable (Always-On Editing Leg 1, see
          TODO.md), no more isEditing gate. Falls back to the species name
          as the placeholder when there's no nickname set. */}
      <div className="text-center">
        <input
          type="text"
          value={localNickname}
          onChange={(e) => setLocalNickname(e.target.value)}
          onBlur={handleNicknameBlur}
          maxLength={12}
          placeholder={showdownData.species}
          className="w-full px-2 py-1 text-sm font-bold text-white bg-zinc-800 border border-zinc-600 rounded text-center outline-none"
        />
        <p className="text-xs text-zinc-300 truncate">{showdownData.species} #{pokedexNumber}</p>
        {isOverSPCap && (
          <span
            title={`Total SP (${totalSP}) exceeds the ${MAX_TOTAL_SP} cap`}
            className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white border border-red-400"
          >
            ⚠ {totalSP}/{MAX_TOTAL_SP}
          </span>
        )}
      </div>

      {/* Sprite Container - clickable (when `onSpriteClick` is provided) to
          open the Roster Swap picker. Width matches the span from the left
          edge of the first Type Badge to the right edge of the second
          (134px = 64px badge + 6px gap + 64px badge), same target width as the
          Ability pill below. */}
      <div className="relative flex justify-center">
        <div
          data-no-drag
          onClick={onSpriteClick}
          className={`relative w-[134px] mx-auto h-24 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden transition-colors ${onSpriteClick ? 'cursor-pointer hover:border-accent-gold' : ''}`}
          title={onSpriteClick ? 'Click to swap this Pokémon' : undefined}
        >
          {displaySpriteUrl ? (
            <img
              src={resolveSprite(displaySpriteUrl)}
              alt={showdownData.species}
              draggable={false}
              onError={useAnimated ? () => setFailedAnimatedUrl(animatedCandidateUrl) : undefined}
              className={`w-24 h-24 object-contain mx-auto transition-transform duration-150 ${useAnimated ? '' : '[image-rendering:pixelated]'}`}
            />
          ) : (
            <span className="text-xs text-zinc-400">No sprite</span>
          )}

          {/* Gender/Shiny corner badges (Sprite Corner Badges Leg 1, see TODO.md) -
              replaces the old footer row below the card. Each is a ~34px padded
              hit zone (invisible by default) wrapping a ~22px visual icon, matching
              the drag-handle/delete-button icon scale elsewhere on this card.
              stopPropagation keeps a badge click from also bubbling into this
              sprite box's own onClick (which would re-open the swap picker). */}
          <div
            data-no-drag
            className={`group absolute top-0.5 left-0.5 z-10 w-[34px] h-[34px] flex items-center justify-center ${isGenderClickable() ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (isGenderClickable()) handleGenderToggle();
            }}
            title={isGenderless(showdownData.species) ? 'Genderless species' : isFemaleLocked(showdownData.species) ? 'Female-only species' : 'Click to toggle gender'}
          >
            <div className={`w-[22px] h-[22px] flex items-center justify-center rounded-md border border-transparent transition-colors ${isGenderClickable() ? 'group-hover:bg-zinc-900/55 group-hover:border-zinc-600/60' : 'opacity-60'}`}>
              {localGender === 'M' && <span className="text-sm font-bold text-blue-400">♂</span>}
              {localGender === 'F' && <span className="text-sm font-bold text-pink-400">♀</span>}
              {localGender !== 'M' && localGender !== 'F' && <span className="text-sm font-bold text-zinc-400">⌀</span>}
            </div>
          </div>
          <div
            data-no-drag
            className="group absolute top-0.5 right-0.5 z-10 w-[34px] h-[34px] flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleShinyToggle();
            }}
            title="Click to toggle shiny status"
          >
            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-transparent transition-colors group-hover:bg-zinc-900/55 group-hover:border-zinc-600/60">
              <span className={isLocalShiny ? 'text-sm select-none filter-none opacity-100' : 'text-sm select-none grayscale opacity-30'}>✨</span>
            </div>
          </div>
        </div>

        {spriteOverlay}
      </div>

      {/* Type Badges - min-w-0 on the outer row lets it shrink with the card
          (Card Content Overflow at Mid Widths Leg 1, see TODO.md); flex-wrap
          on the inner row is the actual overflow guard, since TypeBadge's
          fixed w-20/shrink-0 badges (deliberately not truncated - "GRASS"
          clipped to "GRA" reads worse than wrapping) don't shrink to fit a
          track narrower than their combined width. */}
      <div className="w-full flex justify-center items-center my-1.5 px-2 min-w-0">
        <div className="flex flex-row flex-wrap items-center justify-center gap-1.5 w-full">
          {types.map((type, index) => (
            <TypeBadge key={index} type={type} />
          ))}
        </div>
      </div>

      {/* Item Sprite Box / Ability Capsule / Move Bubbles - clicking to pick is
          permanently on (Always-On Editing Leg 1, see TODO.md), and so is
          MoveBubbleGrid's move-slot drag-to-reorder (Move-Slot Drag Handle
          Leg 1, see TODO.md) - a move bubble is simultaneously the click
          target that opens its picker and the drag source, disambiguated
          natively since HTML5 only fires dragstart after real pointer
          movement and suppresses click when a drag actually occurred. */}
      <EditOverlays pokemon={pokemon} gameDataState={gameDataState} rulesetId={rulesetId} resolveSprite={resolveSprite} onUpdatePokemon={updateShowdownData} />

      {/* EVs Grid Block - permanently editable (Always-On Editing Leg 1, see TODO.md) */}
      <StatsColumn evs={showdownData.evs} nature={showdownData.nature} onUpdatePokemon={updateShowdownData} />
    </>
  );
}
