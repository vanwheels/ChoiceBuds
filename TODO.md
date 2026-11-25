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

## Current Milestone: Conventions Catch-up & ChoiceMods Practice Port

Done when:
- CLAUDE.md is under ~200 lines with no incident history, and carries the
  ChoiceMods active checks in place of the bullets they supersede
  (including the reactive `wrangler deploy` bullet).
- ARCHITECTURE.md fits about one page, with each feature deep-dive in
  `docs/architecture/<topic>.md` (or `.claude/rules/` when it's really an
  editing rule), linked from ARCHITECTURE.md.
- TODO.md's header doesn't restate global rules and its sections match the
  global layout; a Node PreToolUse guard blocks `git add -A`/`.` and
  `git commit -a`.

Legs run in order. The global `claude-config` v3 entry is out of scope:
ChoiceBuds already has CHANGELOG.md, the README shape sits in the deferred
README milestone, and the LSP rule loads from global `rules/typescript.md`.

- **[Conventions Catch-up] — Leg 1** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  CLAUDE.md is 225 lines and its Workflow bullets carry dated incident
  narratives ("added …, after …"). Move each history paragraph into the
  post mortem it came from (or a `.claude/rules/` file when it is a
  standing rule), keeping only the rule itself in CLAUDE.md. Aim for ~190
  lines so Leg 2's additions still fit under 200.
  Done check: `wc -l CLAUDE.md` ≤ ~190, no dated narratives left, and each
  moved lesson is findable in a post mortem or rule. Proves Done when
  line 1 (length, no history).
  Manual verification: no · Review: no

- **[ChoiceMods Practice Port] — Leg 1** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Port five ChoiceMods rules as one-line active checks: build a manual
  check's state yourself and hand over numbered steps with expected
  results; ask whether a test or check would differ if the change did
  nothing; run `wc -l` at planning and file a split leg first for any file
  that would pass ~300 lines; a `Manual verification: yes` leg gets its
  COMPLETED.md entry only after Vanny reports the check; each "deployed"
  done clause gets a live check step or is reworded to "in the repo"
  (replaces the reactive `wrangler deploy` bullet). Remove any other
  bullet these supersede.
  Done check: the five checks are present, superseded bullets gone, and
  CLAUDE.md still under ~200 lines. Proves Done when line 1 (checks).
  Manual verification: no · Review: no

- **[Conventions Catch-up] — Leg 2** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  ARCHITECTURE.md is 666 lines against the global one-page rule. Keep the
  core (process split, persisted data versioning, renderer layers, import
  data flow, sync, web build) as short summaries; move feature deep-dives
  (Calc popup, Tag-chip search, Mega toggle, Mobile swipe deck, Box entry
  modal, etc.) to `docs/architecture/<topic>.md`, or to `.claude/rules/`
  with `paths` where a section is really an editing rule. Link each.
  Done check: ARCHITECTURE.md about one page, before/after section
  headings diffed so nothing is lost, every moved section linked. Proves
  Done when line 2.
  Manual verification: no · Review: no

- **[Conventions Catch-up] — Leg 3** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  TODO.md's header restates global task-tracking rules, and `## Blocked`
  isn't in the global layout. Trim the header to a one-line pointer and
  fold Blocked items into Unscheduled, each keeping its `Blocked:` line.
  Done check: header trimmed, section order is Current Milestone /
  Unscheduled / Future Milestones. Proves Done when line 3 (TODO).
  Manual verification: no · Review: no

