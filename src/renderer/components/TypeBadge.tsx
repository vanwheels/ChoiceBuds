/**
 * TypeBadge.tsx - Pokemon Type Badge Component
 * Renders a single type badge with themed colors from pokemonTheme.ts
 */

import { getTypeTheme } from '../config/pokemonTheme';

interface TypeBadgeProps {
  type: string;
}

/**
 * Displays a styled type badge with background color matching the pokemon type
 */
export default function TypeBadge({ type }: TypeBadgeProps) {
  const theme = getTypeTheme(type);

  return (
    <span
      className={`w-16 text-center text-[10px] font-bold py-0.5 rounded-sm uppercase tracking-wider ${theme.bg} ${theme.text}`}
    >
      {type}
    </span>
  );
}
