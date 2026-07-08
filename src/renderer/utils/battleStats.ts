/**
 * battleStats.ts - Statistics Page Aggregations
 * Pure functions deriving view-model stats from the existing Battle[]
 * array (no schema changes, no new persisted store - see TODO.md's
 * Statistics page entry). Only battles with result !== 'in-progress'
 * count toward win/loss math.
 */

import type { Battle } from '../types/pokemon';

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

