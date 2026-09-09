# Regulation M-C source text (raw dumps)

Raw source material Vanny is pasting in ahead of implementing Regulation M-C
support (see `TODO.md`'s `[Regulation M-C Prep] — Leg 2` and the
`project_regulation_mc_prep` memory note for the tracked species/item roster
and current status). Pasted in 3 dumps: items, then move changes, then
ability changes. Kept verbatim here as source-of-truth text to transcribe
into config files at implementation time — not itself the implementation.

## Dump 1: New + changed items (received 2026-09-08)

```
Leek
When held by a Farfetch'd or Sirfetch'd, gives the holder
a 2-stage Critical-Hit Ratio Boost.
---
Absolite Z
A held item that allows Absol to Mega Evolve into
Mega Absol Z.
---
Garchompite Z
A held item that allows Garchomp to Mega Evolve into
Mega Garchomp Z.
---
Lucarionite Z
A held item that allows Lucario to Mega Evolve into
Mega Lucario Z.
---
Golisopite
A held item that allows Golisopod to Mega Evolve.
---
Baxcalibrite
A held item that allows Baxcalibur to Mega Evolve.
---
Rocky Helmet
When the holder is hit by a contact move, the attacker
takes damage equal to 1/6 of its max HP.
---
Air Balloon
Causes the holder to float off the ground, making it
immune to Ground-type moves, as well as the Spikes,
Toxic Spikes, and Sticky Web statuses. Disappears for
the duration of the battle if the holder takes damage
from a move.
---
Red Card
When the holder takes damage from a move, the
attacker is forced to switch out of battle. Disappears
for the duration of the battle after a single use.
---
Binding Band
Increases the damage dealt to targets that have the
Bound status. Targets will take damage equal to 1/6 of
their max HP instead of 1/8 of their max HP.
---
Eject Button
Switches the holder out of battle when the holder takes
damage from a move. Disappears for the duration of the
battle after a single use.
---
Normal Gem
Boosts the power of the holder's Normal-type moves by
30%. Disappears for the duration of the battle after a
single use.
---
Salamencite
A held item that allows Salamence to Mega Evolve.
---
Terrain Extender
When the holder creates terrain with its moves or
Ability, the duration is extended by 3 turns.
(Total duration: 8 turns)
---
Electric Seed
Boosts the holder's Defense stat by 1 stage on Electric
Terrain. Disappears for the duration of the battle after a
single use.
---
Psychic Seed
Boosts the holder's Sp. Def stat by 1 stage on Psychic
Terrain. Disappears for the duration of the battle after a
single use.
---
Misty Seed
Boosts the holder's Sp. Def stat by 1 stage on Misty
Terrain. Disappears for the duration of the battle after a
single use.
---
Grassy Seed
Boosts the holder's Defense stat by 1 stage on Grassy
Terrain. Disappears for the duration of the battle after a
single use.
---
```

Notes/discrepancies to check at implementation time:
- Item names here confirm the 6 Mega Stones tracked in `vgcData.ts`:
  Absolite Z, Garchompite Z, Lucarionite Z (the 3 Z-Megas) and Golisopite,
  Baxcalibrite, Salamencite (the 3 ordinary Megas — note Golisopod's and
  Baxcalibur's stones don't carry the "-ite" + species-name-in-full pattern
  Salamencite does; spell exactly as given here, not auto-derived from the
  species name).
- Air Balloon/Red Card/Eject Button/Normal Gem/Binding Band/Rocky Helmet
  read as reprinted flavor text for existing items (not new to M-C) grouped
  in with the genuinely new ones (Leek, the 6 Mega Stones, Terrain Extender,
  the 4 Seeds) — confirm which are actually new-to-Champions vs. already
  implemented before treating this whole list as additions.
  **Resolved 2026-09-09:** all 6 flagged items genuinely are new-to-Champions,
  not already-implemented items being redundantly re-added. `vgcData.ts`'s
  git history was walked back to the 2026-07-05 refactor (`0e8b6c5`) that
  first sourced `VGC_ITEMS` live from Serebii's Champions items page (and
  explicitly noted the accurate pool excludes items like these, replacing a
  prior generic-mainline-VGC placeholder list that did happen to include a
  few of them); all 6 were absent from every commit between that refactor
  and the Reg M-C addition, with no evidence any were quietly re-added
  in between. The uniform flavor-text formatting in Vanny's dump was just
  presentation, not a signal of pre-existing status. No code change needed —
  `VGC_HOLD_ITEMS`'s current 12-item Reg M-C addition is correct as-is.

## Dump 2: New + changed moves (received 2026-09-08)

