import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveEditor } from './useActiveEditor';
import type { ImportedPokemonInfo, ShowdownPokemon } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makeShowdownPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    nickname: 'Gar',
    species: 'Gengar',
    gender: 'M',
    item: 'Choice Specs',
    ability: 'Cursed Body',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    teraType: 'Ghost',
    nature: 'Timid',
    evs: { ...ZERO_EVS, specialAttack: 252, speed: 252, hp: 4 },
    moves: ['Shadow Ball', 'Sludge Bomb', 'Protect', 'Nasty Plot'],
    ...overrides,
  };
}

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: makeShowdownPokemon(overrides),
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    calculatedStats: { hp: 150, attack: 90, defense: 80, specialAttack: 200, specialDefense: 100, speed: 180 },
    importedAt: Date.now(),
  };
}

describe('useActiveEditor', () => {
  it('starts out not editing, with no draft', () => {
    const { result } = renderHook(() => useActiveEditor());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.editingPokemonIndex).toBe(null);
    expect(result.current.draftPokemon).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it('enterEditMode deep-clones the given Pokemon into the draft, isolated from the original', () => {
    const { result } = renderHook(() => useActiveEditor());
    const original = makePokemon();

    act(() => result.current.enterEditMode(original, 2));

    expect(result.current.isEditing).toBe(true);
    expect(result.current.editingPokemonIndex).toBe(2);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.draftPokemon).toEqual(original);
    expect(result.current.draftPokemon).not.toBe(original);
    expect(result.current.draftPokemon?.showdownData).not.toBe(original.showdownData);
    expect(result.current.draftPokemon?.showdownData.evs).not.toBe(original.showdownData.evs);
    expect(result.current.draftPokemon?.showdownData.moves).not.toBe(original.showdownData.moves);
    expect(result.current.draftPokemon?.types).not.toBe(original.types);
    expect(result.current.draftPokemon?.baseStats).not.toBe(original.baseStats);
    expect(result.current.draftPokemon?.calculatedStats).not.toBe(original.calculatedStats);

    // mutating the original after the clone must not leak into the draft
    original.showdownData.evs.speed = 0;
    original.showdownData.moves.push('Thunderbolt');
    expect(result.current.draftPokemon?.showdownData.evs.speed).toBe(252);
    expect(result.current.draftPokemon?.showdownData.moves).toHaveLength(4);
  });

  it('enterEditMode tolerates a Pokemon with no calculatedStats', () => {
    const { result } = renderHook(() => useActiveEditor());
    const original = makePokemon();
    delete original.calculatedStats;

    act(() => result.current.enterEditMode(original, 0));

    expect(result.current.draftPokemon?.calculatedStats).toBeUndefined();
  });

  it('exitEditMode clears the draft and resets edit state', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));
    act(() => result.current.updateNickname('New Name'));

    act(() => result.current.exitEditMode());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.editingPokemonIndex).toBe(null);
    expect(result.current.draftPokemon).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it('discardChanges is equivalent to exitEditMode', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));
    act(() => result.current.updateLevel(80));

    act(() => result.current.discardChanges());

    expect(result.current.isEditing).toBe(false);
    expect(result.current.draftPokemon).toBe(null);
  });

  it('update* calls before entering edit mode are a no-op (no draft to mutate)', () => {
    const { result } = renderHook(() => useActiveEditor());

    act(() => result.current.updateNickname('Ghost'));

    expect(result.current.draftPokemon).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it('updateNickname sets the nickname, marks dirty, and an empty string clears it to undefined', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateNickname('Spooky'));
    expect(result.current.draftPokemon?.showdownData.nickname).toBe('Spooky');
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.updateNickname(''));
    expect(result.current.draftPokemon?.showdownData.nickname).toBeUndefined();
  });

  it('updateSpecies sets the species', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateSpecies('Rillaboom'));

    expect(result.current.draftPokemon?.showdownData.species).toBe('Rillaboom');
  });

  it('updateGender sets gender and an empty string clears it to undefined', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateGender('F'));
    expect(result.current.draftPokemon?.showdownData.gender).toBe('F');

    act(() => result.current.updateGender(''));
    expect(result.current.draftPokemon?.showdownData.gender).toBeUndefined();
  });

  it('updateItem sets item and an empty string clears it to undefined', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateItem('Life Orb'));
    expect(result.current.draftPokemon?.showdownData.item).toBe('Life Orb');

    act(() => result.current.updateItem(''));
    expect(result.current.draftPokemon?.showdownData.item).toBeUndefined();
  });

  it('updateAbility sets ability and an empty string clears it to undefined', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateAbility('Levitate'));
    expect(result.current.draftPokemon?.showdownData.ability).toBe('Levitate');

    act(() => result.current.updateAbility(''));
    expect(result.current.draftPokemon?.showdownData.ability).toBeUndefined();
  });

  it('updateLevel clamps to the 1-100 range', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateLevel(75));
    expect(result.current.draftPokemon?.showdownData.level).toBe(75);

    act(() => result.current.updateLevel(0));
    expect(result.current.draftPokemon?.showdownData.level).toBe(1);

    act(() => result.current.updateLevel(999));
    expect(result.current.draftPokemon?.showdownData.level).toBe(100);
  });

  it('updateShiny and updateGigantamax set their booleans directly', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateShiny(true));
    expect(result.current.draftPokemon?.showdownData.shiny).toBe(true);

    act(() => result.current.updateGigantamax(true));
    expect(result.current.draftPokemon?.showdownData.gigantamax).toBe(true);
  });

  it('updateHappiness clamps to the 0-255 range', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateHappiness(-5));
    expect(result.current.draftPokemon?.showdownData.happiness).toBe(0);

    act(() => result.current.updateHappiness(300));
    expect(result.current.draftPokemon?.showdownData.happiness).toBe(255);

    act(() => result.current.updateHappiness(120));
    expect(result.current.draftPokemon?.showdownData.happiness).toBe(120);
  });

  it('updateTeraType sets Tera type and an empty string clears it to undefined', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateTeraType('Fairy'));
    expect(result.current.draftPokemon?.showdownData.teraType).toBe('Fairy');

    act(() => result.current.updateTeraType(''));
    expect(result.current.draftPokemon?.showdownData.teraType).toBeUndefined();
  });

  it('updateNature sets nature and an empty string clears it to undefined', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateNature('Modest'));
    expect(result.current.draftPokemon?.showdownData.nature).toBe('Modest');

    act(() => result.current.updateNature(''));
    expect(result.current.draftPokemon?.showdownData.nature).toBeUndefined();
  });

  it('updateEVs merges a partial spread over the existing one', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateEVs({ attack: 100 }));

    expect(result.current.draftPokemon?.showdownData.evs).toEqual({
      ...ZERO_EVS, specialAttack: 252, speed: 252, hp: 4, attack: 100,
    });
  });

  it('updateMoves replaces the full moveset and truncates to 4 slots', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateMoves(['Thunderbolt', 'Volt Switch', 'Protect', 'Taunt', 'Overheat']));

    expect(result.current.draftPokemon?.showdownData.moves).toEqual(['Thunderbolt', 'Volt Switch', 'Protect', 'Taunt']);
  });

  it('updateMove replaces a single slot by index and ignores out-of-range indices', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    act(() => result.current.updateMove(1, 'Focus Blast'));
    expect(result.current.draftPokemon?.showdownData.moves).toEqual(['Shadow Ball', 'Focus Blast', 'Protect', 'Nasty Plot']);

    act(() => result.current.updateMove(4, 'Should Not Apply'));
    expect(result.current.draftPokemon?.showdownData.moves).toEqual(['Shadow Ball', 'Focus Blast', 'Protect', 'Nasty Plot']);

    act(() => result.current.updateMove(-1, 'Should Not Apply Either'));
    expect(result.current.draftPokemon?.showdownData.moves).toEqual(['Shadow Ball', 'Focus Blast', 'Protect', 'Nasty Plot']);
  });

  it('getCommittableData returns null when not editing, and the draft once editing', () => {
    const { result } = renderHook(() => useActiveEditor());

    expect(result.current.getCommittableData()).toBe(null);

    const original = makePokemon();
    act(() => result.current.enterEditMode(original, 0));
    act(() => result.current.updateNickname('Committed'));

    const committed = result.current.getCommittableData();
    expect(committed?.showdownData.nickname).toBe('Committed');
    expect(committed).toBe(result.current.draftPokemon);
  });

  it('hasUnsavedChanges tracks isDirty across an edit/discard cycle', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon(), 0));

    expect(result.current.hasUnsavedChanges()).toBe(false);

    act(() => result.current.updateShiny(true));
    expect(result.current.hasUnsavedChanges()).toBe(true);

    act(() => result.current.discardChanges());
    expect(result.current.hasUnsavedChanges()).toBe(false);
  });

  it('entering edit mode again for a different Pokemon replaces the draft and resets isDirty', () => {
    const { result } = renderHook(() => useActiveEditor());
    act(() => result.current.enterEditMode(makePokemon({ species: 'Gengar' }), 0));
    act(() => result.current.updateShiny(true));
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.enterEditMode(makePokemon({ species: 'Rillaboom' }), 3));

    expect(result.current.draftPokemon?.showdownData.species).toBe('Rillaboom');
    expect(result.current.draftPokemon?.showdownData.shiny).toBe(false);
    expect(result.current.editingPokemonIndex).toBe(3);
    expect(result.current.isDirty).toBe(false);
  });
});
