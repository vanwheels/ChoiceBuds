# Sprite Scoping — Post-Mortem

2026-10-26. Two scoping legs on animated sprites, no code built, both
shipped the same day. Two unrelated Calc tooltip legs landed in the same
window and are archived with it.

## What shipped

- **Calc Forme Sprite Load Delay** (Leg 1, `0eb6de2`): cause found.
  `getAnimatedSpriteUrl` strips the hyphen (`castformsnowy.gif`) but
  Showdown's files keep it (`castform-snowy.gif`), so every forme 404s, and
  cold 404s take 7-20s before `CalcSideSprite` falls back to static.
  Write-up in `docs/investigations/calc-forme-sprite-load-delay.md`.
- **Animated Sprite Source Scoping** (Leg 1, `6539f3e`): keep Showdown as the
  only animated source. Pokéos lacks the new Megas and ships 10-40x heavier
  GIFs; Project Pokémon's GIFs are Gen 8 only. Write-up in
  `docs/investigations/animated-sprite-source-scoping.md`.
- **Outside the milestone**: Calc Move Tooltip type/ability boost
  (`c580b34`) and its no-opponent follow-up (`3755ffe`).

Done check: all three `Done when` lines met. The only fix the write-ups call
for is tracked as `[Animated Sprite Forme Filenames] — Leg 1` in TODO.md.
994 tests, lint and type-check pass.

## What went well

- Leg 1's finding reframed Leg 2: the source comparison had to use the
  hyphenated filenames the app should request, so the Showdown baseline was
  not skewed by the same bug.
- The delay was reproduced with curl against the CDN before any app
  checking, then confirmed live by the user.

## What didn't / friction points

- The two Calc tooltip legs were started mid-milestone and are not about
  sprites, so the milestone's COMPLETED.md window mixes unrelated work.

## Scope creep observed

- The Calc tooltip legs (above). Calc Side Panel Height Parity and other
  Calc findings went to a Future Milestones section instead of into legs.

## What changes for the next milestone

- Finish or park unrelated legs before `/plan-milestone` opens a new
  milestone, so each milestone's archive holds one theme. Process note, not
  promoted to a rule.
