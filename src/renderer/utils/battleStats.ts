/**
 * battleStats.ts - Statistics Page Aggregations
 * Pure functions deriving view-model stats from the existing Battle[]
 * array (no schema changes, no new persisted store - see TODO.md's
 * Statistics page entry). Only battles with result !== 'in-progress'
 * count toward win/loss math.
 */

import type { Battle } from '../types/pokemon';
import { groupBattlesBySet, getSetOutcome } from './battleSets';
import { SEASONS, getSeasonForDate, type SeasonDef } from '../config/seasons';

export interface WinLossRecord {
  wins: number;
  losses: number;
  total: number;
  winRate: number; // 0-1, 0 when total is 0
}

export interface LabeledRecord extends WinLossRecord {
  label: string;
}

export interface PokemonUsageStat {
  species: string;
  spriteUrl: string;
  count: number;
  winRate: number; // win rate of battles the species was brought to, 0 when count is 0
}

export interface OpponentFacedStat {
  species: string;
  spriteUrl: string;
  count: number;
}

export interface TeamRosterUsageStat {
  species: string;
  spriteUrl: string;
  broughtCount: number; // completed battles for this team where this species was in broughtIds
  rate: number; // broughtCount / totalTeamBattles, 0-1, 0 when totalTeamBattles is 0
}

export interface TeamRosterUsage {
  teamId: string;
  teamName: string;
  totalTeamBattles: number; // completed battles logged for this team
  pokemon: TeamRosterUsageStat[]; // every species seen in a playerRoster snapshot for this team, sorted by rate desc
}

function toRecord(wins: number, losses: number): WinLossRecord {
  const total = wins + losses;
  return { wins, losses, total, winRate: total > 0 ? wins / total : 0 };
}

function completedBattles(battles: Battle[]): Battle[] {
  return battles.filter(b => b.result !== 'in-progress');
}

export function getOverallRecord(battles: Battle[]): WinLossRecord {
  const completed = completedBattles(battles);
  const wins = completed.filter(b => b.result === 'win').length;
  return toRecord(wins, completed.length - wins);
}

export function getRecordByFormat(battles: Battle[]): LabeledRecord[] {
  const completed = completedBattles(battles);
  const byFormat = new Map<string, { wins: number; losses: number }>();

  for (const battle of completed) {
    const entry = byFormat.get(battle.format) ?? { wins: 0, losses: 0 };
    if (battle.result === 'win') entry.wins++; else entry.losses++;
    byFormat.set(battle.format, entry);
  }

  return Array.from(byFormat.entries())
    .map(([label, { wins, losses }]) => ({ label, ...toRecord(wins, losses) }))
    .sort((a, b) => b.total - a.total);
}

/** Per-season record, derived from Battle.date - see config/seasons.ts. Ordered chronologically (season order), not by-total like the sibling breakdowns, since this one reads as a timeline. Battles predating/postdating every known season are skipped. */
export function getRecordBySeason(battles: Battle[]): LabeledRecord[] {
  const completed = completedBattles(battles);
  const bySeason = new Map<string, { wins: number; losses: number }>();

  for (const battle of completed) {
    const season = getSeasonForDate(battle.date);
    if (!season) continue;
    const entry = bySeason.get(season.label) ?? { wins: 0, losses: 0 };
    if (battle.result === 'win') entry.wins++; else entry.losses++;
    bySeason.set(season.label, entry);
  }

  return SEASONS
    .filter(s => bySeason.has(s.label))
    .map(s => {
      const { wins, losses } = bySeason.get(s.label)!;
      return { label: s.label, ...toRecord(wins, losses) };
    });
}

/** Season rows (in their existing chronological SEASONS order) that have at least one battle logged - completed or in-progress - used to populate the Statistics page's season filter without listing seasons the user has no data for yet. */
export function getSeasonsWithBattles(battles: Battle[]): SeasonDef[] {
  const ids = new Set(battles.map(b => getSeasonForDate(b.date)?.id).filter((id): id is string => id != null));
  return SEASONS.filter(s => ids.has(s.id));
}

export function getRecordByTeam(battles: Battle[]): LabeledRecord[] {
  const completed = completedBattles(battles);
  const byTeam = new Map<string, { label: string; wins: number; losses: number }>();

  for (const battle of completed) {
    const entry = byTeam.get(battle.teamId) ?? { label: battle.teamName, wins: 0, losses: 0 };
    if (battle.result === 'win') entry.wins++; else entry.losses++;
    byTeam.set(battle.teamId, entry);
  }

  return Array.from(byTeam.values())
    .map(({ label, wins, losses }) => ({ label, ...toRecord(wins, losses) }))
    .sort((a, b) => b.total - a.total);
}

