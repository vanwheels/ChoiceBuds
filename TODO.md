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

Saved Builds Box shipped 2026-09-11 (all 8 legs - see `COMPLETED.md` and
`MILESTONES.md`). Building Flow Tweaks shipped 2026-09-11 (see
`COMPLETED.md` and `MILESTONES.md`). Regular Calc Popup shipped 2026-09-13
(see `COMPLETED.md` and `MILESTONES.md`) - includes the retired Live Calc
Tuning work that preceded its pivot; see
[docs/postmortems/regular-calc-popup.md](docs/postmortems/regular-calc-popup.md)
for the full arc. VGCPastes Real-Set Sourcing promoted to current milestone
2026-09-14 (folds in the Tailwind/Terrain-Ability Speed Modeling leg that
had been sitting in Unscheduled); its own Scoping leg finished the same day,
splitting into a Sample Team Catalog leg and a Per-Species Real-Set
Extraction leg (see `COMPLETED.md`). Sample Team Catalog Legs 1, 2, 3, and 4
shipped the same day (see `COMPLETED.md`). Per-Species Real-Set Extraction's
own scoping pass finished 2026-09-15, splitting into an Extraction Pipeline &
Cache leg and a Calc Panel Real Sets UI leg; both shipped 2026-09-15 (see
`COMPLETED.md`). Calc Real Sets Section: Visual Polish Legs 1 and 2 shipped
2026-09-15 (see `COMPLETED.md`). Team Builder Real Sets Integration's own
Scoping leg finished the same day, splitting into a build leg; that build leg
(Leg 2) also shipped 2026-09-15 (see `COMPLETED.md`). VGCPastes Sample Team
Catalog: Search/Filter Leg 1 shipped 2026-09-15 (see `COMPLETED.md`). Team
Builder Stat Display: SP / Base / Real Total Toggle Leg 1 - unrelated in
topic, just pulled into this milestone's current-milestone slot per Vanny's
call since only one milestone can be "current" at a time - also shipped
2026-09-15 (see `COMPLETED.md`). VGCPastes Real-Set Sourcing milestone
shipped 2026-09-15 (see `MILESTONES.md` and
[docs/postmortems/vgcpastes-real-set-sourcing.md](docs/postmortems/vgcpastes-real-set-sourcing.md)).
[Calc Stat Rows: SP / Stat Total Toggle] — Leg 1 was killed 2026-09-16
instead of scoped - see `COMPLETED.md`. Maintenance & Bug Fix Sweep promoted
to current milestone 2026-09-16, pulling in three previously-Unscheduled
items plus a newly-reported Real Sets bug. [Real Sets: Mega Evolution
Species Matching Bug] — Leg 1 shipped the same day (see `COMPLETED.md`).
[Team Gap Analysis: Usage Cutoff Tuning] — Leg 1 resolved (decision, no
diff to the cutoff) 2026-09-16 (see `COMPLETED.md`). [Dev Console GPU
Overlay Error Noise] — Leg 1 shipped the same day (see `COMPLETED.md`).
Maintenance & Bug Fix Sweep milestone shipped 2026-09-16 (see
`MILESTONES.md` and
[docs/postmortems/maintenance-bug-fix-sweep.md](docs/postmortems/maintenance-bug-fix-sweep.md)) —
its 4th item, Reg M-C Z-A-Exclusive Movepool Audit, stays in `Blocked`
below rather than closing with the rest, since it's still waiting on
PokeAPI. Web Version: Teams & Box MVP promoted to current milestone
2026-09-29; its own Scoping leg finished the same day, splitting into 7
build legs (see `COMPLETED.md` and
[docs/investigations/web-version-scope.md](docs/investigations/web-version-scope.md)).
[Sync Accounts: Username + Password] — Leg 1 shipped the same day (see
`COMPLETED.md`). [Sync Data Model: Per-Record Merge & Auto Sync] — Leg 1
shipped 2026-09-29 (see `COMPLETED.md`) — this is the Worker deploy point:
`npx wrangler deploy` ships both this leg's and the accounts leg's Worker
changes together. Re-scoped 2026-09-29: migration does NOT need to happen in
the same window as the deploy - local storage stays canonical (per
`docs/investigations/web-version-scope.md`), so an un-migrated friend's data
is never at risk, only their cross-device sync stops working until they sign
up and get migrated. Deploy whenever, migrate people as they get to it. [Web App Scaffold: Storage
Adapter] — Leg 1 shipped 2026-09-29 (see `COMPLETED.md`). [Web Teams
Parity] — Leg 1 shipped the same day (see `COMPLETED.md`) — Teams import/
CRUD/display now work on web against the IndexedDB adapter; auto-sync
wiring was deliberately deferred to land alongside Web Hosting & Domain's
sign-up/log-in UI instead of wiring `useSync` in with no UI to trigger it
yet. Also ported `useSavedPokemon` to the storage adapter as part of this
leg (Teams Parity needed it too), which narrows what's left in Web Box
Parity below. [Web Box Parity] — Leg 1 shipped 2026-09-29 (see
`COMPLETED.md`) - `BoxPage` wired into `AppWeb.tsx` with no further hook
porting needed; its own dependencies (`useRosterActions`, the type/move/
ability filter hooks, `clipboardPayload.ts`) had no Electron dependency to
begin with.

