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
