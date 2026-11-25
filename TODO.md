# ChoiceBuds TODO

Format follows the global Task Tracking rules; items are listed
highest-to-lowest priority within each section.

## Unscheduled

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