Decided 2026-09-29 (Vanny): the Worker deploy and the app release are two
separate gates, not one - the Sign Up UI (`SyncSection.tsx`) only exists on
`main`'s source, not in any built/distributed app. The last actual release
is `v0.8.1` (`bd5a171`), which predates the accounts leg entirely, so every
installed app today (including Vanny's own) is still on the old shared-
secret push/pull UI regardless of what the Worker is running. Deploying the
Worker now is fine (see the re-scoping note above), but the next app release
is deliberately being held back until further into this milestone, so
existing users transition straight from the old push/pull UI to a build
that already has more of the web-sync story done, rather than a standalone
release for just the accounts/merge changes. This means [Existing Account
Migration] below is transitively blocked on that future release existing
(nobody can sign up without the new SyncSection UI in an actual installed
build) - not just on individual friends getting around to it.

## Current Milestone: Web Version: Teams & Box MVP

Minimum scope is Teams + Box working on the web with automatic account
sync; the rest of the app's features come later as their own milestones.
Full architecture reasoning (accounts, sync model, hosting, deferred
follow-ons like password reset and public profile pages) is in
[docs/investigations/web-version-scope.md](docs/investigations/web-version-scope.md) —
item bodies below stay short and link back to it rather than repeating it.

- **[Existing Account Migration] — Leg 1** *(Last touched: 2026-09-29 ·
  Re-checks: 0)*
  Blocked: waiting on the next app release (see the note above this
  milestone section) - no installed app has the Sign Up UI yet, so no
  friend can create a new account to migrate into regardless of the Worker
  being deployed. Once that release is out: per friend, once they've
  signed up under the new username+password system, one-off manual copy of
  their old `username#XXXX`-keyed KV blob into their new account (a
  throwaway `wrangler kv` copy or small script), coordinated directly.
  Trickles in as each of the ~4-6 friends gets around to signing up - not a
  single all-at-once pass.

- **[Web Hosting & Domain] — Leg 1** *(Last touched: 2026-09-29 ·
  Re-checks: 0)*
  Blocked: needs a working web app to deploy.
  Deploy to Cloudflare Pages, wire a vannyproductions.com subdomain via an
  IONOS CNAME record (exact subdomain name still TBD), and build the
  first-run login/signup UX for web - the entry point, not an opt-in
  Settings feature, since a device needs an account before it has any
  data.

## Blocked

Items where the whole item (not just a sub-part) is stalled on something
outside this project — a person, a dependency, or an external decision.
Exempt from the re-check counter; they move back to "In progress" once
unblocked.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** *(Last touched:
  2026-09-16 · Re-checks: exempt, blocked)*
  Blocked: waiting on PokeAPI to backfill "champions"-tagged move data more
  broadly, the same way it eventually did for Reg M-B's 22 species (see
  `config/championsMovepoolChanges.ts`'s header). Deferred out of
  Regulation M-C Prep's Leg 2 (see COMPLETED.md/postmortem) rather than
  forced into that pass.
  Scope correction 2026-09-16 (per Vanny): Rillaboom/Baxcalibur/Salamence
  are not the actual audit target, they're cheap indicator species used to
  check whether PokeAPI has caught up yet (currently 0 champions-tagged
  moves each, vs. 51 for already-backfilled archaludon as control - checked
  live 2026-09-10 and again 2026-09-16, no change). The real scope is a
  full Champions movepool sweep across *all* Champions-legal species once
  PokeAPI's backfill catches up - not just these 3, and not just Reg M-C's
  roster. Golisopod (originally a 4th indicator) is separately resolved via
  hand-curation from user-provided source text - see COMPLETED.md's
  Champions M-C Balance Patch Corrections entry - but that was a one-off,
  not a template to repeat per-species while waiting; the plan is to wait
  for PokeAPI rather than hand-curate the rest.
  Next step: periodically re-run the live champions-tag query against
  Rillaboom/Baxcalibur/Salamence (indicator species); once any of them
  shows non-zero champions-tagged moves, PokeAPI has started backfilling
  Reg M-C and it's time to run the full sweep across all Champions-legal
  species, not just these 3.

- **[Team Card Grid Layout Re-check] — Leg 1** *(Last touched: 2026-08-31 ·
  Re-checks: 0)*
  Blocked: waiting on the user to verify live on their physical MacBook —
  everything below was confirmed on a resized Electron window on the dev
  machine, not the actual hardware.
  Fixed and live-verified via `run-desktop` (added a `resize` command to
  `driver.mjs` — sets Electron's content size directly, matching what the
  renderer's CSS/`@container` actually measures). Root cause: not already
  fixed by the carousel rework — that rework is what introduced it.
  `TeamCard.tsx`'s 3-vs-6-column snap required a 1760px container (6*280px +
  5*1rem gaps), unreachable on any MacBook. First attempt (1100px, based on
  a theoretical estimate) still wasn't low enough — measured live at the
  reporter's actual conditions (14" MacBook, sidebar expanded, 2 real teams,
  single-column layout) the container only gets 1043px. Retuned to 1040px
  against that measured number; confirmed live it renders a clean 1x6 with
  no truncation at 1512x982/sidebar-expanded (screenshot:
  `.claude/skills/run-desktop/shots/06-fixed-1512-expanded-sidebar.png`).
  Doesn't cover a 13" MacBook (measured 818px there) — not this fix's
  target device. Also corrected a stale `TeamsPage.tsx` comment describing
  an auto-fill/minmax grid that no longer matches the real implementation.
  Ready to move to COMPLETED.md once the MacBook pass confirms it.

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

