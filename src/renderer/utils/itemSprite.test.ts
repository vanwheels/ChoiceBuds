import { describe, it, expect } from 'vitest';
import { VGC_ITEMS, VGC_MEGA_STONES } from '../config/vgcData';
import { getItemFallbackSpriteUrl, getItemSpriteUrl } from './itemSprite';

// Hold items and berries whose PokeAPI sprite file (sprites/items/<slug>.png)
// was confirmed to exist on 2026-10-27. A new VGC_ITEMS entry isn't here until
// someone checks PokeAPI for it, so it fails the coverage test below instead
// of silently shipping a blank picker icon.
const POKEAPI_SPRITE_VERIFIED: ReadonlySet<string> = new Set([
  'Air Balloon',
  'Big Root',
  'Binding Band',
  'Black Belt',
  'Black Glasses',
  'Bright Powder',
  'Charcoal',
  'Choice Scarf',
  'Damp Rock',
  'Dragon Fang',
  'Eject Button',
  'Electric Seed',
  'Expert Belt',
  'Focus Band',
  'Focus Sash',
  'Grassy Seed',
  'Hard Stone',
  'Heat Rock',
  'Icy Rock',
  'Iron Ball',
  "King's Rock",
  'Leftovers',
  'Life Orb',
  'Light Ball',
  'Light Clay',
  'Magnet',
  'Mental Herb',
  'Metal Coat',
  'Metronome',
  'Miracle Seed',
  'Misty Seed',
  'Muscle Band',
  'Mystic Water',
  'Never-Melt Ice',
  'Normal Gem',
  'Poison Barb',
  'Psychic Seed',
  'Quick Claw',
  'Red Card',
  'Rocky Helmet',
  'Scope Lens',
  'Sharp Beak',
  'Shed Shell',
  'Shell Bell',
  'Silk Scarf',
  'Silver Powder',
  'Smooth Rock',
  'Soft Sand',
  'Spell Tag',
  'Terrain Extender',
  'Twisted Spoon',
  'White Herb',
  'Wide Lens',
  'Wise Glasses',
  'Zoom Lens',
  'Aspear Berry',
  'Babiri Berry',
  'Charti Berry',
  'Cheri Berry',
  'Chesto Berry',
  'Chilan Berry',
  'Chople Berry',
  'Coba Berry',
  'Colbur Berry',
  'Haban Berry',
  'Kasib Berry',
  'Kebia Berry',
  'Leppa Berry',
  'Lum Berry',
  'Occa Berry',
  'Oran Berry',
  'Passho Berry',
  'Payapa Berry',
  'Pecha Berry',
  'Persim Berry',
  'Rawst Berry',
  'Rindo Berry',
  'Roseli Berry',
  'Shuca Berry',
  'Sitrus Berry',
  'Tanga Berry',
  'Wacan Berry',
  'Yache Berry',
]);

describe('itemSprite', () => {
  it('maps Champions-new Mega Stones and Fairy Feather to Serebii', () => {
    expect(getItemFallbackSpriteUrl('Barbaracite')).toBe(
      'https://www.serebii.net/itemdex/sprites/barbaracite.png',
    );
    expect(getItemFallbackSpriteUrl('Charizardite X')).toBe(
      'https://www.serebii.net/itemdex/sprites/charizarditex.png',
    );
    expect(getItemFallbackSpriteUrl('Fairy Feather')).toBe(
      'https://www.serebii.net/itemdex/sprites/fairyfeather.png',
    );
  });
  it('returns null for ordinary items', () => {
    expect(getItemFallbackSpriteUrl('Life Orb')).toBeNull();
  });
  it('prefers the PokeAPI sprite when present', () => {
    expect(getItemSpriteUrl('Barbaracite', 'https://x/y.png')).toBe('https://x/y.png');
    expect(getItemSpriteUrl('Barbaracite', '')).toContain('serebii');
    expect(getItemSpriteUrl('Life Orb', '')).toBe('');
  });
  it('maps Leek to Serebii since PokeAPI has no leek item', () => {
    expect(getItemFallbackSpriteUrl('Leek')).toBe(
      'https://www.serebii.net/itemdex/sprites/leek.png',
    );
  });
  it('gives every Champions item a resolvable icon source', () => {
    const missing = VGC_ITEMS.filter(
      (name) =>
        !(VGC_MEGA_STONES as readonly string[]).includes(name) &&
        !POKEAPI_SPRITE_VERIFIED.has(name) &&
        !getItemFallbackSpriteUrl(name),
    );
    expect(missing).toEqual([]);
  });
});
