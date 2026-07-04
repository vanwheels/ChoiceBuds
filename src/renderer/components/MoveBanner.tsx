/**
 * MoveBanner.tsx - Pokemon Move Banner Component
 * Renders a horizontal move banner with type-based coloring
 */

import { getTypeTheme } from '../config/pokemonTheme';

interface MoveBannerProps {
  moveName: string;
  moveType?: string;
}

/**
 * Displays a move as a colored banner row
 * If moveType is provided, uses type-themed colors; otherwise uses default styling
 */
export default function MoveBanner({ moveName, moveType }: MoveBannerProps) {
  const theme = moveType ? getTypeTheme(moveType) : null;

  return (
    <div
      className={`px-3 py-2 rounded border ${
        theme
          ? `${theme.bg} ${theme.text} border-opacity-50`
          : 'bg-gray-800 text-gray-200 border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{moveName}</span>
        {moveType && (
          <span className="text-xs uppercase opacity-75">{moveType}</span>
        )}
      </div>
    </div>
  );
}
