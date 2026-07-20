/**
 * Move-Blocking Abilities (Battle Logger "Blocked" outcome)
 * Drives two things off one table: (1) MoveOutcomePrompt.tsx's unrevealed-
 * ability picker, which only offers itself when at least one of a target's
 * species-legal abilities could plausibly block the move actually being
 * logged, and (2) the underlying "could this ability block this move" check
 * used once an ability is already known. A block is modeled as matching the
 * move's type, its damage category, or an explicit move-name list -
 * whichever shape actually fits the real game mechanic; abilities that also
 * carry a stat-stage-boost side effect (Sap Sipper/Storm Drain/Lightning
 * Rod/Motor Drive) are listed here too for the "could block" check, with
 * their boost itself tracked separately in config/hitReactiveAbilities.ts,
 * which already has a fitting trigger/changes shape - no reason to invent a
 * second mechanism for the same effect.
 *
 * Researched against Bulbapedia, cross-checked against Serebii per this
 * project's source-verification convention (CLAUDE.md). One correction
 * caught by the cross-check: Bulbapedia's sound-based-moves category page
 * includes "Shadow Panic," a Shadow move exclusive to Pokémon XD: Gale of
 * Darkness with no modern-game/Champions availability at all - dropped from
 * Soundproof's list below rather than carried in as dead weight.
 *
 * Deliberately excluded, all real move-blocking abilities but each needing
 * data or mechanics this pass doesn't take on (documented, not silently
 * dropped, same convention as config/hitReactiveAbilities.ts's own header):
 * - Wonder Guard: blocks anything that isn't super-effective, a condition
 *   keyed off the already-computed per-target `effectiveness` multiplier
 *   (BattleAction.effectiveness) rather than a move's type/category/name -
 *   a genuinely different shape than every rule kind below, and Shedinja is
 *   essentially unplayed in real VGC doubles (a spread move or weather tick
 *   one-shots its 1 HP), so it doesn't earn a bespoke rule kind this pass.
 * - Status-condition-immunity abilities (Limber, Insomnia/Vital Spirit,
 *   Immunity, Water Veil/Water Bubble, Magma Armor, Purifying Salt,
 *   Comatose): these would block moves like Thunder Wave/Toxic/Will-O-Wisp
 *   entirely, but confirming a status was actually inflicted already goes
 *   through a separate mechanism (BattlefieldSlot.tsx's own "Inflict
 *   {Status}?" chip, driven by BattleAction.statusAilment) that this pass
 *   doesn't reconcile with the Blocked-outcome model built here - a real
 *   gap, left for a dedicated follow-up rather than half-wiring it in.
 * - Aroma Veil/Sweet Veil/Oblivious (vs. Taunt/Encore/Torment/Disable/Heal
 *   Block/Attract) and Own Tempo (vs. confusion): already excluded in
 *   config/hitReactiveAbilities.ts's header for the same reason - none of
 *   confusion or that "mental move" family are tracked anywhere in this
 *   app's data model at all.
 * - Clear Body/White Smoke/Full Metal Body/Hyper Cutter/Big Pecks/Keen
 *   Eye/Illuminate/Mind's Eye (stat-drop immunity): architecturally
 *   different from every rule below - config/moveStatEffects.ts's
 *   deterministic stat drops are auto-applied by logAction *before* any
 *   confirmation prompt shows, so blocking them needs the auto-apply logic
 *   itself to check the target's ability first, not a new prompt toggle.
 * - Dazzling/Queenly Majesty/Armor Tail (priority-move blocking): needs a
 *   `priority` field on MoveData that doesn't exist yet (PokeAPI has it,
 *   just never fetched/stored) - a real addition, not free, deferred.
 * - Shield Dust/Battle Armor/Shell Armor: don't block a move at all - the
 *   move still deals its damage, these only strip a chance-based secondary
 *   effect (Shield Dust) or prevent the Crit toggle specifically (Battle
 *   Armor/Shell Armor, already just a matter of not tapping Crit in
 *   MoveOutcomePrompt for that target) - no gap to fill here.
 * - Telepathy: avoids damage from an *ally's* move, not an opponent's -
 *   a different targeting relationship than every other ability here,
 *   which all block an opposing Pokemon's move. Worth its own follow-up if
 *   spread-move friendly fire ever gets modeled, not bundled in blind.
 * - Damp blocking the Aftermath *ability* (not a move) when its holder
 *   faints is out of scope for a move-blocking table by definition.
 */

export type BlockRule =
  | { kind: 'type'; type: string }
  | { kind: 'category'; category: 'status' }
  | { kind: 'move-list'; moves: string[] };

/** Bulbapedia's Category:Sound-based_moves, cross-checked against Serebii - see file header. */
export const SOUND_BASED_MOVES = [
  'Alluring Voice', 'Boomburst', 'Bug Buzz', 'Chatter', 'Clanging Scales', 'Clangorous Soul',
  'Clangorous Soulblaze', 'Confide', 'Disarming Voice', 'Dragon Cheer', 'Echoed Voice',
  'Eerie Spell', 'Grass Whistle', 'Growl', 'Heal Bell', 'Howl', 'Hyper Voice', 'Metal Sound',
  'Noble Roar', 'Overdrive', 'Parting Shot', 'Perish Song', 'Psychic Noise', 'Relic Song',
  'Roar', 'Round', 'Screech', 'Sing', 'Snarl', 'Snore', 'Sparkling Aria', 'Supersonic',
  'Torch Song', 'Uproar',
];

