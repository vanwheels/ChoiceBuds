# Mobile Teams swipe deck

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

- `src/renderer/components/MobileTeamSwipeOverlay.tsx` — the full-screen,
  swipeable card-per-Pokémon view for a team on mobile widths (below the
  `md` breakpoint). Whenever the roster has fewer than 6 Pokémon, an extra
  page past the last card opens `MobileAddPokemonPage.tsx` (wrapping the
  same `AddPokemonStatTable` desktop uses) to append a new slot; at 0
  Pokémon this becomes the overlay's only page — a dedicated empty-state
  screen with the same add affordance, replacing an earlier bail-out-and-
  auto-close effect.
- `components/Modal.tsx` sits above these swipe overlays in z-index, so a
  dialog opened from within one (e.g. Roster Swap's species picker) renders
  on top instead of being hidden behind the overlay — a prerequisite for any
  modal-opening affordance added inside the swipe deck.
