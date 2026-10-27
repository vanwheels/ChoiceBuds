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
Task Tracking rules for the full section-lifecycle (`## Current Milestone:
<name>` → `MILESTONES.md` + `COMPLETED.md` on ship). Finished work moves to
[COMPLETED.md](COMPLETED.md).

## Current Milestone: Sprite, Filter & Search Fixes

Done when:
- Forme sprites (Castform-Snowy, Landorus-Therian, Mega X/Y) load their
  animated GIF in the Calc without a 404 or visible delay; the static sprite
  shows first.
- Mega Golisopod appears under the Steel filter in + Add Pokemon, and other
  Megas with altered typing are checked.
- Searching a species name in team search returns every team containing it,
  on both app and web.

- **[Animated Sprite Forme Filenames] — Leg 1** *(Last touched: 2026-10-27 ·
  Re-checks: 0)*
  `getAnimatedSpriteUrl` strips the hyphen from forme names, but Showdown's
  files keep it (`castform-snowy.gif`, `landorus-therian.gif`,
  `charizard-megax.gif`), so every forme 404s - slowly on a cold miss - and
  falls back to static. Fix the id rule (existing tests assert the buggy
  output; needs the user's confirmation to change), and have
  `CalcSideSprite` show the static sprite first. See
  [docs/investigations/calc-forme-sprite-load-delay.md](docs/investigations/calc-forme-sprite-load-delay.md).
  Done check: forme sprites load animated in the Calc with no visible delay;
  full suite passes. Manual verification: yes. Review: no.

- **[Mega Golisopod Steel Filter Bug] — Leg 1** *(Last touched: 2026-10-27 ·
  Re-checks: 0)*
  Found during manual testing: Mega Golisopod doesn't show up under the
  Steel filter in + Add Pokemon. Likely cause: species filtering there
  isn't accounting for the type change caused by mega evolving, so
  Golisopod's base typing is used instead of its Mega's. Scope the cause,
  check whether other Megas with altered typing are affected, then fix; if
  the cause is non-trivial, split scoping from the fix.
  Done check: Mega Golisopod shows under Steel and every other affected Mega
  is covered by a test. Manual verification: yes. Review: no.

- **[Team Search by Species] — Leg 1 (scoping)** *(Last touched: 2026-10-27 ·
  Re-checks: 0)*
  Searching a Pokémon's name in any team search should return every team
  containing that Pokémon. Scoping only: list which search boxes exist
  across app and web and decide whether one shared matcher can serve them
  all. No code; ends at the written plan.
  Done check: scope written up (investigation doc or TODO body) with Leg 2
  defined. Manual verification: no. Review: no.

- **[Team Search by Species] — Leg 2** *(Last touched: 2026-10-27 ·
  Re-checks: 0)*
  Build the shared species matcher and wire it into each team search box
  found in Leg 1, with tests written from the stated rule (name search
  returns every team containing that species). Final shape depends on Leg 1.
  Done check: species search works on app and web; full suite passes.
  Manual verification: yes. Review: yes if Leg 1 finds it spans several
  systems.

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

(Empty - bundled into the current milestone 2026-10-27.)

## Future Milestones (unscheduled)

### Calc Follow-ups (own milestone, not yet planned)

Deferred out of Sprite Scoping (2026-10-26) so that milestone stays
scoping-only. Plan with `/plan-milestone` when picked up.

- **[Calc Side Panel Height Parity] — Leg 1** *(Last touched: 2026-10-26 ·
  Re-checks: 0)*
  Found verifying Box Integration Leg 6: the two Pokémon panels' heights differ
  depending on whether a species is loaded and whether it has a Base/Mega or
  other forme toggle row, so the sides (and their Box panels below) don't line
  up. Make both sides reserve the same height regardless of content.

- **[Calc Item Picker: Champions Items & Full Scroll] — Leg 1** *(Last touched:
  2026-10-26 · Re-checks: 0)*
  Found verifying Sprites & Icons Leg 2: the Calc item picker lists every
  mainline item (`useDamageCalc.ts` builds `itemOptions` from `gen.items`)
  instead of just Champions items (`VGC_ITEMS` in `config/vgcData.ts` is the
  likely source). The list also stops scrolling partway because
  `CalcAutocomplete.tsx` slices results to `MAX_RESULTS = 50`. Keep a path to
  all items later (e.g. the Leg 5 "All" section). Also confirm every Champions
  item has an icon.

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

