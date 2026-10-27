import { describe, it, expect } from 'vitest';
import { resolveAutoField } from './calcAutoField';

const base = { p1Ability: '', p2Ability: '', p1Speed: 100, p2Speed: 100 };

describe('resolveAutoField', () => {
  it("applies the changed side's weather setter", () => {
    expect(
      resolveAutoField({ ...base, changedSide: 'p1', p1Ability: 'Drought', gameType: 'Doubles' }),
    ).toEqual({ weather: 'Sun' });
  });

  it('applies a terrain setter independently of weather', () => {
    expect(
      resolveAutoField({
        ...base,
        changedSide: 'p2',
        p1Ability: 'Drizzle',
        p2Ability: 'Psychic Surge',
        gameType: 'Doubles',
      }),
    ).toEqual({ terrain: 'Psychic' });
  });

  it('changes nothing when neither side sets field conditions', () => {
    expect(
      resolveAutoField({
        ...base,
        changedSide: 'p1',
        p1Ability: 'Intimidate',
        gameType: 'Doubles',
      }),
    ).toEqual({});
  });

  it('does not clear weather when the changed side has no setter', () => {
    expect(
      resolveAutoField({
        ...base,
        changedSide: 'p2',
        p1Ability: 'Drought',
        p2Ability: 'Pressure',
        gameType: 'Doubles',
      }),
    ).toEqual({});
  });

  it('doubles: the slower setter wins a weather conflict (it switches in last)', () => {
    const args = {
      ...base,
      p1Ability: 'Drought',
      p2Ability: 'Drizzle',
      gameType: 'Doubles' as const,
    };
    expect(resolveAutoField({ ...args, changedSide: 'p1', p1Speed: 50, p2Speed: 120 })).toEqual({
      weather: 'Sun',
    });
    expect(resolveAutoField({ ...args, changedSide: 'p1', p1Speed: 120, p2Speed: 50 })).toEqual({
      weather: 'Rain',
    });
  });

  it('doubles: a speed tie goes to the side that just changed', () => {
    const args = {
      ...base,
      p1Ability: 'Drought',
      p2Ability: 'Drizzle',
      gameType: 'Doubles' as const,
    };
    expect(resolveAutoField({ ...args, changedSide: 'p2' })).toEqual({ weather: 'Rain' });
  });

  it('singles: the side that just changed wins regardless of speed', () => {
    expect(
      resolveAutoField({
        ...base,
        changedSide: 'p1',
        p1Ability: 'Drought',
        p2Ability: 'Drizzle',
        p1Speed: 200,
        p2Speed: 10,
        gameType: 'Singles',
      }),
    ).toEqual({ weather: 'Sun' });
  });

  it('treats Mega-granted abilities like any other (Mega Raichu X, Electric Surge)', () => {
    expect(
      resolveAutoField({
        ...base,
        changedSide: 'p1',
        p1Ability: 'Electric Surge',
        gameType: 'Doubles',
      }),
    ).toEqual({ terrain: 'Electric' });
  });
});
