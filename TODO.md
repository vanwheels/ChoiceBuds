# ChoiceBuds TODO

Working task list for ongoing/planned work. Every item is titled
`[Item/Sweep Name] — Leg N` (say "Start [title]" to kick off a session on
it). Bodies stay short — commit-message-body length, not an investigation
log; deep cross-checks/history belong in `docs/investigations/<topic>.md`,
linked from the item. `Last touched` + `Re-checks` are tracked per item; no
status enum otherwise — absence of a `Blocked:` line means open. Blocked
items are exempt from the re-check counter and live in their own tier below
rather than mixed into the active list. This file adopted that format as of
2026-08-31 — all re-check counters started at 0 then regardless of how long
an item had been sitting. Reordered into priority order 2026-08-31; within
the current milestone and "Unscheduled", items are listed highest-to-lowest
priority. Only one milestone is "current" at a time — see root `CLAUDE.md`'s
Task Tracking rules for the full section-lifecycle.

## Current Milestone: Calc Follow-ups

Done when:

- Selecting a forme or Mega in the calc shows no visible sprite pop or size
  jump.
- Both calc side panels and their Box panels line up regardless of loaded
  species or forme toggle row.
- The calc item picker lists only Champions items, scrolls fully, and every
  Champions item has an icon.
- A test fails on any Mega stone whose `getMegaApiSlug` doesn't resolve to a
  valid PokeAPI resource name.

- **[Calc Item Picker: Champions Items & Full Scroll] — Leg 1** *(Last
  touched: 2026-10-27 · Re-checks: 0)*
  Found verifying Sprites & Icons Leg 2: the Calc item picker lists every
  mainline item (`useDamageCalc.ts` builds `itemOptions` from `gen.items`)
  instead of just Champions items (`VGC_ITEMS` in `config/vgcData.ts` is the
  likely source). The list also stops scrolling partway because
  `CalcAutocomplete.tsx` slices results to `MAX_RESULTS = 50`. Keep a path to
  all items later (e.g. the Leg 5 "All" section). Also confirm every Champions
  item has an icon; split the icon audit into its own leg if it turns up many
  gaps. Done check: picker shows only Champions items, scrolls through all of
  them, none missing an icon. Manual verification: yes. Review: no.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[In-App Auto-Update: macOS] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: user needs a paid Apple Developer account ($99/yr) + notarization.
  Windows shipped in v0.2.1 (see COMPLETED.md). macOS is blocked: Squirrel.Mac
  (what `electron-updater` uses there) requires code signing to auto-update
  at all, and Gatekeeper heavily restricts unsigned builds regardless. Once
  unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'` guard
  in `main.ts` is the one line to revisit.
  - Separately, a paid Windows code-signing cert (~$100-400+/yr) isn't
    required for Windows auto-update to function, but would remove the
    SmartScreen warning — not yet decided.

- **[TypeScript 7 Upgrade] — Leg 1** *(Last touched: not recorded ·
  Re-checks: 0)*
  Blocked: waiting on real `typescript-eslint` 7.x support.
  `typescript-eslint` doesn't support TypeScript 7.0.2 yet (confirmed
  peer-range rejection + real runtime crash reports). Currently on
  TypeScript ^6.0.3.

## Unscheduled (not yet scoped, highest-to-lowest priority)

## Future Milestones (unscheduled)

Password reset flow, deferred out of Web Version: Teams & Box MVP's scoping
(2026-09-29, see `docs/investigations/web-version-scope.md`) - not yet
worth its own leg: needs a transactional email API + SPF/DKIM
deliverability setup on a dedicated vannyproductions.com subdomain.

Public route bundle split (noted 2026-10-18, during Profile Page Sections &
Layout Leg 3's routing discussion): `/u/<username>` currently shares the
main `web/` bundle with the full signed-in app (`web/main.tsx` statically
imports both `AppWeb` and `PublicProfilePage`) rather than being a
dedicated lightweight bundle the way `web/download/` is - `PublicProfilePage`
just never calls the heavier Teams/Box/sync hooks, so the "no app state for
anonymous visitors" goal is achieved at the runtime-behavior level, not the
bundle-size level (an anonymous `/u/<username>` visitor still downloads the
entire app bundle). Worth splitting into a dedicated `web/public/` Vite
entry (served via the same `404.html` redirect trick `/u/<username>`
already uses, since it needs a dynamic path segment `web/download/`
doesn't) once a second public dynamic route actually gets built - e.g.
public team displays not tied to a profile. Not worth restructuring the
build for a pattern with only one real example today.

