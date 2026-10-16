---
paths:
  - "src/renderer/components/**"
---

# Layout breakpoint and positioning verification

When tuning a layout breakpoint or width, verify with a DOM overflow check
(`scrollWidth` vs. `clientWidth`, element bounds vs. container bounds) at
the narrowest width the breakpoint allows, not only at the target device's
width. Checking a single fixed floor (e.g. one sprite box) on a resized
window and calling it done has shipped a wrong fix before — it missed
content that wraps or overflows elsewhere in the same card (type badges,
move names, the SP row). See `docs/postmortems/macbook-pass.md`.

When a position/animation bug behaves inconsistently across sibling
instances of the same component, check whether the calculation is anchored
to the right DOM node first — two separate bugs (tooltip positioning,
collapse flicker) both traced back to a calculation anchored to an
individual item instead of its shared container. See
`docs/postmortems/ui-polish-performance.md`.