const MOVE_BLOCKING_ABILITIES: Record<string, BlockRule> = {
  // Type-immunity abilities. Volt Absorb/Water Absorb/Flash Fire/Dry Skin heal HP or buff move
  // power on the move they block - this app tracks no numeric/% HP and no move-power-buff concept
  // (only a boolean fainted flag and stat stages), so unlike the 4 below they can't also drive an
  // auto-apply chip the way config/hitReactiveAbilities.ts's stat-boost abilities do; a plain
  // Blocked tag is the correct, complete outcome for these, not a shortcut.
  'levitate': { kind: 'type', type: 'ground' },
  'flash-fire': { kind: 'type', type: 'fire' },
  'volt-absorb': { kind: 'type', type: 'electric' },
  'water-absorb': { kind: 'type', type: 'water' },
  'dry-skin': { kind: 'type', type: 'water' },
  // These 4 also carry a stat-stage boost - see config/hitReactiveAbilities.ts for that half.
  'sap-sipper': { kind: 'type', type: 'grass' },
  'storm-drain': { kind: 'type', type: 'water' },
  'lightning-rod': { kind: 'type', type: 'electric' },
  'motor-drive': { kind: 'type', type: 'electric' },

  // Blocks (or, for Magic Bounce, reflects - a "no effect on this target" outcome either way from
  // the target's own side of the log) any directly-targeted status move. Real exceptions exist for
  // both (moves that target a whole side/field, or an ally, aren't blocked) but this app only
  // reaches this per-target flow for moves that already got a specific opponent target selected -
  // self/field moves auto-resolve without going through target selection at all (see
  // Battlefield.tsx) - so the exception cases don't actually surface here in practice.
  'good-as-gold': { kind: 'category', category: 'status' },
  'magic-bounce': { kind: 'category', category: 'status' },

  // "Ball and bomb" moves - Bulbapedia's Category:Ball_and_bomb_moves, cross-checked against
  // Serebii's own Bulletproof page (identical list).
  'bulletproof': {
    kind: 'move-list', moves: [
      'Acid Spray', 'Aura Sphere', 'Barrage', 'Beak Blast', 'Bullet Seed', 'Egg Bomb',
      'Electro Ball', 'Energy Ball', 'Focus Blast', 'Gyro Ball', 'Ice Ball', 'Magnet Bomb',
      'Mist Ball', 'Mud Bomb', 'Octazooka', 'Pollen Puff', 'Pyro Ball', 'Rock Blast',
      'Rock Wrecker', 'Searing Shot', 'Seed Bomb', 'Shadow Ball', 'Sludge Bomb', 'Syrup Bomb',
      'Weather Ball', 'Zap Cannon',
    ],
  },
  // Sound-based moves - Bulbapedia's Category:Sound-based_moves, cross-checked against Serebii's
  // own Soundproof page (identical apart from Shadow Panic - see file header). Shared with
  // config/typeChangingAbilities.ts's Liquid Voice rule (same move category, no reason to
  // duplicate the list) - see SOUND_BASED_MOVES below.
  'soundproof': { kind: 'move-list', moves: SOUND_BASED_MOVES },
  // Powder/spore moves - Bulbapedia's Category:Powder_and_spore_moves (8 real moves; the category
  // page's own self-listing entry isn't a move). Overcoat also blocks sandstorm/hail chip damage
  // and Effect Spore's ability-trigger, neither of which is a "move" this table's shape covers.
  'overcoat': {
    kind: 'move-list', moves: [
      'Cotton Spore', 'Magic Powder', 'Poison Powder', 'Powder', 'Rage Powder', 'Sleep Powder',
      'Spore', 'Stun Spore',
    ],
  },
  // The explosive-move family Damp prevents from even being used. Confirmed on Bulbapedia's own
  // Damp page that Blast Burn/Powder/Pollen Puff/Shell Trap are NOT blocked despite the "explosive"
  // association - only these 4 are the real list.
  'damp': { kind: 'move-list', moves: ['Self-Destruct', 'Explosion', 'Mind Blown', 'Misty Explosion'] },
};

function toSlug(ability: string): string {
  return ability.toLowerCase().trim().replace(/\s+/g, '-');
}

export function getBlockRule(ability: string | undefined): BlockRule | null {
  if (!ability) return null;
  return MOVE_BLOCKING_ABILITIES[toSlug(ability)] ?? null;
}

/** Whether a known ability would block a move of the given type/category/name. */
export function abilityBlocksMove(
  ability: string | undefined,
  move: string,
  moveType: string | undefined,
  moveCategory: string | undefined,
): boolean {
  const rule = getBlockRule(ability);
  if (!rule) return false;
  if (rule.kind === 'type') return moveType === rule.type;
  if (rule.kind === 'category') return moveCategory === rule.category;
  return rule.moves.some(m => m.toLowerCase() === move.trim().toLowerCase());
}

/**
 * Of a species' legal abilities, which (if any) could plausibly block the given move - drives
 * MoveOutcomePrompt.tsx's unrevealed-ability picker, so it only ever offers itself when there's a
 * real reason to (not on every single target of every move).
 */
export function abilitiesThatCouldBlock(
  legalAbilities: string[],
  move: string,
  moveType: string | undefined,
  moveCategory: string | undefined,
): string[] {
  return legalAbilities.filter(a => abilityBlocksMove(a, move, moveType, moveCategory));
}
