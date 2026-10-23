import { describe, expect, it } from 'vitest';
import { setMegaEvolvedForSide, toggleMegaEvolvedIds } from './battleMegaToggle';

describe('toggleMegaEvolvedIds', () => {
  it('marks an unmarked id', () => {
    expect(toggleMegaEvolvedIds([], 'a', ['a', 'b'])).toEqual(['a']);
  });

  it('unmarks an already-marked id', () => {
    expect(toggleMegaEvolvedIds(['a'], 'a', ['a', 'b'])).toEqual([]);
  });

  it('clears a different id already marked on the same side when marking a new one', () => {
    expect(toggleMegaEvolvedIds(['a'], 'b', ['a', 'b'])).toEqual(['b']);
  });

  it('leaves a mark on the other side untouched', () => {
    expect(toggleMegaEvolvedIds(['opp1'], 'a', ['a', 'b'])).toEqual(['opp1', 'a']);
  });

  it("replacing a mark on one side does not disturb the other side's mark", () => {
    expect(toggleMegaEvolvedIds(['a', 'opp1'], 'b', ['a', 'b'])).toEqual(['opp1', 'b']);
  });
});

describe('setMegaEvolvedForSide', () => {
  it('marks an unmarked id', () => {
    expect(setMegaEvolvedForSide([], 'a', ['a', 'b'])).toEqual(['a']);
  });

  it("is idempotent when the id is already the side's mark - stays marked, not toggled off", () => {
    expect(setMegaEvolvedForSide(['a'], 'a', ['a', 'b'])).toEqual(['a']);
  });

  it('switches the mark from one id to another on the same side (X/Y/Z form picker switching forms)', () => {
    expect(setMegaEvolvedForSide(['a'], 'b', ['a', 'b'])).toEqual(['b']);
  });

  it('leaves a mark on the other side untouched', () => {
    expect(setMegaEvolvedForSide(['opp1'], 'a', ['a', 'b'])).toEqual(['opp1', 'a']);
  });
});
