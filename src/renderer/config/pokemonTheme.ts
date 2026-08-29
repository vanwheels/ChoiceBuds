/**
 * Static theme lookup dictionary for Pokémon types and move categories
 * Maps type tags to Tailwind CSS utility classes for unified badge styling
 * All color definitions are centralized here - no inline hex values allowed
 */

/**
 * Type badge theme configuration
 * Each type maps to background and text color Tailwind classes, plus a hex
 * `glow` value for the per-type card-glow effect (see `getTypeGlowColors`
 * below). `glow` is a plain hex string rather than a Tailwind class because
 * it feeds a dynamic inline CSS custom property (a two-color gradient whose
 * stops vary per Pokémon), which Tailwind's class-based colors can't express -
 * `bg`/`text` stay Tailwind classes since badges are static per-type.
 */
export interface TypeTheme {
  bg: string;
  text: string;
  glow?: string;
}

/**
 * Pokémon type color mappings (all 18 types)
 * Uses Tailwind utility classes for consistent theming
 */
export const TYPE_THEMES: Record<string, TypeTheme> = {
  normal: {
    bg: 'bg-zinc-400',
    text: 'text-zinc-900',
    glow: '#a1a1aa',
  },
  fire: {
    bg: 'bg-orange-500',
    text: 'text-white',
    glow: '#f97316',
  },
  water: {
    bg: 'bg-blue-500',
    text: 'text-white',
    glow: '#3b82f6',
  },
  electric: {
    bg: 'bg-yellow-400',
    text: 'text-zinc-900',
    glow: '#facc15',
  },
  grass: {
    bg: 'bg-green-500',
    text: 'text-white',
    glow: '#22c55e',
  },
  ice: {
    bg: 'bg-cyan-300',
    text: 'text-zinc-900',
    glow: '#67e8f9',
  },
  fighting: {
    bg: 'bg-red-600',
    text: 'text-white',
    glow: '#dc2626',
  },
  poison: {
    bg: 'bg-purple-500',
    text: 'text-white',
    glow: '#a855f7',
  },
  ground: {
    bg: 'bg-yellow-600',
    text: 'text-white',
    glow: '#ca8a04',
  },
  flying: {
    bg: 'bg-indigo-400',
    text: 'text-white',
    glow: '#818cf8',
  },
  psychic: {
    bg: 'bg-pink-500',
    text: 'text-white',
    glow: '#ec4899',
  },
  bug: {
    bg: 'bg-lime-500',
    text: 'text-zinc-900',
    glow: '#84cc16',
  },
  rock: {
    bg: 'bg-yellow-700',
    text: 'text-white',
    glow: '#a16207',
  },
  ghost: {
    bg: 'bg-purple-700',
    text: 'text-white',
    glow: '#7e22ce',
  },
  dragon: {
    bg: 'bg-indigo-600',
    text: 'text-white',
    // Glow-safe variant, not the badge hex (#4f46e5) - see the file-level
    // comment on GLOW_SAFE_OVERRIDES below.
    glow: '#6366f1',
  },
  dark: {
    bg: 'bg-zinc-800',
    text: 'text-white',
    // Glow-safe variant, not the badge hex (#27272a) - see the file-level
    // comment on GLOW_SAFE_OVERRIDES below.
    glow: '#524267',
  },
  steel: {
    bg: 'bg-zinc-500',
    text: 'text-white',
    glow: '#71717a',
  },
  fairy: {
    bg: 'bg-pink-300',
    text: 'text-zinc-900',
    glow: '#f9a8d4',
  },
};

/**
 * Default fallback theme for unknown types
 */
