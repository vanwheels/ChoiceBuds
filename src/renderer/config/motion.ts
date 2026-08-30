/**
 * motion.ts - Framer Motion duration/easing scale
 * Central home for the app-wide animation timings approved 2026-08-29 (see
 * TODO.md's "Animation/motion language" entry) - Framer Motion is the app's
 * general-purpose animation engine (modals, card expand/collapse, sidebar
 * collapse, drag-reorder), so every `transition` prop should pull from here
 * rather than inlining ad hoc durations per component, matching the
 * project's usual rule that static config tables live under config/, never
 * inlined.
 *
 * Three duration buckets (bigger layout shifts get more time), entrances
 * ease-out (decelerate in), exits ease-in and noticeably faster than their
 * matching entrance - dismissal should feel snappier than appearance:
 *   - micro (~150ms): hover/press micro-interactions (already in use for the
 *     sidebar's icon hover-scale, kept as plain CSS there rather than
 *     ported - see Sidebar.tsx)
 *   - standard (200-280ms): modals, card-expand height, content fades
 *   - deliberate (320-340ms): sidebar width, drag-reorder repositioning
 */

export const MICRO_DURATION = 0.15;
export const STANDARD_ENTER_DURATION = 0.22;
export const STANDARD_EXIT_DURATION = 0.15;
export const DELIBERATE_DURATION = 0.32;

/** Modal overlay (backdrop) fade - same in both directions, the panel itself carries the asymmetry. */
export const MODAL_OVERLAY_TRANSITION = { duration: STANDARD_EXIT_DURATION, ease: 'easeInOut' } as const;

/** Modal panel enter: standard bucket, ease-out (decelerate in). */
export const MODAL_PANEL_ENTER_TRANSITION = { duration: STANDARD_ENTER_DURATION, ease: 'easeOut' } as const;

/** Modal panel exit: standard bucket, faster than its matching entrance, ease-in (accelerate out). */
export const MODAL_PANEL_EXIT_TRANSITION = { duration: STANDARD_EXIT_DURATION, ease: 'easeIn' } as const;

/** Card expand (height + content fade) enter: standard bucket, ease-out (decelerate in). */
export const CARD_EXPAND_ENTER_TRANSITION = { duration: STANDARD_ENTER_DURATION, ease: 'easeOut' } as const;

/** Card expand exit: standard bucket, faster than its matching entrance, ease-in (accelerate out). */
export const CARD_EXPAND_EXIT_TRANSITION = { duration: STANDARD_EXIT_DURATION, ease: 'easeIn' } as const;

/**
 * Sidebar rail width toggle: deliberate bucket. Symmetric ease-out in both
 * directions (collapse and expand alike) rather than the enter/ease-out vs.
 * exit/ease-in split used for modals/card-expand - this is a toggle between
 * two steady states, not a mount/unmount, and the design-approved demo
 * (`SidebarDemo.dc.html`) only ever specified one duration/easing for the
 * rail width itself.
 */
export const SIDEBAR_WIDTH_TRANSITION = { duration: DELIBERATE_DURATION, ease: 'easeOut' } as const;
