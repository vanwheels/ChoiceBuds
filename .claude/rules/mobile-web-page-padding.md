---
paths:
  - "src/renderer/AppWeb.tsx"
  - "src/renderer/components/**"
---

# Mobile-web page padding

- `AppWeb.tsx`'s `<main>` is deliberately unpadded below the `md` breakpoint,
  so every tab rendered inside it (Battle Log, Statistics, Type Matchup,
  Speed Tiers, Settings, plus `RecordMatchForm`'s in-place record/edit view)
  supplies its own `px-4 md:px-0` on its root container instead — matching
  `TeamsPage.tsx`/`BoxPageGrid.tsx`'s existing pattern. A new mobile-web page
  needs the same `px-4 md:px-0` or it renders edge-to-edge below `md`; don't
  add padding to `AppWeb.tsx`'s `<main>` itself, since that would double up
  on pages that already have their own.
