/**
 * Formats a Pokemon's Nature + EV spread into the "Stat Alignment" string
 * used both by the team poster export (TeamPosterTile.tsx) and the VGC Team
 * Sheet PDF export (services/teamSheetPdf.ts) - this app's 0-32 Stat Point
 * scale reusing Showdown's "EVs" field, same as services/parser.ts's
 * Showdown-text export documents.
 */
import type { ImportedPokemonInfo } from '../types/pokemon';

const EV_STAT_LABELS: Array<{ key: keyof ImportedPokemonInfo['showdownData']['evs']; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Atk' },
  { key: 'defense', label: 'Def' },
  { key: 'specialAttack', label: 'SpA' },
  { key: 'specialDefense', label: 'SpD' },
  { key: 'speed', label: 'Spe' },
];

export function formatStatAlignment(nature: string | undefined, evs: ImportedPokemonInfo['showdownData']['evs']): string {
  const evLine = EV_STAT_LABELS
    .filter(({ key }) => evs[key] > 0)
    .map(({ key, label }) => `${evs[key]} ${label}`)
    .join(' / ');
  return `${nature ? `${nature} - ` : ''}${evLine}`;
}
