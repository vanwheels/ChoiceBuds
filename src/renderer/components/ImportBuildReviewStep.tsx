/**
 * ImportBuildReviewStep.tsx - "Use a Saved Build Instead?" Import Review Step
 * Swapped in for ImportTeamModal.tsx's paste-text step (Saved Builds
 * Database for Team-Building Leg 2, see TODO.md) whenever 1+ parsed Pokémon
 * in the pasted paste matches a saved build by species. One row per parsed
 * Pokémon *instance* with a match, not per unique species - a duplicate
 * species in the same paste gets independent rows, each free to pick
 * differently.
 *
 * Presentational only, same split-out-when-it-grows convention as the rest
 * of components/ - all state (selections, the parsed list itself) lives in
 * ImportTeamModal.tsx.
 */

import type { SavedPokemonEntry } from '../types/pokemon';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import type { ImportReviewRow } from '../utils/importReview';

interface ImportBuildReviewStepProps {
  rows: ImportReviewRow[];
  /** Keyed by ImportReviewRow.index; absent/undefined means "Keep pasted" for that row. */
  selections: Record<number, SavedPokemonEntry>;
  resolveSprite: (remoteUrl: string) => string;
  onSelect: (index: number, entry: SavedPokemonEntry | null) => void;
}

const KEEP_PASTED_VALUE = '__keep_pasted__';

export default function ImportBuildReviewStep({ rows, selections, resolveSprite, onSelect }: ImportBuildReviewStepProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Some of the Pokémon you pasted match a saved build. Pick "Keep pasted" to use the
        pasted set as-is, or swap in a saved build for that slot.
      </p>

      {rows.map(row => {
        const selected = selections[row.index];
        const sprite = row.matches[0].pokemon;

        return (
          <div
            key={row.index}
            className="flex items-center gap-3 p-3 bg-zinc-700 border border-zinc-600 rounded-lg"
          >
            <img
              src={resolveSprite(getPixelSpriteUrl(
                sprite.pokedexNumber,
                sprite.showdownData.species,
                sprite.showdownData.gender || 'M',
                sprite.showdownData.shiny
              ))}
              alt={row.pokemon.species}
              className="w-10 h-10 object-contain [image-rendering:pixelated] shrink-0"
            />

            <span className="flex-1 text-sm font-medium text-zinc-100 truncate">
              {row.pokemon.nickname || row.pokemon.species}
            </span>

            <select
              value={selected ? selected.id : KEEP_PASTED_VALUE}
              onChange={(e) => {
                const value = e.target.value;
                if (value === KEEP_PASTED_VALUE) {
                  onSelect(row.index, null);
                  return;
                }
                const entry = row.matches.find(m => m.id === value) ?? null;
                onSelect(row.index, entry);
              }}
              className="px-3 py-1.5 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold"
            >
              <option value={KEEP_PASTED_VALUE}>Keep pasted</option>
              {row.matches.map(entry => (
                <option key={entry.id} value={entry.id}>{entry.label}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
