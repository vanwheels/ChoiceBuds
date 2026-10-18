# Pokepaste Format Deprecation Rumor — Research

Checked 2026-10-17 for the Bug Fix & Research Sweep milestone. Vanny
recalled Showdown moving away from Pokepaste integration toward its own
newer format. An initial pass wrongly closed this as false (see git history
for that version) by only checking Showdown's *current-default* client; a
follow-up correction, prompted by Vanny spotting a live `psim.us/t/...`
share link from the client, checked the *new* client specifically and
reversed the answer.

## Answer: Yes, confirmed — as of 2026-10-17

Showdown's new client (in public beta/transition, not yet the default) has
dropped Pokepaste in favor of its own first-party team-sharing system. The
current-default client still uses Pokepaste, so nothing breaks today, but
this is an active, intentional migration, not a rumor.

## Evidence

- **New client exists and is in a public transition period.** Tracked in
  `pokemon-showdown-client`
  [issue #2715](https://github.com/smogon/pokemon-showdown-client/issues/2715)
  ("New client", opened 2026-07-03) — a Preact rewrite live at
  `play.pokemonshowdown.com/beta` / `psim.us/newclient`, getting active user
  feedback through at least 2026-09-23.
- **Source diff confirms the replacement.** The old client's teambuilder
  (`play.pokemonshowdown.com/src/oldclient/client-teambuilder.js`) still
  POSTs to `https://pokepast.es/create` ("Upload to PokePaste" button) — no
  change there, which is what the first pass found and mistook for the
  whole picture. The *new* client's teambuilder
  (`play.pokemonshowdown.com/src/panel-teambuilder-team.tsx`) has no
  Pokepaste code path at all: it calls a `/teams save` chat command and
  displays a `Share URL: https://psim.us/t/<teamid>` with a `Validate`
  button instead.
- **First-party replacement, server-side.** `server/chat-plugins/teams.ts`
  implements a full PostgreSQL-backed team database on Showdown's own
  server — upload, search, privacy, view-count tracking — served at
  `teams.pokemonshowdown.com` with `psim.us/t/<id>` short links. Saving a
  team requires an **autoconfirmed Showdown account** (registered 1+ week,
  1+ rated win) — unlike pokepast.es's anonymous pastes. A JSON API exists
  at `teams.pokemonshowdown.com/api/<action>`, same `/api/` pattern
  Showdown uses site-wide.
- **Live community confirmation.** Smogon thread
  ["Return pokepaste to new client / New way of sharing teams"](https://www.smogon.com/forums/threads/return-pokepaste-to-new-client-new-way-of-sharing-teams.3788776/)
  (started 2026-09-22 by user godlyreal): the OP states "removing pokepaste
  is due to the developer now becoming inactive." Showdown admin/top
  programmer **Hecate** is actively replying and iterating on the
  replacement flow (raised the per-user team cap from 100 to 2,000 in
  response to complaints, is fixing the post-upload popup UX) — confirming
  this is a deliberate, in-progress migration rather than a bug or rumor.

## Conclusion for the project

No code change in this leg (research leg, per its scope), but this is a
real forward-looking gap: once the new client becomes default, newly
generated Showdown team-share links will be `psim.us/t/...` /
`teams.pokemonshowdown.com/view/...`, which `services/pokepaste.ts` doesn't
recognize today. pokepast.es itself and the current-default client's
integration still work, so nothing is broken yet. Follow-up scoping item
added to `TODO.md`'s Unscheduled section: support importing from the new
team-link format alongside Pokepaste.

## Second import source: add now or wait? (decided 2026-10-18)

Revisited under Scoping Sweep — Leg 2: add
`teams.pokemonshowdown.com/api/<action>` as a second import source now,
parallel to `services/pokepaste.ts`'s pokepast.es fetch, or wait and
re-check once the new client becomes default?

**Decision: wait.** This leg's research closed the open auth question in
the "add now" direction but surfaced a bigger implementation cost in the
"wait" direction — net, demand is still too low to justify it today.

### What this leg confirmed

- **The read endpoint is real, documented only by third-party client
  source (not Showdown's own repos), and needs no account.** Verified live
  2026-10-18: `GET https://teams.pokemonshowdown.com/api/getteam?teamid=<id>&full=1`
  (add `&password=<password>` for a private team, taken from the
  `-<password>` suffix some share links carry) returns `]` (Showdown's
  standard anti-JSON-hijacking prefix, same convention as other
  `*.pokemonshowdown.com` JSON endpoints) followed by plain JSON — no
  cookies, login, or autoconfirmed status required. This shape doesn't
  appear anywhere in `smogon/pokemon-showdown`/`pokemon-showdown-client`
  (searched both repos via GitHub code search - no match); it's confirmed
  instead by a third-party Showdown chat bot's source
  (`SlimSeb/Elsa-Mina`'s `ShowdownTeamProvider.cs`) and reproduced directly
  against the live endpoint here. The *account-gated* path found in
  `server/chat-plugins/teams.ts` (`TeamsHandler.validateAccess` requiring
  `user.autoconfirmed`) only gates the in-client chat-page route
  (`/teams view`, used by logged-in client sessions) and all mutations
  (save/delete/setprivacy) — it does not gate this separate read endpoint.
  So the original worry (anonymous reads might be blocked the way saves
  are) is resolved: they aren't.
- **But the payload is Showdown's packed team format, not export text.** A
  live `teamid=100` fetch returned
  `"team":"Ninetales-Alola||LightClay|SnowWarning|AuroraVeil,...` — pipe-
  delimited fields per Pokémon, `]`-joined between Pokémon (Showdown's
  internal `Teams.pack` format). `services/parser.ts::parseShowdownText`
  (and `splitIntoBlocks`/`parsePokemonBlock` underneath it) only understand
  plain Showdown export text, the same shape pokepast.es's `paste` field
  already returns. Nothing in `src/renderer` unpacks the packed format
  today (checked - no `pack`/`unpack` team logic exists outside
  `SpeedTiersPage.tsx`'s unrelated usage of the word). A nonexistent team ID
  returns `{"team":null}` rather than an HTTP error, which also needs its
  own null check distinct from pokepaste's `response.ok` failure path.

### Why this tips to "wait," not "add now"

- The original Leg 2 scoping treated this as "parallel to
  `services/pokepaste.ts`'s existing fetch" - a small, same-shaped
  addition. It isn't: it needs a net-new packed-format unpacker (porting
  Showdown's own unpack algorithm), its own `detectRegulationFromNotes`-
  equivalent handling (this API has no `notes` field at all, just
  `format`), its own link-regex in `ImportTeamModal.tsx` for both
  `psim.us/t/<id>` and `teams.pokemonshowdown.com/view/<id>`, a new
  `external-data-sources.md` exception, and real-response fixtures per
  `typescript.md`'s external-API-parsing testing convention - a genuine
  implementation leg of its own, not a quick parallel source.
- Demand is still unconfirmed. The new client remains opt-in beta, not
  default (per the "What exists" research above); there's no signal yet
  that ChoiceBuds' own VGC-import users are actually hitting `psim.us/t/`
  links today. Paying the packed-unpacker cost now would be building ahead
  of measured demand, the same scope-discipline call this milestone already
  made for the Tourney Tab poll (see this doc's sibling,
  `tourney-tab-schedule-source-research.md`'s "Automated diff-check poll"
  section) and for the password-reset flow (`docs/investigations/web-version-scope.md`).

### What changes the next time this is checked

Re-check once either (a) Smogon/Hecate signals the new client is becoming
the default, or (b) a ChoiceBuds user actually reports trying to import a
`psim.us/t/` or `teams.pokemonshowdown.com/view/` link. When that happens,
this section's findings (endpoint shape, no-auth-for-reads, packed-format
payload, `{"team":null}` miss case) carry forward directly into that
implementation leg's scoping - no need to re-derive them.
