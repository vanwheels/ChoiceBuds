/**
 * ItemSpriteBox.tsx - Held Item Sprite Tile
 * Presentational only: renders the equipped item's sprite (with a
 * Fairy-Feather-specific Serebii fallback, then an emoji fallback). Clicking
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

const FAIRY_FEATHER_FALLBACK_SPRITE = 'https://www.serebii.net/itemdex/sprites/fairyfeather.png';

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
  const isFairyFeather = selectedItem.trim().toLowerCase() === 'fairy feather';
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
        <span className="text-[9px] text-zinc-500">No Item</span>
      )}
    </div>
  );
}
