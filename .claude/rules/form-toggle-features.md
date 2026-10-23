---
paths:
  - "src/renderer/hooks/usePokemonFormToggle.ts"
  - "src/renderer/components/*FormToggleBadge*.tsx"
  - "src/renderer/config/megaEvolution.ts"
  - "src/renderer/config/megaAbilities.ts"
  - "src/renderer/utils/aegislashForme.ts"
  - "src/renderer/utils/battleMegaToggle.ts"
  - "src/renderer/components/battlelog/RecordMatchForm.tsx"
---

# Form-toggle feature scoping

From Mega & Alt-Form Representation's post mortem
(`docs/postmortems/mega-alt-form-representation.md`): two gaps recurred
across its legs, each caught only after live feedback instead of before
building.

- If the UI resolves an ambiguous choice (a multi-form species like
  Charizard X/Y/Z), design the correction path — what happens when the
  resolved choice is wrong — before shipping, not as a follow-up once a
  live test finds the dead end.
- If a toggle changes more than one visible property of a Pokémon
  (ability, stats, typing, sprite), list every property it must change
  before writing code. Mega Team Card Flip and the Aegislash Blade/Shield
  toggle each shipped missing one (a real sprite asset, then the sprite
  flip itself) and needed same-day follow-ups to catch up.
