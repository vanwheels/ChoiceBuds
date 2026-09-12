/**
 * useLiveCalcThreatPins - Live Calc -> Speed Tiers Tie-in (Leg 6, see
 * TODO.md). Session-only, cross-tab state: a user-triggered "Pin to Speed
 * Tiers" action on Live Calc's opponent panel (LiveCalcDefenderPanel.tsx -
 * this action moved there from the now-merged LiveCalcResultPanel.tsx in
 * Live Calc Feedback Pass 2, Leg 3) snapshots the currently-narrowed Speed
 * SP range + surviving nature
 * candidates for the current defender species; Speed Tiers
 * (SpeedTiersPage.tsx) reads the same pins and annotates any roster
 * candidate whose species matches with the resulting real Speed bound
 * (utils/speedTiers.ts::computeInferredThreatSpeedBound), alongside its
 * existing generic usage-based rows - see utils/speedTierList.ts.
 *
 * Deliberately an explicit pin action, not automatic mirroring of Live
 * Calc's live inference state: a real doubles opponent can have multiple
 * mons in play needing independent narrowing (switch Live Calc's defender
 * species, pin, switch again, pin again), so this needs to accumulate more
 * than one snapshot at a time rather than only ever reflecting "whichever
 * species Live Calc's defender field currently holds."
 *
 * Instantiated once in App.tsx (same as useTeams/useSettings/etc.) and
 * threaded down to both LiveCalcPage and SpeedTiersPage as a prop, since
 * they're sibling tabs and neither owns this state - not persisted, lost on
 * app restart same as useLiveCalc's own scratchpad state.
 */
import { useState } from 'react';
import type { NatureName } from '@smogon/calc/dist/data/interface';

/** One pinned snapshot, keyed by species (case-insensitively) in the Map this hook returns. */
export interface LiveCalcThreatPin {
  species: string;
  level: number;
  speedSpBound: { min: number; max: number };
  natureCandidates: NatureName[];
  /** Speed Tiers-facing label only (how many turn-order observations narrowed this pin) - not read back into any computation. */
  observationCount: number;
}

export interface UseLiveCalcThreatPinsReturn {
  pins: Map<string, LiveCalcThreatPin>;
  pinThreat: (pin: LiveCalcThreatPin) => void;
  unpinThreat: (species: string) => void;
}

export function useLiveCalcThreatPins(): UseLiveCalcThreatPinsReturn {
  const [pins, setPins] = useState<Map<string, LiveCalcThreatPin>>(new Map());

  const pinThreat = (pin: LiveCalcThreatPin) => {
    setPins(prev => new Map(prev).set(pin.species.toLowerCase(), pin));
  };

  const unpinThreat = (species: string) => {
    setPins(prev => {
      const next = new Map(prev);
      next.delete(species.toLowerCase());
      return next;
    });
  };

  return { pins, pinThreat, unpinThreat };
}
