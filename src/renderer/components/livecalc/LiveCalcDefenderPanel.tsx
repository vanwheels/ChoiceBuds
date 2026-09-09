/**
 * LiveCalcDefenderPanel.tsx - Defender's Known Inputs
 * Unlike CalcPokemonPanel's fully-known set (reused as-is for the Live Calc
 * attacker - see LiveCalcPage.tsx), the defender is only ever species+level
 * here - everything else about it is exactly what the tab is solving for,
 * via the observation list next to this panel.
 */

import CalcAutocomplete from '../calc/CalcAutocomplete';

interface LiveCalcDefenderPanelProps {
  species: string;
  level: number;
  speciesOptions: string[];
  onChangeSpecies: (species: string) => void;
  onChangeLevel: (level: number) => void;
}

export default function LiveCalcDefenderPanel({ species, level, speciesOptions, onChangeSpecies, onChangeLevel }: LiveCalcDefenderPanelProps) {
  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Defender</h3>
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <CalcAutocomplete
            label="Species (Forme)"
            value={species}
            options={speciesOptions}
            placeholder="Search species..."
            onChange={onChangeSpecies}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Lv</label>
          <input
            type="number"
            min={1}
            max={100}
            value={level}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onChangeLevel(Math.max(1, Math.min(100, parsed)));
            }}
            className="w-14 px-1 py-0.5 text-sm text-center bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
          />
        </div>
      </div>
    </div>
  );
}