```
Poison Powder
Poisons the target. Grass-type Pokémon are unaffected.
Previous:
Poison Powder
Poisons the target.
---
Stun Spore
Paralyzes the target. Grass-type Pokémon are unaffected.
Previous:
Stun Spore
Paralyzes the target.
---
Sleep Powder
Puts the target to sleep. Grass-type Pokémon are unaffected.
Previous:
Sleep Powder
Puts the target to sleep.
---
Thunder Wave
Paralyzes the target. Ground-type Pokémon are unaffected.
Previous:
Thunder Wave
Paralyzes the target.
---
Thunder
Has a 30% chance of paralyzing the target. In rain, this move
never misses. In harsh sunlight, this move's accuracy is 50%.
This move can hit a target that has the Sky-High status.
Previous:
Thunder
Has a 30% chance of paralyzing the target. This move never
misses in rain and can hit a target that has the Sky-High status.
---
Spore
Puts the target to sleep. Grass-type Pokémon are unaffected.
Previous:
Spore
Puts the target to sleep.
---
Slash
This move has a 1-stage Critical-Hit Ratio Boost.
---
Substitute
The user loses 1/4 of its max HP to create a substitute. The
substitute will be hit by moves instead of the user, and it will
vanish when it takes damage equal to 1/4 of the user's max HP.
Sound-based moves will hit the user through the substitute.
Previous:
Substitute
The user loses 1/4 of its max HP to create a substitute. The
substitute will be hit by moves instead of the user, and it will
vanish when it takes damage equal to 1/4 of the user's max HP.
---
Cotton Spore
Lowers targets' Speed stats by 2 stages. Grass-type Pokémon
are unaffected.
Previous:
Cotton Spore
Lowers targets' Speed stats by 2 stages.
---
Octazooka
Has a 50% chance of lowering the target's accuracy by 1 stage.
---
Milk Drink
Restores 1/2 of the max HP of the user or an ally.
---
Rage Powder
The user redirects opponents' moves toward itself. This effect
works only on single-target moves. Grass-type Pokémon are
unaffected.
Previous:
Rage Powder
The user redirects opponents' moves toward itself. This effect
works only on single-target moves.
---
Shift Gear
Boosts the user's Attack stat by 1 stage and Speed stat by
2 stages.
---
Hurricane
Has a 30% chance of confusing the target. In rain, this move
never misses. In harsh sunlight, this move's accuracy is 50%.
This move can hit a target that has the Sky-High status.
Previous:
Hurricane
Has a 30% chance of confusing the target. This move never
misses in rain and can hit a target that has the Sky-High status.
---
Zing Zap
Has a 30% chance of making the target flinch.
---
Snipe Shot
This move ignores the effects of Abilities and moves that draw
in moves. It has a 1-stage Critical-Hit Ratio Boost.
---
Jaw Lock
The user and target gain the Jaw Locked status.
---
Magic Powder
Changes the target's type to Psychic. Grass-type Pokémon
are unaffected.
Previous:
Magic Powder
Changes the target's type to Psychic.
---
Octolock
Gives the target the Octolocked and Can't Escape statuses.
---
Court Change
Swaps the statuses affecting the user's side of the field with the
statuses affecting the opponent's side of the field.
---
Drum Beating
Lowers the target's Speed stat by 1 stage.
---
Pyro Ball
Has a 10% chance of burning the target. Cures the user of
being frozen.
---
Meteor Assault
The user gains the Recharging status on the turn after this move
is used.
---
Glaive Rush
The user gains the Wide Open status until the next time it takes
an action.
---
Upper Hand
Makes the target flinch. This move fails if the target isn't about
to use a priority attack.
Previous:
Upper Hand
Makes the target flinch. This move fails if the target isn't about
to use a priority move.
---
```

Notes/discrepancies to check at implementation time:
- Entries with a `Previous:` block are wording/mechanic **changes** to moves
  already modeled in `config/championsMoveOverrides.ts` — the powder-move
  cluster (Poison Powder, Stun Spore, Sleep Powder, Spore, Cotton Spore,
  Rage Powder, Magic Powder) all gain an explicit "Grass-type Pokémon are
  unaffected" clause, Thunder Wave gains a parallel "Ground-type Pokémon
  are unaffected" clause, and Thunder/Hurricane's weather-accuracy wording
  is reworded (same mechanic, clause order changed) — confirm none of these
  are silent mechanic changes disguised as wording tidy-ups before treating
  them as no-ops. Substitute's before/after text is byte-identical except
  for the added "Sound-based moves will hit the user through the
  substitute" sentence — that's the one real addition there.
- Entries with **no** `Previous:` block (Slash, Octazooka, Milk Drink,
  Shift Gear, Zing Zap, Snipe Shot, Jaw Lock, Octolock, Court Change, Drum
  Beating, Pyro Ball, Meteor Assault, Glaive Rush) read as moves newly
  added to the Champions movepool rather than existing-move edits —
  cross-check each against `config/championsMovepoolAdditions.ts` and the
  mainline PokeAPI move data before assuming "no Previous: line" always
  means "brand new to Champions." Upper Hand does have a `Previous:` block
  (listed above with the others) — its diff is only "priority attack" vs.
  "priority move" wording, likely a non-functional tidy-up, but confirm.

## Dump 3: New + changed abilities (received 2026-09-08)

