/**
 * TypeBadge.tsx - Pokemon Type Badge Component
 * Renders a single type badge with themed colors from pokemonTheme.ts
 */

import { getTypeTheme } from '../config/pokemonTheme';

interface TypeBadgeProps {
  type: string;
  /** Width class override - defaults to w-20; PokemonCard's type row passes a
   *  narrower one so two badges still fit side by side in a 6-column grid. */
  widthClass?: string;
}

/**
 * Displays a styled type badge with background color matching the pokemon type
 */
export default function TypeBadge({ type, widthClass = 'w-20' }: TypeBadgeProps) {
  const theme = getTypeTheme(type);

  return (
    <span
      className={`inline-block ${widthClass} shrink-0 text-center text-[10px] font-bold py-0.5 rounded-sm uppercase tracking-wider whitespace-nowrap ${theme.bg} ${theme.text}`}
    >
      {type}
    </span>
  );
}
