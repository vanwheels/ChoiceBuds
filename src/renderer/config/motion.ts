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
