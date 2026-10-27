---
paths:
  - "src/renderer/components/Calc*"
  - "src/renderer/hooks/useDamageCalc*"
---

# Calc: entry paths and popovers

**Every way a Pokémon enters Calc state must run the same side effects.**
Box loading left the Battle Log opponent link set (it would have written the
set back into the opponent entry) and skipped usage-% / spread-chip loading,
because both were wired only to the autocomplete pick (Calc Page Rework
Legs 6 and 7; see `docs/postmortems/calc-page-rework.md`). Before adding or
changing a load path, list the entry points (autocomplete, Team tray, Opponent
tray, Box panel, drag-drop) and confirm each one clears linked state and runs
the usage loaders. Command: `grep -rn "getChampionsUsage\|getCachedChampionsUsage" src/renderer/components src/renderer/hooks/useDamageCalc*` (every Calc load path must reach it).

**Check ancestor clipping before building a popover inside a card.** The
Calc Nature/Status dropdown panels took five fix commits (`bb1f38f`,
`e54f72a`, `7b7b526`, `4fcedab`, `3899328`) for being clipped or layered
under the HP inputs. Before placing a panel, check the ancestors' `overflow`
and stacking context, and size the panel to its trigger from the start.