export const DEFAULT_TYPE_THEME: TypeTheme = {
  bg: 'bg-zinc-300',
  text: 'text-zinc-900',
  glow: '#71717a',
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
 * Per-type roster-card glow ring (design-approved 2026-08-29, see TODO.md's
 * color-palette-rework entry): each Pokémon card in the expanded roster grid
 * gets a soft colored ring/glow using these two type colors as gradient
 * stops (a single-typed Pokémon gets the same color twice, degenerating the
 * gradient to a solid tone) - `PokemonCard.tsx`'s `.type-glow-ring` CSS
 * (see `index.css`) consumes the result via `--glow-c1`/`--glow-c2` custom
 * properties.
 *
 * Most types reuse their badge hex directly. Two needed a "glow-safe"
 * override instead - same hue, lightness floor raised - because their badge
 * hex reads as barely-there when blurred against the app's own near-black
 * surfaces rather than a visible colored glow: Dark (badge zinc-800/
 * `#27272a`, glow `#524267`) and Dragon (badge indigo-600/`#4f46e5`, glow
 * `#6366f1`). This was a full audit against all 18 types' actual glow
 * appearance, not a one-off fix for just these two - the other 16 read fine
 * as glows at their badge lightness (confirmed during the design pass).
 * Revisit this table (not the badge `bg`/`text` colors, which are unaffected
 * and stay exactly as designed) if a future type-badge recolor makes a
 * previously-fine type start reading as invisible or muddy as a glow.
 */
export function getTypeGlowColors(types: string[]): [string, string] {
  const c1 = (types[0] ? getTypeTheme(types[0]).glow : undefined) ?? DEFAULT_TYPE_THEME.glow!;
  const c2 = types[1] ? (getTypeTheme(types[1]).glow ?? DEFAULT_TYPE_THEME.glow!) : c1;
  return [c1, c2];
}

/**
 * Move flag badge theme configuration (see config/moveFlags.ts) - one color
 * per flag so Sound/Bullet/Punch/etc. tags stay visually distinct from each
 * other and from type badges.
 */
export const MOVE_FLAG_THEMES: Record<string, TypeTheme> = {
  contact: { bg: 'bg-zinc-400', text: 'text-zinc-900' },
  bite: { bg: 'bg-amber-600', text: 'text-white' },
  sound: { bg: 'bg-fuchsia-500', text: 'text-white' },
  punch: { bg: 'bg-rose-500', text: 'text-white' },
  bullet: { bg: 'bg-stone-500', text: 'text-white' },
  pulse: { bg: 'bg-violet-500', text: 'text-white' },
  slicing: { bg: 'bg-slate-400', text: 'text-zinc-900' },
  wind: { bg: 'bg-teal-400', text: 'text-zinc-900' },
};

export function getMoveFlagTheme(flag: string): TypeTheme {
  return MOVE_FLAG_THEMES[flag] || DEFAULT_TYPE_THEME;
}

/**
 * Pokepaste/Showdown-standard per-stat text color convention (HP red, Atk
 * orange, Def yellow, SpA blue, SpD green, Spe pink), keyed by the short
 * label ('HP'/'Atk'/'Def'/'SpA'/'SpD'/'Spe') both Teams' StatsColumn/
 * EVStatCell and Calc's CalcStatRows already use - the two tabs key their
 * actual stat objects differently (EVSpread's `attack`/`specialAttack` vs.
 * @smogon/calc's `atk`/`spa`), so keying by the shared display label avoids
 * reconciling those two enums into one.
 */
export const STAT_LABEL_COLORS: Record<string, string> = {
  HP: 'text-red-400',
  Atk: 'text-orange-400',
  Def: 'text-yellow-400',
  SpA: 'text-blue-400',
  SpD: 'text-green-400',
  Spe: 'text-pink-400',
};

export function getStatLabelColor(label: string): string {
  return STAT_LABEL_COLORS[label] || 'text-zinc-400';
}

/**
 * Per-regulation accent color (Teams list row accent stripe + RegulationBadge)
 * - keyed by the `RegulationId` type in utils/pokemonRules.ts. Purely a
 * visual distinction between Reg M-A/M-B at a glance; carries no legality
 * meaning of its own.
 */
export const REGULATION_THEMES: Record<string, { accentBorder: string; badgeBg: string }> = {
  'REG-MA': { accentBorder: 'border-l-blue-500', badgeBg: 'bg-blue-600 hover:bg-blue-500' },
  'REG-MB': { accentBorder: 'border-l-purple-500', badgeBg: 'bg-purple-600 hover:bg-purple-500' },
};

export function getRegulationTheme(regulationId: string): { accentBorder: string; badgeBg: string } {
  return REGULATION_THEMES[regulationId] || { accentBorder: 'border-l-zinc-600', badgeBg: 'bg-zinc-600 hover:bg-zinc-500' };
}
