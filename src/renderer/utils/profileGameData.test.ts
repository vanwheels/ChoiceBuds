import { describe, it, expect } from 'vitest';
import { resolveProfileItemSpriteUrl, getProfileMoveChipTheme } from './profileGameData';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { getTypeTheme } from '../config/pokemonTheme';

function fakeGameData(overrides: Partial<UseGameDataReturn> = {}): UseGameDataReturn {
  return {
    getCachedItem: () => null,
    getCachedMove: () => null,
    ...overrides,
  } as unknown as UseGameDataReturn;
}

function fakeSpriteCache(resolveSprite: (url: string) => string): UseSpriteCacheReturn {
  return { resolveSprite, downloadSprite: async () => null } as unknown as UseSpriteCacheReturn;
}

describe('resolveProfileItemSpriteUrl', () => {
  it('falls back to the static Serebii-only set with no game-data cache', () => {
    expect(resolveProfileItemSpriteUrl('Fairy Feather')).toContain('serebii.net');
    expect(resolveProfileItemSpriteUrl('Leftovers')).toBe('');
  });

  it('uses the cached PokeAPI sprite when the game-data cache has it', () => {
    const gameDataState = fakeGameData({
      getCachedItem: () => ({ spriteUrl: 'https://pokeapi/leftovers.png' }) as never,
    });
    expect(resolveProfileItemSpriteUrl('Leftovers', gameDataState)).toBe(
      'https://pokeapi/leftovers.png',
    );
  });

  it('routes the resolved URL through spriteCacheState when provided', () => {
    const gameDataState = fakeGameData({
      getCachedItem: () => ({ spriteUrl: 'https://pokeapi/leftovers.png' }) as never,
    });
    const spriteCacheState = fakeSpriteCache((url) => `cached:${url}`);
    expect(resolveProfileItemSpriteUrl('Leftovers', gameDataState, spriteCacheState)).toBe(
      'cached:https://pokeapi/leftovers.png',
    );
  });

  it('returns an empty string on a cache miss with no Serebii fallback', () => {
    const gameDataState = fakeGameData();
    expect(resolveProfileItemSpriteUrl('Choice Scarf', gameDataState)).toBe('');
  });
});

describe('getProfileMoveChipTheme', () => {
  it('returns null with no game-data cache', () => {
    expect(getProfileMoveChipTheme('Fake Out')).toBeNull();
  });

  it('returns null on a cache miss', () => {
    expect(getProfileMoveChipTheme('Fake Out', fakeGameData())).toBeNull();
  });

  it("returns the move's type theme when cached", () => {
    const gameDataState = fakeGameData({
      getCachedMove: () => ({ type: 'fire' }) as never,
    });
    expect(getProfileMoveChipTheme('Heat Wave', gameDataState)).toEqual(getTypeTheme('fire'));
  });
});
