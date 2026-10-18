import { describe, it, expect } from 'vitest';
import { containsDisallowedContent } from './safetyFilter';

describe('containsDisallowedContent', () => {
  it('allows ordinary usernames and VGC terms', () => {
    expect(containsDisallowedContent('VGCPlayer42')).toBe(false);
    expect(containsDisallowedContent('TrickRoomEnjoyer')).toBe(false);
    expect(containsDisallowedContent('incineroar_fan')).toBe(false);
  });

  it('flags plain profanity', () => {
    expect(containsDisallowedContent('fuck')).toBe(true);
    expect(containsDisallowedContent('this is shit')).toBe(true);
  });

  it('flags leetspeak/decorated variants via the recommended transformers', () => {
    expect(containsDisallowedContent('fuuuuuuuckkk')).toBe(true);
    expect(containsDisallowedContent('f4ck')).toBe(true);
  });

  it('still flags real slurs after the collision allowlist', () => {
    expect(containsDisallowedContent('nigga')).toBe(true);
    expect(containsDisallowedContent('niggerslur')).toBe(true);
    expect(containsDisallowedContent('kike')).toBe(true);
  });

  it('does not flag real Pokemon ability/item names that collide with slur-evasion patterns', () => {
    // "Neutralizing Gas" and "Koffing Gas" hit obscenity's n[i]gga pattern
    // (matches the bare substring "ngga") run together with no separator;
    // "Klefki" + "Key" hits its unanchored "kike" substring match. Confirmed
    // live against every PokeAPI species/move/ability/item name - see this
    // file's header comment.
    expect(containsDisallowedContent('NeutralizingGas')).toBe(false);
    expect(containsDisallowedContent('neutralizing gas')).toBe(false);
    expect(containsDisallowedContent('KoffingGas')).toBe(false);
    expect(containsDisallowedContent('KlefkiKey')).toBe(false);
  });

  it('does not flag common English words sharing a substring with the word list', () => {
    expect(containsDisallowedContent('assassin')).toBe(false);
    expect(containsDisallowedContent('classic')).toBe(false);
    expect(containsDisallowedContent('grass')).toBe(false);
  });
});
