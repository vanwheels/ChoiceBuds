# Player Favoriting / Friend System — Scoping

Scoping pass for Profile Social Scoping & Maintenance — Leg 3. Question:
is a friend/favorite system worth scoping, now that Leg 2 decided against
a player search directory (see
`docs/investigations/player-search-directory-scope.md`) — a friend system
needs some way to find the other account first, so this leg runs after and
depends on that outcome. Research/decision only — no implementation.

## What exists today

- **Discovery is exact-username lookup only, confirmed staying that way by
  Leg 2.** `GET /profile/:username` requires already knowing the exact
  username; there's no directory or search. Anyone a user would want to
  "friend" is someone whose username they already know (same-Worker
  signup, or a shared `/u/<username>` link) — not someone a friend system
  would help them discover.
- **No account-to-account relationship storage, and no notification path
  to build one cheaply.** `worker/src/index.ts`'s KV is per-account only
  (`account:<username>`, `tokens:<username>`, lockout/cooldown keys per
  `worker/README.md`) — nothing models a link *between* two accounts. More
  importantly, the Worker has no mechanism for one account to be notified
  of another account's action at all: sync is manual, one-directional-at-
  a-time, user-triggered (`ARCHITECTURE.md`'s Cross-device sync section),
  and `GET /profile/:username` is a one-shot, unauthenticated read with no
  push/poll/webhook anywhere in the codebase. A real friend system (request
  sent → other account sees a pending request → accept/reject) needs
  exactly that kind of async notification between two different accounts,
  which doesn't exist today in any form this leg could reuse.
- **The origin signal is weaker than the other two legs in this
  milestone.** Per the milestone-planning commit (`c544101`), this item's
  framing was "Vanny's own framing was tentative ('maybe')" — a real but
  soft signal, not a firm request, and weaker than even the other two
  legs' carried-forward-but-unprompted scoping questions.
- **Friend-group scale, same as Leg 2's finding.** `worker/README.md`'s
  Costs/limits framing puts a deployed Worker at roughly 4-6 real accounts
  — people who already know each other outside the app, by construction
  (they're the ones who got handed the same self-hosted Worker URL).

## Options considered

**Full bidirectional friend system (request → accept/reject → mutual
friends list).** This is the only version that earns the name "friend
system" — a one-sided favorite isn't mutual. Rejected: needs new
infrastructure this Worker has no analog for at all (a request queue, a
way for the recipient to learn a request exists, accept/reject state) —
not a cheap addition like Leg 1's filtered field or Leg 2's `KV.list`
read, but a genuinely new async-notification subsystem. Disproportionate
build for a "maybe" at friend-group scale where the people involved likely
already coordinate outside the app.

**One-directional "favorite a player" bookmark (a private list of
usernames for quick profile navigation, no second account involved,
reusing the existing per-account-synced settings singleton the way
`FavoritePokemon` already works).** Meaningfully cheaper than the full
system — no new Worker endpoint, no relationship state, no notification
problem, since nothing is written to or read from the other account at
all. Still rejected: at 4-6 known accounts per Worker, saving a handful of
already-memorized usernames to skip retyping them is marginal, and this
would be solving a problem (unidirectional convenience) that's materially
different from what "friend system" was actually asked about ("maybe" a
friend system, not "maybe" a bookmarks feature) — building this instead
would be answering a different, unasked question.

**Build nothing; usernames remain memorized/shared the way they are
today.** Chosen — see Decision.

## Decision

**Not building this.** Reasons:

- The real "friend system" reading of this request needs infrastructure
  (cross-account notification) that doesn't exist anywhere in this Worker
  today — not a filtered-field or a read-only-list addition like the other
  two legs in this milestone, but a new subsystem, for a signal that was
  explicitly tentative ("maybe") rather than a firm ask.
- At the project's actual ~4-6-accounts-per-Worker friend-group scale (same
  finding as Leg 2), the people who'd use a friend system already know and
  coordinate with each other outside the app — there's no discovery problem
  a friend list would solve that exact-username lookup doesn't already
  cover.
- The cheaper one-directional bookmark alternative was considered and
  rejected on its own terms above, rather than substituted in as a
  consolation build — it answers a different, unasked question.

Not scoping a follow-up item; this closes the question rather than
deferring it again. If real demand shows up later — someone actually
asks to find/track other players, not just "maybe" — the right starting
point is the one-directional bookmark version above (cheapest, no new
infra), scoped fresh at that point rather than reopened from this doc.
