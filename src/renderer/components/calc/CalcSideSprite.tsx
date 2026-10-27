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

const GIF_SCALE = 1.2;

/**
 * Decorative semi-transparent animated sprite sitting behind a side's move
 * grid, in the space the grid's narrow width leaves free, spanning the
 * grid row's full height. Always animated
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
  const [loaded, setLoaded] = useState<{ url: string; w: number; h: number } | null>(null);
  const animatedReady = !!animatedUrl && loaded?.url === animatedUrl;
  const staticUrl = resolveCalcPokemonSpriteUrl(species, gender, roster);
  if (!animatedUrl && !staticUrl) return null;

  const position: CSSProperties = side === 'left' ? { left: 0 } : { right: 0 };
  // Showdown GIFs vary a lot in native size (Charizard 133x140, Mega Y 201x166),
  // so a multiplier large enough to hit the box cap on every species flattens
  // them to different effective scales and makes Megas look smaller. A modest
  // uniform scale keeps relative species size true; the cap only bites on the
  // very largest sprites.
  const gifSize: CSSProperties = loaded
    ? {
        width: loaded.w * GIF_SCALE,
        height: loaded.h * GIF_SCALE,
        maxWidth: '100%',
        maxHeight: '100%',
      }
    : {};
  const imgBase =
    'absolute inset-0 m-auto object-contain transition-opacity duration-200 [image-rendering:pixelated]';
  return (
    // Opacity lives on the wrapper so the two cross-fading images don't stack
    // to a darker combined opacity mid-fade.
    <div
      aria-hidden
      style={position}
      className="absolute inset-y-0 z-0 w-64 opacity-40 pointer-events-none select-none"
    >
      {/* Showdown's CDN answers a cold 404 in 7-20s, so the static sprite shows
          first and cross-fades to the GIF only once it has actually loaded; a
          missing GIF just never swaps, with no error handling needed. */}
      {staticUrl && (
        <img
          src={resolveSprite(staticUrl)}
          alt=""
          className={`${imgBase} h-full w-full ${animatedReady ? 'opacity-0' : 'opacity-100'}`}
        />
      )}
      {animatedUrl && (
        <img
          key={animatedUrl}
          src={resolveSprite(animatedUrl)}
          alt=""
          style={gifSize}
          onLoad={(e) =>
            setLoaded({
              url: animatedUrl,
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
          className={`${imgBase} ${animatedReady ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
