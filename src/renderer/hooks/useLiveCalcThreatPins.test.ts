import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLiveCalcThreatPins, type LiveCalcThreatPin } from './useLiveCalcThreatPins';

function pin(overrides: Partial<LiveCalcThreatPin> = {}): LiveCalcThreatPin {
  return {
    species: 'Chien-Pao',
    level: 50,
    speedSpBound: { min: 16, max: 32 },
    natureCandidates: ['Hardy', 'Timid'],
    observationCount: 2,
    ...overrides,
  };
}

describe('useLiveCalcThreatPins', () => {
  it('starts with no pins', () => {
    const { result } = renderHook(() => useLiveCalcThreatPins());
    expect(result.current.pins.size).toBe(0);
  });

  it('pinThreat adds a pin keyed by lowercased species', () => {
    const { result } = renderHook(() => useLiveCalcThreatPins());
    act(() => result.current.pinThreat(pin()));
    expect(result.current.pins.get('chien-pao')).toEqual(pin());
  });

  it('pinThreat overwrites an existing pin for the same species', () => {
    const { result } = renderHook(() => useLiveCalcThreatPins());
    act(() => result.current.pinThreat(pin({ observationCount: 1 })));
    act(() => result.current.pinThreat(pin({ observationCount: 3 })));
    expect(result.current.pins.size).toBe(1);
    expect(result.current.pins.get('chien-pao')?.observationCount).toBe(3);
  });

  it('unpinThreat removes a pin, case-insensitively', () => {
    const { result } = renderHook(() => useLiveCalcThreatPins());
    act(() => result.current.pinThreat(pin()));
    act(() => result.current.unpinThreat('CHIEN-PAO'));
    expect(result.current.pins.size).toBe(0);
  });

  it('unpinThreat on a species with no pin is a no-op', () => {
    const { result } = renderHook(() => useLiveCalcThreatPins());
    act(() => result.current.unpinThreat('Incineroar'));
    expect(result.current.pins.size).toBe(0);
  });

  it('keeps multiple independently-pinned species at once', () => {
    const { result } = renderHook(() => useLiveCalcThreatPins());
    act(() => result.current.pinThreat(pin({ species: 'Chien-Pao' })));
    act(() => result.current.pinThreat(pin({ species: 'Rillaboom' })));
    expect(result.current.pins.size).toBe(2);
    expect([...result.current.pins.keys()].sort()).toEqual(['chien-pao', 'rillaboom']);
  });
});
