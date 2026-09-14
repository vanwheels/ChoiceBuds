/**
 * CalcOpponentTray.tsx - "Load From Opponent" Picker for One Calc Pokemon Panel
 * Sibling to CalcTeamTray.tsx (same click-to-load sprite-row shape) but for
 * the current Battle Log session's opponent roster instead of one of the
 * user's own saved Teams - lets the global floating Calc launcher populate
 * with whichever opponent Pokemon a session has revealed so far, with no
 * per-opponent-tile trigger needed (Regular Calc Battle Log Integration Leg
 * 3, see TODO.md - replaced the original per-tile "Calc" button with this
 * always-available tray). Only rendered by CalcPokemonPanel when
 * a roster was actually handed down (i.e. a Battle Log session is
 * currently open) - `null` otherwise, same as CalcTeamTray's own
 * empty-state.
 *
 * No drag support, unlike CalcTeamTray - this tray is a much smaller,
 * single-purpose add relative to the full Team tray's drag-between-panels
 * affordance, and click-to-load already covers the ask.
 *
 * Live, not a snapshot: RecordMatchForm re-registers its roster with the
 * global Calc popup on every add/remove/reveal (see App.tsx's
 * battleLogSession doc), so this tray always reflects the opponent's
 * currently-revealed Pokemon, including ones added after Calc was opened.
 */

import type { OpponentPokemonEntry } from '../../types/pokemon';

interface CalcOpponentTrayProps {
  opponentRoster: OpponentPokemonEntry[];
  resolveSprite: (remoteUrl: string) => string;
  onLoadPokemon: (entry: OpponentPokemonEntry) => void;
}

export default function CalcOpponentTray({ opponentRoster, resolveSprite, onLoadPokemon }: CalcOpponentTrayProps) {
  if (opponentRoster.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 pb-2 border-b border-zinc-800">
      <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Load from Opponent</label>
      <div className="flex gap-1.5 flex-wrap">
        {opponentRoster.map(entry => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onLoadPokemon(entry)}
            title={`${entry.species} - click to load`}
            className="w-9 h-9 shrink-0 rounded bg-zinc-800 border border-zinc-600 hover:border-accent-gold flex items-center justify-center cursor-pointer transition-colors"
          >
            <img
              src={resolveSprite(entry.spriteUrl)}
              alt={entry.species}
              className="w-7 h-7 object-contain [image-rendering:pixelated]"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
