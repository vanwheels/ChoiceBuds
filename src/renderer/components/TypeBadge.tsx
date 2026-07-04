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
      className={`px-3 py-1 rounded-full text-sm font-semibold uppercase ${theme.bg} ${theme.text}`}
    >
      {type}
    </span>
  );
}
