/**
 * TypeMatchupPage.tsx - Standalone Type-Matchup Calculator
 * Pure client-side lookup against config/typeEffectiveness.ts's 18-type
 * chart - no team/battle/API data involved, so this page owns its own
 * (UI-only) selection state rather than threading through a hook.
 */

import { useState } from 'react';
import TypeSelector from './TypeSelector';
import TypeMatchupResults from './TypeMatchupResults';

export default function TypeMatchupPage() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Type Matchup</h1>
        <p className="text-sm text-gray-400 mt-1">
          Pick one or two defending types to see incoming-damage weaknesses, resistances, and immunities.
        </p>
      </div>

      <TypeSelector selectedTypes={selectedTypes} onChange={setSelectedTypes} />

      <TypeMatchupResults defendingTypes={selectedTypes} />
    </div>
  );
}
