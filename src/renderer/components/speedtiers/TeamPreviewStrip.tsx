/**
 * TeamPreviewStrip.tsx - Speed Tiers Team Preview Strip
 * Speed Tiers Team Preview Strip (Leg 5, see TODO.md /
 * docs/investigations/speed-tiers-preview-strip-scope.md) - renders below
 * the team selector, one TeamPreviewCard per team member. Purely
 * presentational: resolves each mon's current override (falling back to its
 * real saved values via defaultSpeedOverride) and its forme family, then
 * hands both to the card. The override Map itself lives in SpeedTiersPage.tsx
 * (per the scoping doc's leaning - a per-mon map keyed by team-member id,
 * not a new hook), same reasoning speedTiers.ts's SpeedFieldContext state
 * already lives on the page rather than its own hook.
 *
 * Save Override to Team (Leg 17, see TODO.md /
 * docs/investigations/speed-tiers-save-override-scope.md) added the header's
 * "Save All" button and each card's own Save action (wired through
 * onSaveOverride below) - both call back up to SpeedTiersPage.tsx's actual
 * write-back, this component stays presentational. A card's Save is only
 * meaningful (and only enabled - see TeamPreviewCard.tsx) when `overrides`
 * has an entry for that mon; "Save All" is disabled whenever the whole Map
 * is empty.
 */
import type { ImportedPokemonInfo } from '../../types/pokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { NatureName } from '@smogon/calc/dist/data/interface';
import { getFormeFamily, type CalcSpeciesRef } from '../../utils/calcFormes';
import { defaultSpeedOverride, type TeamSpeedOverride } from '../../utils/speedTierOverrides';
import TeamPreviewCard from './TeamPreviewCard';

interface TeamPreviewStripProps {
  pokemon: ImportedPokemonInfo[];
  allSpecies: CalcSpeciesRef[];
  natureOptions: NatureName[];
  overrides: Map<string, TeamSpeedOverride>;
  onChangeOverride: (pokemon: ImportedPokemonInfo, updates: Partial<TeamSpeedOverride>) => void;
  onSaveOverride: (pokemon: ImportedPokemonInfo) => void;
  onSaveAllOverrides: () => void;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function TeamPreviewStrip({ pokemon, allSpecies, natureOptions, overrides, onChangeOverride, onSaveOverride, onSaveAllOverrides, spriteCacheState }: TeamPreviewStripProps) {
  if (pokemon.length === 0) return null;

  const hasAnyOverride = overrides.size > 0;

  return (
    <div className="bg-zinc-800 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
          Team Preview - session-only Speed SP / nature / form overrides. Save writes Speed SP + nature back to the
          team (form stays preview-only).
        </p>
        <button
          type="button"
          onClick={onSaveAllOverrides}
          disabled={!hasAnyOverride}
          className={`px-2 py-1 text-[10px] font-bold rounded shrink-0 transition-colors ${
            hasAnyOverride ? 'bg-accent-gold text-zinc-900 hover:bg-accent-gold/90 cursor-pointer' : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          }`}
        >
          Save All
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {pokemon.map(p => {
          const hasOverride = overrides.has(p.id);
          const override = overrides.get(p.id) ?? defaultSpeedOverride(p);
          const formes = getFormeFamily(allSpecies, override.species);
          return (
            <TeamPreviewCard
              key={p.id}
              pokemon={p}
              override={override}
              hasOverride={hasOverride}
              formes={formes}
              natureOptions={natureOptions}
              onChange={(updates) => onChangeOverride(p, updates)}
              onSave={() => onSaveOverride(p)}
              spriteCacheState={spriteCacheState}
            />
          );
        })}
      </div>
    </div>
  );
}
