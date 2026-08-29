import { ImportedPokemonInfo } from '../types/pokemon';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { getPixelSpriteUrl } from '../utils/spriteUrl';

interface TeamCoverflowProps {
  pokemon: ImportedPokemonInfo[];
  resolveSprite: UseSpriteCacheReturn['resolveSprite'];
}

const CYCLE_SECONDS = 12;

/**
 * Collapsed team-card coverflow (design-approved 2026-08-29, see TODO.md) -
 * replaces the old flat mini-sprite-strip with a compact 3D coverflow that
 * auto-rotates through the whole roster and pauses crisp on hover. The
 * actual motion (rotateY/scale/opacity keyframes, the fixed 240x84px box)
 * lives in `index.css`'s `.coverflow*` rules; this component only supplies
 * the per-card stagger and the sprite images.
 *
 * Staggers cards evenly around the fixed 12s cycle regardless of roster size
 * (a mid-build team may have fewer than 6 Pokemon) - `--cf-delay-step`
 * shrinks as the roster grows so a full 6-mon team reproduces the mockup's
 * exact -2s-per-card spacing.
 */
export default function TeamCoverflow({ pokemon, resolveSprite }: TeamCoverflowProps) {
  if (pokemon.length === 0) {
    return <div className="coverflow" />;
  }

  const delayStep = CYCLE_SECONDS / pokemon.length;

  return (
    <div className="coverflow">
      {pokemon.map((p, idx) => (
        <div
          key={idx}
          className="coverflow-card"
          style={{ '--cf-index': idx, '--cf-delay-step': `-${delayStep}s` } as React.CSSProperties}
        >
          <img
            src={resolveSprite(getPixelSpriteUrl(p.pokedexNumber, p.showdownData.species, p.showdownData.gender || 'M', p.showdownData.shiny))}
            alt={p.showdownData.species}
            className="w-[38px] h-[38px] object-contain [image-rendering:pixelated]"
          />
        </div>
      ))}
      <div className="coverflow-center-ring" />
      <div className="coverflow-pause-badge" title="Paused">
        <svg viewBox="0 0 24 24" width="9" height="9" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      </div>
    </div>
  );
}