/** Set-level (Bo3) record - only counts sets that are actually decided (2 wins either side); an in-progress or 1-1 set doesn't count toward either side yet. */
export function getSetRecord(battles: Battle[]): WinLossRecord {
  const groups = groupBattlesBySet(battles);
  let setsWon = 0;
  let setsLost = 0;

  for (const group of groups) {
    const outcome = getSetOutcome(group.battles);
    if (!outcome.decided) continue;
    if (outcome.wins > outcome.losses) setsWon++; else setsLost++;
  }

  return toRecord(setsWon, setsLost);
}

export function getRecentForm(battles: Battle[], limit = 20): { id: string; result: Battle['result'] }[] {
  return completedBattles(battles)
    .slice()
    .sort((a, b) => a.date - b.date)
    .slice(-limit)
    .map(b => ({ id: b.id, result: b.result }));
}

export function getMostUsedPokemon(battles: Battle[], topN = 10): PokemonUsageStat[] {
  const completed = completedBattles(battles);
  const bySpecies = new Map<string, { spriteUrl: string; wins: number; total: number }>();

  for (const battle of completed) {
    const brought = battle.playerRoster.filter(p => battle.broughtIds.includes(p.id));
    for (const pokemon of brought) {
      const entry = bySpecies.get(pokemon.species) ?? { spriteUrl: pokemon.spriteUrl, wins: 0, total: 0 };
      entry.total++;
      if (battle.result === 'win') entry.wins++;
      bySpecies.set(pokemon.species, entry);
    }
  }

  return Array.from(bySpecies.entries())
    .map(([species, { spriteUrl, wins, total }]) => ({
      species,
      spriteUrl,
      count: total,
      winRate: total > 0 ? wins / total : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Per-team brought-rate: for each team, every species that's ever appeared
 * in one of its completed-battle playerRoster snapshots, with how often it
 * was actually brought (broughtIds) vs. sitting on the roster unused. Unlike
 * getMostUsedPokemon (global, brought-only, no denominator), this surfaces
 * roster members that were *never* brought - they still need a totalTeamBattles
 * denominator to show up as a 0% row.
 */
export function getTeamRosterUsage(battles: Battle[]): TeamRosterUsage[] {
  const completed = completedBattles(battles);
  const byTeam = new Map<string, {
    teamName: string;
    totalTeamBattles: number;
    species: Map<string, { spriteUrl: string; broughtCount: number }>;
  }>();

  for (const battle of completed) {
    const team = byTeam.get(battle.teamId) ?? { teamName: battle.teamName, totalTeamBattles: 0, species: new Map() };
    team.totalTeamBattles++;
    for (const pokemon of battle.playerRoster) {
      const entry = team.species.get(pokemon.species) ?? { spriteUrl: pokemon.spriteUrl, broughtCount: 0 };
      if (battle.broughtIds.includes(pokemon.id)) entry.broughtCount++;
      team.species.set(pokemon.species, entry);
    }
    byTeam.set(battle.teamId, team);
  }

  return Array.from(byTeam.entries())
    .map(([teamId, { teamName, totalTeamBattles, species }]) => ({
      teamId,
      teamName,
      totalTeamBattles,
      pokemon: Array.from(species.entries())
        .map(([speciesName, { spriteUrl, broughtCount }]) => ({
          species: speciesName,
          spriteUrl,
          broughtCount,
          rate: totalTeamBattles > 0 ? broughtCount / totalTeamBattles : 0,
        }))
        .sort((a, b) => b.rate - a.rate),
    }))
    .sort((a, b) => b.totalTeamBattles - a.totalTeamBattles);
}

export function getMostFacedOpponents(battles: Battle[], topN = 10): OpponentFacedStat[] {
  const bySpecies = new Map<string, { spriteUrl: string; count: number }>();

  for (const battle of battles) {
    for (const opponent of battle.opponentRoster) {
      const entry = bySpecies.get(opponent.species) ?? { spriteUrl: opponent.spriteUrl, count: 0 };
      entry.count++;
      bySpecies.set(opponent.species, entry);
    }
  }

  return Array.from(bySpecies.entries())
    .map(([species, { spriteUrl, count }]) => ({ species, spriteUrl, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

