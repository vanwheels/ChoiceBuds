/**
 * ItemSpriteBox.tsx - Held Item Sprite Tile
 * Presentational only: renders the equipped item's sprite (with a
 * Fairy-Feather-specific Serebii fallback, then an emoji fallback). Clicking
 * it (edit mode) just calls onToggleMenu - EditOverlays swaps in
 * ItemPickerPanel in this component's place while picking, rather than this
 * component managing its own popover. Extracted from EditOverlays.tsx to
 * keep it under the project's 250-line component cap.
 */

import type { MouseEvent } from 'react';
import type { ItemData } from '../types/pokemon';

const FAIRY_FEATHER_FALLBACK_SPRITE = 'https://www.serebii.net/itemdex/sprites/fairyfeather.png';

interface ItemSpriteBoxProps {
  selectedItem: string;
  itemData: ItemData | null;
  isEditing: boolean;
  spriteFailed: boolean;
  fallbackSpriteFailed: boolean;
  onSpriteError: () => void;
  onFallbackSpriteError: () => void;
  onHoverEnter: (e: MouseEvent<HTMLDivElement>) => void;
  onHoverLeave: () => void;
  onToggleMenu: () => void;
}

export default function ItemSpriteBox({
  selectedItem,
  itemData,
  isEditing,
  spriteFailed,
  fallbackSpriteFailed,
  onSpriteError,
  onFallbackSpriteError,
  onHoverEnter,
  onHoverLeave,
  onToggleMenu,
}: ItemSpriteBoxProps) {
  const isFairyFeather = selectedItem.trim().toLowerCase() === 'fairy feather';

  return (
    <div
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      onClick={isEditing ? onToggleMenu : undefined}
      className={`w-14 h-14 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden transition-colors ${isEditing ? 'cursor-pointer hover:border-blue-500' : ''}`}
    >
      {itemData?.spriteUrl && !spriteFailed ? (
        <img
          src={itemData.spriteUrl}
          alt={selectedItem}
          loading="lazy"
          className="w-9 h-9 object-contain [image-rendering:pixelated]"
          onError={onSpriteError}
        />
      ) : isFairyFeather && !fallbackSpriteFailed ? (
        // Fairy Feather is a Gen 9 item PokeAPI's default sprite set predates - fall
        // back to Serebii's itemdex sprite (verified live; see CLAUDE.md exception).
        <img
          src={FAIRY_FEATHER_FALLBACK_SPRITE}
          alt={selectedItem}
          loading="lazy"
          className="w-9 h-9 object-contain"
          onError={onFallbackSpriteError}
        />
      ) : selectedItem ? (
        <span className="text-lg leading-none" role="img" aria-label="Unknown item">🎒</span>
      ) : (
        <span className="text-[9px] text-gray-500">No Item</span>
      )}
    </div>
  );
}
