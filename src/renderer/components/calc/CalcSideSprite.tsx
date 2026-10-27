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
 * calc has no card chrome for a static sprite to live in. Shows the static
 * PokeAPI sprite first and swaps to the GIF once it loads.
 */
export default function CalcSideSprite({
  species,
  gender,
  side,
  roster,
  resolveSprite,
}: CalcSideSpriteProps) {
  const animatedUrl = species ? getAnimatedSpriteUrl(species, gender, false) : '';
  // Keyed to the animated URL so a species change starts over on the static
  // sprite instead of inheriting the previous species' loaded state.
  const [loadedUrl, setLoadedUrl] = useState('');
  const animatedReady = !!animatedUrl && loadedUrl === animatedUrl;
  const staticUrl = resolveCalcPokemonSpriteUrl(species, gender, roster);
  if (!animatedUrl && !staticUrl) return null;

  const position: CSSProperties = side === 'left' ? { left: 0 } : { right: 0 };
  const className =
    'absolute top-1/2 -translate-y-1/2 z-0 h-28 w-28 object-contain opacity-40 pointer-events-none select-none [image-rendering:pixelated]';
  return (
    <>
      {/* Showdown's CDN answers a cold 404 in 7-20s, so the static sprite shows
          first and the GIF swaps in only once it has actually loaded; a missing
          GIF just never swaps, with no error handling needed. */}
      {!animatedReady && staticUrl && (
        <img
          src={resolveSprite(staticUrl)}
          alt=""
          aria-hidden
          style={position}
          className={className}
        />
      )}
      {animatedUrl && (
        <img
          key={animatedUrl}
          src={resolveSprite(animatedUrl)}
          alt=""
          aria-hidden
          style={position}
          onLoad={() => setLoadedUrl(animatedUrl)}
          className={animatedReady ? className : 'hidden'}
        />
      )}
    </>
  );
}
