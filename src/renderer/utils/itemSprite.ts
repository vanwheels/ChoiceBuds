import { VGC_MEGA_STONES } from '../config/vgcData';

/**
 * Serebii itemdex sprite fallback for held items PokeAPI has no sprite for:
 * Fairy Feather (Gen 9, post-dates PokeAPI's default sprite set) and every
 * Champions-new Mega Stone (Barbaracite, Chimechite, ...) - PokeAPI returns the
 * item with a null sprite or 404s entirely. Image hotlink only, per CLAUDE.md's
 * serebii exception #1. Serebii's filename is the lowercased name with spaces/
 * hyphens stripped (verified for every VGC_MEGA_STONES entry, 2026-10-03).
 * Returns null for anything else so ordinary items keep the 🎒 fallback.
 */
const SEREBII_FALLBACK_ITEMS: ReadonlySet<string> = new Set(
  [...VGC_MEGA_STONES, 'Fairy Feather'].map(name => name.toLowerCase().replace(/[\s-]/g, ''))
);

export function getItemFallbackSpriteUrl(itemName: string): string | null {
  const id = itemName.toLowerCase().replace(/[\s-]/g, '');
  return SEREBII_FALLBACK_ITEMS.has(id) ? `https://www.serebii.net/itemdex/sprites/${id}.png` : null;
}

/** PokeAPI's sprite when it has one, otherwise the Serebii fallback (or ''). */
export function getItemSpriteUrl(itemName: string, apiSpriteUrl?: string): string {
  return apiSpriteUrl || getItemFallbackSpriteUrl(itemName) || '';
}
