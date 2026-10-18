/**
 * tourneyEventTheme.ts - Tourney Event Tier Badge Styling
 * Static label/color table for config/tourneyEvents.ts's TourneyEventTier,
 * same "theme table lives in config/" pattern as pokemonTheme.ts's
 * REGULATION_THEMES - never inlined in TourneyEventCard.tsx itself.
 */

import type { TourneyEventTier } from './tourneyEvents';

export const TOURNEY_EVENT_TIER_THEMES: Record<
  TourneyEventTier,
  { label: string; badgeBg: string }
> = {
  regional: { label: 'Regional', badgeBg: 'bg-zinc-600' },
  special: { label: 'Special Event', badgeBg: 'bg-sky-600' },
  international: { label: 'International', badgeBg: 'bg-purple-600' },
  worlds: { label: 'Worlds', badgeBg: 'bg-accent-gold' },
};

export function getTourneyEventTierTheme(tier: TourneyEventTier) {
  return TOURNEY_EVENT_TIER_THEMES[tier];
}
