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
  spriteCacheState: UseSpriteCacheReturn;
}

export default function TeamPreviewStrip({ pokemon, allSpecies, natureOptions, overrides, onChangeOverride, spriteCacheState }: TeamPreviewStripProps) {
  if (pokemon.length === 0) return null;

  return (
    <div className="bg-zinc-800 rounded-lg p-3">
      <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-2">
        Team Preview - session-only Speed SP / nature / form overrides, not saved to the team
      </p>
      <div className="flex flex-wrap gap-2">
        {pokemon.map(p => {
          const override = overrides.get(p.id) ?? defaultSpeedOverride(p);
          const formes = getFormeFamily(allSpecies, override.species);
          return (
            <TeamPreviewCard
              key={p.id}
              pokemon={p}
              override={override}
              formes={formes}
              natureOptions={natureOptions}
              onChange={(updates) => onChangeOverride(p, updates)}
              spriteCacheState={spriteCacheState}
            />
          );
        })}
      </div>
    </div>
  );
}