```
Speed Boost
Boosts the Pokémon's Speed stat by 1 stage at the end of
every turn. The Speed stat will not be boosted on the turn
that the Pokémon switches into battle.
Previous:
Speed Boost
Boosts the Pokémon's Speed stat by 1 stage at the end of
every turn.
---
Sand Veil
Boosts the Pokémon's evasiveness by 25% in a sandstorm.
The Pokémon takes no damage from sandstorms.
Previous:
Sand Veil
Boosts the Pokémon's evasiveness by 25% in a sandstorm.
---
Effect Spore
When the Pokémon is hit by a contact move, the attacker has a
30% chance of being poisoned, paralyzed, or put to sleep.
Grass-type Pokémon are unaffected.
Previous:
Effect Spore
When the Pokémon is hit by a contact move, the attacker has a
30% chance of being poisoned, paralyzed, or put to sleep.
---
Run Away
Enables the Pokémon to ignore any effects that would usually
prevent it from switching out of battle and being replaced by
another party Pokémon.
---
Liquid Ooze
When the Pokémon is hit by an HP-absorbing move, the
attacker does not restore HP but instead takes damage equal
to the amount of HP it would have restored.
---
Rattled
When the Pokémon takes damage from a Dark-, Ghost-, or
Bug-type move or when it is on the receiving end of Intimidate,
its Speed stat is boosted by 1 stage.
---
Prankster
Increases the priority of the Pokémon's status moves by 1 stage.
However, the Pokémon's status moves no longer work against
Dark-type Pokémon.
Previous:
Prankster
Increases the priority of the Pokémon's status moves by 1 stage.
---
Grass Pelt
Boosts the Pokémon's Defense stat by 50% on Grassy Terrain.
---
Emergency Exit
The Pokémon switches out of battle when its HP drops to 1/2 or
less of its max.
---
Stakeout
Doubles the power of the Pokémon's moves when it attacks
targets that have just switched into battle.
---
Psychic Surge
Turns the entire field into Psychic Terrain for 5 turns when the
Pokémon enters a battle.
---
Grassy Surge
Turns the entire field into Grassy Terrain for 5 turns when the
Pokémon enters a battle.
---
Libero
Changes the Pokémon's type to the type of the move it's
about to use. This works only once per time the Pokémon
enters battle.
---
Punk Rock
Boosts the power of the Pokémon's sound-based moves
by 30% and halves the damage the Pokémon takes from
sound-based moves.
---
Steely Spirit
Boosts the power of the Steel-type moves of the Pokémon and
its allies by 50%.
---
Seed Sower
Turns the entire field into Grassy Terrain for 5 turns when the
Pokémon takes damage from moves.
---
Thermal Exchange
When the Pokémon takes damage from a Fire-type move, its
Attack stat is boosted by 1 stage. The Pokémon cannot be
burned.
---
Guard Dog
Intimidate does not work on the Pokémon. Instead, it boosts
the Pokémon's Attack stat by 1 stage. The Pokémon is also
unaffected by the moves and held items of other Pokémon
that would force it to switch out of battle.
---
Aura Guard
Halves the damage the Pokémon takes from contact moves.
---
```

Notes/discrepancies to check at implementation time:
- **Naming conflict, flag prominently:** the earlier-confirmed Mega Lucario
  Z ability was tracked as **"Aura Break"** (per `project_regulation_mc_prep`
  memory and the TODO item's "3 Mega Z abilities" note), but this dump's
  ability list has no "Aura Break" entry — it has **"Aura Guard"** instead,
  with the exact effect ("halves the damage the Pokémon takes from contact
  moves") previously attributed to Aura Break. This is very likely the same
  ability under its real/corrected name — treat **Aura Guard** as the
  authoritative name for `config/megaAbilities.ts`'s Lucario entry and
  correct "Aura Break" wherever it was written, rather than adding both as
  separate abilities.
- Entries with a `Previous:` block (Speed Boost, Sand Veil, Effect Spore,
  Prankster) are changes to abilities the app may already reference for
  existing species — Speed Boost/Sand Veil gain a second clause (no
  switch-in turn boost; sandstorm-immunity), Effect Spore gains the same
  Grass-type-immunity carve-out as dump 2's powder moves, and Prankster
  gains the well-known "doesn't work on Dark-types" downside. Confirm these
  against whatever ability-effect config already models them before
  assuming a wording tidy-up.
- Entries with no `Previous:` block are mainline abilities newly relevant
  to Champions because they belong to species from dump 1's new-species
  roster (not brand-new ability concepts) — e.g. Libero→Cinderace, Grassy
  Surge→Rillaboom, Psychic Surge→Indeedee (Male), Punk Rock→Toxtricity,
  Emergency Exit→Golisopod, Grass Pelt→Gogoat, Liquid Ooze/Run
  Away→Swalot line, Guard Dog→Mabosstiff. Exact species↔ability pairing for
  the rest (Rattled, Stakeout, Steely Spirit, Seed Sower, Thermal Exchange)
  needs confirming against PokeAPI/Bulbapedia at implementation time rather
  than assumed from memory here.
