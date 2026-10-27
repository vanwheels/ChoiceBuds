import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCalcLegalOptions } from './useCalcLegalOptions';

const ALL_MOVES = ['Protect', 'Shadow Ball', 'Toxic'];
const ALL_ABILITIES = ['Flash Fire', 'Levitate', 'Intimidate'];

function makeFetcher() {
  return vi.fn().mockResolvedValue({
    moves: [{ name: 'shadow-ball' }, { name: 'toxic' }],
    abilities: [{ name: 'levitate' }],
  });
}

describe('useCalcLegalOptions', () => {
  it('is empty with no species and never fetches', () => {
    const fetcher = makeFetcher();
    const { result } = renderHook(() =>
      useCalcLegalOptions('', '', fetcher, ALL_MOVES, ALL_ABILITIES),
    );
    expect(result.current).toEqual({ moves: [], abilities: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps the species' learnset onto the calc's own names, keeping calc order", async () => {
    const { result } = renderHook(() =>
      useCalcLegalOptions('Gengar', '', makeFetcher(), ALL_MOVES, ALL_ABILITIES),
    );
    await waitFor(() => expect(result.current.moves).toEqual(['Shadow Ball', 'Toxic']));
    expect(result.current.abilities).toEqual(['Levitate']);
  });

  it('ignores results resolved for a previous species', async () => {
    const fetcher = makeFetcher();
    const { result, rerender } = renderHook(
      ({ species }) => useCalcLegalOptions(species, '', fetcher, ALL_MOVES, ALL_ABILITIES),
      { initialProps: { species: 'Gengar' } },
    );
    await waitFor(() => expect(result.current.abilities).toEqual(['Levitate']));
    fetcher.mockReturnValue(new Promise(() => {}));
    rerender({ species: 'Incineroar' });
    expect(result.current).toEqual({ moves: [], abilities: [] });
  });
});