- **[ChoiceMods Practice Port] — Leg 2** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Port ChoiceMods' `.claude/hooks/guard.py` as a Node `.claude/hooks/
  guard.mjs` (no Python venv here), limited to blocking `git add -A`/`.`
  and `git commit -a`/`-am` from both the Bash and PowerShell tools.
  Wire it as a PreToolUse hook in `.claude/settings.json` and widen
  Vitest's `include` so its tests run in `npm run test`.
  Done check: tests cover blocked (`add -A`, `add .`, `commit -a`,
  `commit -am`) and allowed (`add src/x.ts`, `commit -m "add -A"`)
  commands, full suite passes, and a live `git add -A` in session is
  refused. Proves Done when line 3 (guard).
  Manual verification: no · Review: no

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

- **[Move Effect Chance Text] — Leg 1** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  PokeAPI's `short_effect` for some moves omits the percentage (Rock
  Slide: "Has a chance to make the target flinch."), carrying it in a
  separate `effect_chance` field that `pokeapiService.ts` never stores, so
  move tooltips show no number. Found during Reg M-D Move Overrides Leg 6.
  Store `effect_chance` and fill it into texts that lack it, or audit which
  moves are affected first.
  Done check: Rock Slide's M-C tooltip shows 30%, with a test over a saved
  PokeAPI fixture.
  Manual verification: yes (Rock Slide tooltip) · Review: no

## Future Milestones (unscheduled)

### Reg M-D Update (deferred 2026-11-24)

Paused with Legs 1-8 done and only the post-launch re-check left. New Reg
M-D information arrives in waves: some before launch (~2026-12-02), the
rest datamined around then and slowly worked into Showdown, Smogon and
eventually PokeAPI. As Vanny feeds each batch, record it in
`docs/investigations/reg-m-d.md` and add or extend legs here under the
same workflow as Legs 3-8; Leg 9 closes whatever gaps remain. Resume as
the current milestone once the remaining work is unblocked.

Done when:
- `docs/investigations/reg-m-d.md` lists every Reg M-D change with its
  source, and each change is either applied in `config/` or explicitly
  deferred with a TODO.md item.
- Reg M-D is selectable end-to-end, and `config/seasons.ts` covers M-C's
  remaining seasons and M-D's seasons.

Findings for all legs below: `docs/investigations/reg-m-d.md`. Legs 3-5
each need only Leg 2; Legs 6-8 also need Leg 5. Leg 9 waits for launch.

- **[Reg M-D Post-Launch Re-check] — Leg 9** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Blocked: Reg M-D launches 2026-12-02; the data isn't published before then.
  Close the doc's "Gaps to close after launch" list: the other 21 M-D
  species, the M-D season rows (three seasons), the Premium Grade/
  Heatranite/Tatsugirinite spellings on Serebii, and a Bulbapedia and
  Showdown `champions`-mod cross-check of everything else. Also add
  `'Reg M-D': 'Champions M-D'` to `services/vgcPastes.ts`'s tab map once
  the VGCPastes sheet has that tab (absent 2026-11-24; the catalog hides
  M-D until then). This may split if the 21 species bring their own
  movepool gaps.
  Done check: every gap in `docs/investigations/reg-m-d.md` is closed or
  has its own TODO item. Proves Done when line 1.
  Manual verification: no · Review: no

### README Media & Refresh (deferred 2026-11-24)

Moved out of Current Milestone intact to make room for the Reg M-D update
(Reg M-D launches ~2026-12-02). Resume via `/plan-milestone` when picked
back up; `[Screenshot & GIF Script] — Leg 1` is already done.

Done when:
- `npm run media` regenerates every file in `docs/media/` from the fixed demo
  dataset, with no real user data.
- `README.md` follows the `rules/docs.md` shape: badges, hero media, Try it /
  Download, captioned screenshots, and the Credits section intact.
- A `LICENSE` file matching `package.json`'s MIT declaration exists.

- **[Screenshot & GIF Script] — Leg 2** *(Last touched: 2026-10-31 ·
  Re-checks: 0)*
  Extend `npm run media` with scripted Playwright interactions recorded to
  video and converted to GIF with `ffmpeg`: one or two total (`team-import.gif`
  plus one more), each one interaction, 3-8s, ~800px wide, 10-15 fps, a few MB
  max. Wire the `release` skill to run it before tagging when a release
  changed a pictured screen.
  `ffmpeg` is missing on the Windows machine (`winget install Gyan.FFmpeg`);
  the Mac is unchecked.
  Done check: GIFs generate and fit the size budget.
  Manual verification: yes · Review: no

- **[README Refresh] — Leg 1** *(Last touched: 2026-10-31 · Re-checks: 0)*
  Restructure `README.md` to the `rules/docs.md` README shape, without media:
  name, pitch and CI/version badges; Try it / Download (web link first, then
  installers); user-voice Features matching the changelog; For developers
  (setup, link to ARCHITECTURE.md); then Credits and data sources (the existing
  long section), the AI-involvement and not-affiliated lines, and the license.
  Add the missing `LICENSE` file (MIT, per `package.json`). Independent of the
  media legs, so it may run first.
  Done check: README renders on GitHub with all sections present.
  Manual verification: yes · Review: no

- **[README Refresh] — Leg 2** *(Last touched: 2026-10-31 · Re-checks: 0)*
  Depends on `[Screenshot & GIF Script] — Leg 2` and `[README Refresh] — Leg
  1`. Place the hero GIF and 3-4 captioned screenshots from `docs/media/`. The
  exact layout is TBD and may take a couple of iterations.
  Done check: Vanny approves the rendered README.
  Manual verification: yes · Review: no

### Standalone

- **[Password Reset Flow] — Leg 1** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Deferred out of Web Version: Teams & Box MVP's scoping (2026-09-29, see
  `docs/investigations/web-version-scope.md`). Needs a transactional email
  API plus SPF/DKIM deliverability setup on a dedicated
  vannyproductions.com subdomain before it's worth a leg.
  Done check: to be set when scoped.
  Manual verification: yes · Review: yes

- **[Public Route Bundle Split] — Leg 1** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  `/u/<username>` shares the main `web/` bundle with the full app
  (`web/main.tsx` statically imports both `AppWeb` and
  `PublicProfilePage`), so anonymous visitors download everything. Split it
  into a dedicated `web/public/` Vite entry, served via the same `404.html`
  redirect trick, once a second public dynamic route exists (e.g. public
  team displays not tied to a profile); one example doesn't justify the
  restructure.
  Done check: to be set when scoped.
  Manual verification: yes · Review: no

