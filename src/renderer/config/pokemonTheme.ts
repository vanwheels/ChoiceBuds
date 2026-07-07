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
 * Default fallback theme for unknown types
 */
export const DEFAULT_TYPE_THEME: TypeTheme = {
  bg: 'bg-gray-300',
  text: 'text-gray-900',
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
