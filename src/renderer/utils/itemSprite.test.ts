import { describe, it, expect } from 'vitest';
import { getItemFallbackSpriteUrl, getItemSpriteUrl } from './itemSprite';

describe('itemSprite', () => {
  it('maps Champions-new Mega Stones and Fairy Feather to Serebii', () => {
    expect(getItemFallbackSpriteUrl('Barbaracite')).toBe('https://www.serebii.net/itemdex/sprites/barbaracite.png');
    expect(getItemFallbackSpriteUrl('Charizardite X')).toBe('https://www.serebii.net/itemdex/sprites/charizarditex.png');
    expect(getItemFallbackSpriteUrl('Fairy Feather')).toBe('https://www.serebii.net/itemdex/sprites/fairyfeather.png');
  });
  it('returns null for ordinary items', () => {
    expect(getItemFallbackSpriteUrl('Life Orb')).toBeNull();
  });
  it('prefers the PokeAPI sprite when present', () => {
    expect(getItemSpriteUrl('Barbaracite', 'https://x/y.png')).toBe('https://x/y.png');
    expect(getItemSpriteUrl('Barbaracite', '')).toContain('serebii');
    expect(getItemSpriteUrl('Life Orb', '')).toBe('');
  });
});
