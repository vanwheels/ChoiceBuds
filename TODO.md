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

## Current Milestone: Reg M-D Update

Time-boxed against Reg M-D's launch (~2026-12-02). Leg 1 is research; it
adds the data build legs (Leg 3+) once its findings are in.

Done when:
- `docs/investigations/reg-m-d.md` lists every Reg M-D change with its
  source, and each change is either applied in `config/` or explicitly
  deferred with a TODO.md item.
- Reg M-D is selectable end-to-end, and `config/seasons.ts` covers M-C's
  remaining seasons and M-D's seasons.

Findings for all legs below: `docs/investigations/reg-m-d.md`. Legs 3-5
each need only Leg 2; Legs 6-8 also need Leg 5. Leg 9 waits for launch.

- **[Reg M-D Regulation-Scoped Overrides] — Leg 5** *(Last touched:
  2026-11-24 · Re-checks: 0)*
  Vanny's rule: the M-D balance changes apply from Reg M-D onward and must
  not show in M-C or earlier calcs, or in those teams' move and ability
  text. Every override table applies globally today (doc §7). Add a dated
  patch layer (entries tagged with the regulation they start in) and a
  regulation parameter on `useGameData.ts`'s `getCachedMove`/
  `getCachedAbility`/`getCachedSpeciesLearnset` and on
  `getChampionsCalcMoveOverride`. Thread it to the ~8 caller files: the calc
  uses its `regulationId`, team surfaces use `team.regulation`, and anything
  with no regulation (Box, etc.) uses the latest one, as Vanny confirmed. Existing global overrides stay
  global. Leaves the layer empty; Legs 6-8 fill it.
  Done check: tests show a dated test entry applied for its regulation and
  later ones, and absent for earlier ones, on all four paths; the full
  suite passes.
  Manual verification: no · Review: yes (touches many call sites and the
  calc engine)
  Built and tests pass; awaiting Vanny's `/leg-review` before close.

- **[Reg M-D Move Overrides] — Leg 6** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Depends on Leg 5. Add the Dec 2 accuracy changes as `Reg M-D` patch
  entries: Screech and Metal Sound 85→100, Steel Wing and Frost Breath
  90→100, and Rock Slide 90→95, plus a description entry for Rock Slide's
  flinch chance dropping from 30% to 20%. Confirm
  `getChampionsCalcMoveOverride` needs no accuracy change for damage.
  Done check: tests assert each override under Reg M-D and the unchanged
  mainline values under Reg M-C.
  Manual verification: yes (Rock Slide's tooltip on an M-C team and an
  M-D team) · Review: no

- **[Reg M-D Patch Movepool Additions] — Leg 7** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Depends on Leg 5. `CHAMPIONS_MOVEPOOL_ADDITIONS` only applies to species
  with no Champions-tagged PokeAPI data, so the Dec 2 additions need Leg 5's
  dated layer instead, applied after every removal. Fill it from the doc's
  §5 table: Psych Up for 17 species (Rotom counts once, with six rows for
  its forms), Slack Off, Roost, Tailwind, Wonder Room, and Play Rough for
  the seven Eeveelutions. Mr. Mime's `psych-up` is in the gated removals
  table and needs a test.
  Done check: tests show the additions on tagged and untagged species under
  Reg M-D and absent under Reg M-C, and Mr. Mime keeps Psych Up in M-D.
  Manual verification: no · Review: yes (changes the learnset pipeline
  every move picker reads)

- **[Reg M-D Ability Overrides] — Leg 8** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Depends on Leg 5. Add `Reg M-D` description entries: Flash Fire's boost
  now persists through Mega Evolution, and Stalwart also ignores
  substitutes. The app models neither behavior, so these are text only.
  Update `championsAbilityOverrides.ts`'s header audit note.
  Done check: tests assert both descriptions under Reg M-D and the
  mainline text under Reg M-C.
  Manual verification: no · Review: no

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

- **[Reg M-D Tatsugiri Import Slug] — Leg 10** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Showdown exports Curly Tatsugiri as bare "Tatsugiri", but PokeAPI has no
  bare `tatsugiri` resource (confirmed 404 on 2026-11-24, found in Leg 3).
  So an import fails enrichment and legality, like Mimikyu and Toxtricity
  did before. Add `tatsugiri: 'tatsugiri-curly'` to
  `services/pokeapi.ts`'s `normalizeSpeciesForAPI` form map, and grep the
  rest of the M-D additions for the same gap.
  Done check: a test shows `normalizeSpeciesForAPI('Tatsugiri')` returns
  `tatsugiri-curly`, which is REG-MD-legal.
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

[Conventions Catch-up] and [ChoiceMods Practice Port] overlap (both slim
and replace CLAUDE.md bullets); plan them together.

- **[Conventions Catch-up] — Leg 1** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  ChoiceBuds is stamped v2 but falls short of it. CLAUDE.md is 225 lines,
  over the ~200 target, and its Workflow bullets carry incident history
  that belongs in post mortems. ARCHITECTURE.md is 658 lines against the
  one-page rule. TODO.md's header restates global rules, and its
  `## Blocked` section isn't in the global layout. There's also no
  CHANGELOG.md, which the global CLAUDE.md and `/release` require. The
  CHANGELOG, README-shape and LSP rules were added globally on 2026-10-31
  without a conventions bump, so `/project-revision` won't flag them. A v3
  entry in `~/claude-config` (edited outside this repo) would fix that
  for every project. Likely splits into a CLAUDE.md slim leg and an
  ARCHITECTURE.md trim leg.
  Done check: CLAUDE.md under ~200 lines with history moved out,
  ARCHITECTURE.md near one page, TODO header trimmed, and CHANGELOG.md
  started with `## Unreleased`.
  Manual verification: no · Review: no

- **[ChoiceMods Practice Port] — Leg 1** *(Last touched: 2026-11-24 ·
  Re-checks: 0)*
  Port the ChoiceMods CLAUDE.md rules that fit here, each as a one-line
  active check:
  - Build a manual check's state yourself, then hand over numbered steps
    with the expected result of each.
  - Before any test or manual check, ask whether it would show a different
    result if the change did nothing.
  - Run `wc -l` at planning time, and file a split leg first for any file
    that would pass ~300 lines.
  - A `Manual verification: yes` leg gets its COMPLETED.md entry only after
    Vanny reports the check.
  - Each "deployed" done clause gets a live check step, or is reworded to
    "in the repo". This would replace the reactive `wrangler deploy`
    bullet.
  Also consider porting ChoiceMods' `.claude/hooks/guard.py` PreToolUse
  hook (blocks `git add -A`/`.` and `git commit -a`). Skip its
  guarantee-sentence audits, which don't fit this project's risk profile.
  Done check: the rules are in CLAUDE.md or `.claude/rules/`, replacing
  the bullets they supersede, and the hook is in `.claude/settings.json`
  if adopted.
  Manual verification: no · Review: no

## Future Milestones (unscheduled)

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