- **[UI Shift Assessment Sweep — Post Card UI Polish] — Leg 1** *(Last
  touched: 2026-09-08 · Re-checks: 0)*
  Continue scoping/assessing UI shifts and changes to the rest of the app,
  following on from the UI/UX Overhaul and Card UI Polish milestones (see
  `MILESTONES.md`). Open-ended — needs a pass identifying which
  screens/components haven't had a UI-focused pass yet before it turns
  into concrete legs.

## Future Milestones (unscheduled)

2026-09-10 feedback pass batched into 4 candidate milestones; Battle Logger
Overhaul, Statistics Improvements, and Team Management QoL were each
promoted to current and have since shipped (see `MILESTONES.md`). Live Calc
Tuning, the last of the four, was promoted 2026-09-11 and later retired in
favor of Regular Calc Popup (see `MILESTONES.md`). VGCPastes real-set
sourcing, deferred out of Regular Calc Popup, was itself promoted to
current 2026-09-14 and shipped 2026-09-15 (see `MILESTONES.md`).

Two fast-follows deferred out of Web Version: Teams & Box MVP's scoping
(2026-09-29, see `docs/investigations/web-version-scope.md`) - not yet
worth their own legs until the MVP milestone ships:
- Password reset flow (needs a transactional email API + SPF/DKIM
  deliverability setup on a dedicated vannyproductions.com subdomain).
- Public profile / team-sharing pages (the account model's username design
  already accommodates this, but the public routes/per-team visibility
  toggle need their own scoping pass).

