/**
 * Static theme lookup dictionary for Pokémon types and move categories
 * Maps type tags to Tailwind CSS utility classes for unified badge styling
 * All color definitions are centralized here - no inline hex values allowed
 */

/**
 * Type badge theme configuration
 * Each type maps to background and text color Tailwind classes
 */
export interface TypeTheme {
  bg: string;
  text: string;
}

/**
 * Pokémon type color mappings (all 18 types)
 * Uses Tailwind utility classes for consistent theming
 */
export const TYPE_THEMES: Record<string, TypeTheme> = {
  normal: {
    bg: 'bg-gray-400',
    text: 'text-gray-900',
  },
  fire: {
    bg: 'bg-orange-500',
    text: 'text-white',
  },
  water: {
    bg: 'bg-blue-500',
    text: 'text-white',
  },
  electric: {
    bg: 'bg-yellow-400',
    text: 'text-gray-900',
  },
  grass: {
    bg: 'bg-green-500',
    text: 'text-white',
  },
  ice: {
    bg: 'bg-cyan-300',
    text: 'text-gray-900',
  },
  fighting: {
    bg: 'bg-red-600',
    text: 'text-white',
  },
  poison: {
    bg: 'bg-purple-500',
    text: 'text-white',
  },
  ground: {
    bg: 'bg-yellow-600',
    text: 'text-white',
  },
  flying: {
    bg: 'bg-indigo-400',
    text: 'text-white',
  },
  psychic: {
    bg: 'bg-pink-500',
    text: 'text-white',
  },
  bug: {
    bg: 'bg-lime-500',
    text: 'text-gray-900',
  },
  rock: {
    bg: 'bg-yellow-700',
    text: 'text-white',
  },
  ghost: {
    bg: 'bg-purple-700',
    text: 'text-white',
  },
  dragon: {
    bg: 'bg-indigo-600',
    text: 'text-white',
  },
  dark: {
    bg: 'bg-gray-800',
    text: 'text-white',
  },
  steel: {
    bg: 'bg-gray-500',
    text: 'text-white',
  },
  fairy: {
    bg: 'bg-pink-300',
    text: 'text-gray-900',
  },
};

/**
 * Move category theme configuration
 * Maps physical/special/status to color schemes
 */
export interface MoveCategoryTheme {
  bg: string;
  text: string;
  border: string;
}

/**
 * Move category color mappings
 * Physical = red, Special = blue, Status = gray
 */
export const MOVE_CATEGORY_THEMES: Record<string, MoveCategoryTheme> = {
  physical: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
  },
  special: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
  },
  status: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
  },
};

/**
 * Default fallback theme for unknown types
 */
export const DEFAULT_TYPE_THEME: TypeTheme = {
  bg: 'bg-gray-300',
  text: 'text-gray-900',
};

/**
 * Default fallback theme for unknown move categories
 */
export const DEFAULT_MOVE_CATEGORY_THEME: MoveCategoryTheme = {
  bg: 'bg-gray-100',
  text: 'text-gray-700',
  border: 'border-gray-300',
};

/**
 * Retrieves theme for a given Pokémon type
 * @param type - Type name (case-insensitive)
 * @returns TypeTheme object with Tailwind classes
 */
export function getTypeTheme(type: string): TypeTheme {
  const normalizedType = type.toLowerCase().trim();
  return TYPE_THEMES[normalizedType] || DEFAULT_TYPE_THEME;
}

/**
 * Retrieves theme for a given move category
 * @param category - Category name (physical/special/status, case-insensitive)
 * @returns MoveCategoryTheme object with Tailwind classes
 */
export function getMoveCategoryTheme(category: string): MoveCategoryTheme {
  const normalizedCategory = category.toLowerCase().trim();
  return MOVE_CATEGORY_THEMES[normalizedCategory] || DEFAULT_MOVE_CATEGORY_THEME;
}
