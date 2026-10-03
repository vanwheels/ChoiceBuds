/**
 * ItemSpriteBox.tsx - Held Item Sprite Tile
 * Presentational only: renders the equipped item's sprite (with a
 * Serebii fallback for Fairy Feather/Mega Stones, then an emoji fallback). Clicking
 * it (edit mode) just calls onToggleMenu - EditOverlays floats
 * ItemPickerPanel over this component via FloatingCardPanel while picking,
 * rather than this component managing its own popover. Extracted from
 * EditOverlays.tsx to keep it under the project's 250-line component cap.
 *
 * Long-pressing is touch's analog to the mouse hover this component also
 * wires up - it shows the same tooltip without opening the picker a plain
 * tap does (Touch-Accessible Hover Content Leg 1, see TODO.md).
 */

import { useRef } from 'react';
import type { MouseEvent } from 'react';
import type { ItemData } from '../types/pokemon';
import { useLongPress } from '../hooks/useLongPress';
import { getItemFallbackSpriteUrl } from '../utils/itemSprite';

interface ItemSpriteBoxProps {
  selectedItem: string;
  itemData: ItemData | null;
  spriteFailed: boolean;
  fallbackSpriteFailed: boolean;
  resolveSprite: (remoteUrl: string) => string;
  onSpriteError: () => void;
  onFallbackSpriteError: () => void;
  onHoverEnter: (triggerEl: HTMLElement) => void;
  onHoverLeave: () => void;
  onToggleMenu: (e: MouseEvent<HTMLDivElement>) => void;
}

// Permanently editable (Always-On Editing Leg 1, see TODO.md) - no more
// isEditing gate; clicking always opens the item picker.
export default function ItemSpriteBox({
  selectedItem,
  itemData,
  spriteFailed,
  fallbackSpriteFailed,
  resolveSprite,
  onSpriteError,
  onFallbackSpriteError,
  onHoverEnter,
  onHoverLeave,
  onToggleMenu,
}: ItemSpriteBoxProps) {
  const fallbackUrl = getItemFallbackSpriteUrl(selectedItem.trim());
  const ref = useRef<HTMLDivElement>(null);
  const longPress = useLongPress(
    () => { if (ref.current) onHoverEnter(ref.current); },
    onHoverLeave
  );

  return (
    <div
      ref={ref}
      data-no-drag
      onMouseEnter={(e) => onHoverEnter(e.currentTarget)}
      onMouseLeave={onHoverLeave}
      onClick={onToggleMenu}
      {...longPress}
      className="w-14 h-14 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden transition-colors cursor-pointer hover:border-accent-gold"
    >
      {itemData?.spriteUrl && !spriteFailed ? (
        <img
          src={resolveSprite(itemData.spriteUrl)}
          alt={selectedItem}
          loading="lazy"
          className="w-9 h-9 object-contain [image-rendering:pixelated]"
          onError={onSpriteError}
        />
      ) : fallbackUrl && !fallbackSpriteFailed ? (
        // Fairy Feather and the Champions-new Mega Stones have no PokeAPI sprite -
        // fall back to Serebii's itemdex sprite (see CLAUDE.md exception).
        <img
          src={resolveSprite(fallbackUrl)}
          alt={selectedItem}
          loading="lazy"
          className="w-9 h-9 object-contain"
          onError={onFallbackSpriteError}
        />
      ) : selectedItem ? (
        <span className="text-lg leading-none" role="img" aria-label="Unknown item">🎒</span>
      ) : (
        <span className="text-[9px] text-zinc-500">No Item</span>
      )}
    </div>
  );
}
