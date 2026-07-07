/**
 * Champions Status Condition Mechanics
 * Reference constants only - nothing in the app displays these yet. Added
 * for future work (the planned Battle Logger stat-inference feature needs
 * to reason about real thaw/paralysis/wake-up odds). Verified against:
 *   https://www.serebii.net/pokemonchampions/statusconditions.shtml
 *   https://bulbapedia.bulbagarden.net/wiki/Pokémon_Champions
 */

export const CHAMPIONS_STATUS_CONDITIONS = {
  freeze: {
    thawChancePerTurn: 0.25, // mainline: 0.20
    guaranteedThawTurn: 3, // always thaws by the 3rd turn frozen - no mainline equivalent cap
  },
  paralysis: {
    fullParalysisChance: 0.125, // mainline: 0.25
  },
  sleep: {
    minTurns: 2,
    maxTurns: 3, // mainline: 2-4
    wakeChanceOnTurn2: 1 / 3,
  },
} as const;
