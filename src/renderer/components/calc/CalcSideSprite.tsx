import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { SpeciesRosterEntry } from '../../types/pokemon';
import { getAnimatedSpriteUrl } from '../../utils/spriteUrl';
import { resolveCalcPokemonSpriteUrl } from '../../utils/calcSpriteResolve';

interface CalcSideSpriteProps {
  species: string;
  gender: string;
  side: 'left' | 'right';
  roster: SpeciesRosterEntry[];
  resolveSprite: (remoteUrl: string) => string;
}

/**
 * Decorative semi-transparent animated sprite sitting behind a side's move
 * grid, in the space the grid's narrow width leaves free. Always animated
 * (independent of the Teams-tab "Show Animated Sprites" setting) since the
 * calc has no card chrome for a static sprite to live in. Showdown's CDN has
 * no GIF for some formes, so a load error drops to the static PokeAPI sprite.
 */
export default function CalcSideSprite({
  species,
  gender,
  side,
  roster,
  resolveSprite,
}: CalcSideSpriteProps) {
  const animatedUrl = species ? getAnimatedSpriteUrl(species, gender, false) : '';
  // Keyed to the animated URL so a species change retries the GIF instead of
  // staying stuck on the static fallback chosen for the previous species.
  const [failedUrl, setFailedUrl] = useState('');
  const useStatic = failedUrl === animatedUrl;
  const src = useStatic ? resolveCalcPokemonSpriteUrl(species, gender, roster) : animatedUrl;
  if (!src) return null;

  const position: CSSProperties = side === 'left' ? { left: 0 } : { right: 0 };
  return (
    <img
      src={resolveSprite(src)}
      alt=""
      aria-hidden
      style={position}
      onError={() => !useStatic && setFailedUrl(animatedUrl)}
      className="absolute top-1/2 -translate-y-1/2 z-0 h-28 w-28 object-contain opacity-40 pointer-events-none select-none [image-rendering:pixelated]"
    />
  );
}
