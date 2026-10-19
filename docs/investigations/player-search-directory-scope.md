# Player Search Directory — Scoping

Scoping pass for Profile Social Scoping & Maintenance — Leg 2. Question:
is a browsable/searchable username directory worth building, given
Scoping Sweep Leg 3 already decided against a public team browse/upload
database for discoverability-vs-moderation reasons (see
`docs/investigations/public-team-browse-upload-scope.md`), and Profile
System Revamp: Foundation deferred this exact question to Unscheduled
rather than deciding it (see
`docs/postmortems/profile-system-revamp-foundation.md`). Research/decision
only — no implementation.

## What exists today

- **Exact-username lookup only.** `GET /profile/:username`
  (`worker/src/index.ts::handleProfileGet`) requires the caller to already
  know the exact username; there is no endpoint that lists or searches
  across accounts. `isValidUsername` validates shape, not existence — a
  miss 404s.
- **A Worker can host many accounts, unlike the team-database question's
  assumption.** `worker/README.md`'s Costs/limits section is explicit that
  KV/R2 usage is "shared across every account this Worker ever serves" —
  one deployer's Worker can and does host multiple real accounts (a friend
  group pointed at the same deployed URL), not one account per Worker.
  That's a materially different shape than the public-team-database
  question: a directory scoped to "accounts on this one Worker" wouldn't
  need new cross-deployment infrastructure the way a cross-Worker
  browse/upload database would, since `KV.list({ prefix: 'account:' })`
  already has everything it needs within the existing per-Worker boundary.
- **Signup never frames a username as publicly browsable.** `POST /signup`
  only checks shape/uniqueness/the safety filter
  (`isValidUsername`/`containsDisallowedContent`) — there's no "this will be
  publicly listed" disclosure, because today a username only becomes
  reachable by someone who is handed it directly (a shared `/u/<username>`
  link, or already knowing it from elsewhere) and then looks it up exactly.
- **The project's real scale is ~4-6 known accounts per deployed Worker**
  (`worker/README.md`'s own Costs/limits framing) — friend-group scale, not
  a large unrelated user base.

## Why this isn't just a smaller version of the team-database question

The infra objection that killed the public-team-database question
(Scoping Sweep Leg 3) doesn't transfer cleanly here: that question needed a
*new*, centrally-hosted, publicly-writable service aggregating across every
self-hoster's independent Worker. A player directory, scoped to the
accounts already registered on one Worker, needs no new service and no
new write path — it's a read over storage that Worker already owns. So the
honest objection here is different, not borrowed wholesale from that leg:

- **Low real value at this scale.** At ~4-6 accounts per Worker (a friend
  group, by the project's own framing), the people who'd use a directory
  already know each other's usernames — that's how they ended up signed up
  to the same self-hosted Worker URL in the first place. A browse feature
  solves a discovery problem that doesn't really exist yet at this scale.
- **A real privacy-default change, even though it's cheap.** Today an
  account is only reachable by someone who already has the exact username,
  and nothing at signup tells a new user their username will be publicly
  listed. A directory would passively expose every existing and future
  account on a Worker to any visitor who opens it — a silent change to what
  signing up implies, for accounts that already exist, with no opt-in step.
  Same shape of issue as Profile Notes & Moderation's privacy-mismatch
  finding (`docs/investigations/profile-notes-and-moderation-scope.md`),
  even though the cost story differs from that leg (there it was cheap too;
  here it's cheap because of the per-Worker boundary, not despite it).
- **No demand signal.** This question was carried forward from Profile
  System Revamp: Foundation's deferral, not raised by an actual request to
  browse or search for other players.

## Options considered

**Build a directory scoped to one Worker's own registered accounts
(`KV.list` over `account:*`), unfiltered.** Cheap, but ships the privacy
default change above to every existing account with zero opt-in.
Rejected.

**Same, but opt-in per account (a new "list me in the directory" toggle,
default off).** Would resolve the privacy-mismatch objection — only an
account that explicitly opts in becomes browsable. Still rejected for now:
no demand, and at friend-group scale almost nobody would have a reason to
opt in that exact-lookup/shared-link doesn't already cover.

**Leave exact-username lookup as the only path, as today.** Chosen — see
Decision.

## Decision

**Not building this, reaffirming Profile System Revamp: Foundation's
exact-username-lookup-only choice.** Reasons:

- No demand signal — this is a carried-forward scoping question, not a
  request.
- At the project's actual scale (~4-6 accounts per self-hosted Worker,
  friend-group-sized), a browse/search feature adds little over exact
  lookup + shared links, since the people who'd use it already know each
  other's usernames.
- Even the cheap, per-Worker-scoped version would silently change what
  signing up implies for every existing account — nothing today discloses
  that a username becomes browsable, only that it becomes reachable by
  someone who's told it.

Not scoping a follow-up item; this closes the question rather than
deferring it again. If real demand shows up later (a Worker hosting a
large enough group that exact lookup stops being practical), the minimum
viable version is the opt-in toggle considered above — scoped fresh at
that point, not reopened from this doc.

[Player Favoriting / Friend System] — Leg 3 depended on this leg's
outcome (a friend system needs some way to find the other account first);
with no directory being built, that leg's own scoping has to stand on
exact-username lookup alone, which it already accounted for as one
possible outcome.
