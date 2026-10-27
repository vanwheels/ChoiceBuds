import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Team, type TeamVisibility } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { getTotalSP, MAX_TOTAL_SP } from '../utils/evTotal';
import { resolveActiveMegaSlug } from '../config/megaEvolution';
import { getCachedMegaSprite } from '../hooks/useMegaSprite';
import { useActiveFormsForIds } from '../hooks/usePokemonFormToggle';
import RegulationBadge from './RegulationBadge';
import TeamVisibilityBadge from './TeamVisibilityBadge';
import TeamOverflowMenu from './TeamOverflowMenu';

interface TeamCardHeaderProps {
  team: Team;
  resolveSprite: (remoteUrl: string) => string;
  onContextMenu: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onFormatChange: (format: Team['format']) => void;
  onVisibilityChange: (visibility: TeamVisibility) => void;
  localTeamName: string;
  onTeamNameChange: (value: string) => void;
  onTeamNameBlur: () => void;
  localAuthor: string;
  onAuthorChange: (value: string) => void;
  onAuthorBlur: () => void;
  onToggleFavorite: () => void;
  onGripPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  rulesetId: RegulationId;
  onExport: () => void;
  onExportImage: () => void;
  onExportPdf: () => void;
  onDelete?: () => void;
}

// MINIMIZED VIEW CONTAINER ROW - Enhanced Header with Controls, split out of
// TeamCard.tsx (File Cap Splits: TeamCard.tsx, see TODO.md) with no behavior
// change. rounded-t-xl replaces the parent's old overflow-hidden clip
// (removed so tooltips/popovers from expanded cards below are never cut off).
export default function TeamCardHeader({
  team,
  resolveSprite,
  onContextMenu,
  onFormatChange,
  onVisibilityChange,
  localTeamName,
  onTeamNameChange,
  onTeamNameBlur,
  localAuthor,
  onAuthorChange,
  onAuthorBlur,
  onToggleFavorite,
  onGripPointerDown,
  isExpanded,
  onToggleExpand,
  rulesetId,
  onExport,
  onExportImage,
  onExportPdf,
  onDelete,
}: TeamCardHeaderProps) {
  // Hook can't run per slot inside the strip's map (Rules of Hooks).
  const activeForms = useActiveFormsForIds((team.pokemon ?? []).map((p) => p.id));
  return (
    <div
      onContextMenu={onContextMenu}
      className="w-full flex flex-col md:flex-row md:items-center md:min-h-[116px] gap-3 md:gap-0 py-4 px-3 md:px-5 bg-zinc-950/40 rounded-t-xl transition-colors"
    >
      {/* Identity column (header/controls rework leg 2, see TODO.md) - regulation
          badge, team name, and author all moved here from the old far-right
          button cluster, matching the approved mockup's left-column grouping.
          Full width and its own stacked row below `md` (Responsive Layout
          Audit: Teams & Box Leg 1, see TODO.md) - the fixed 190px column
          this row shares with the sprite strip/controls pill has no room on
          a phone viewport, so below `md` each of the three becomes its own
          full-width row instead. */}
      <div className="flex flex-col gap-1 w-full md:min-w-[190px] md:max-w-[190px] md:shrink-0">
        {/* Visibility badge (Teams Page Profile-Visibility Indicator, see
            TODO.md) sits next to the regulation badge - same
            clickable-dropdown shape, shown for every team (including
            Private) so the Teams tab always reflects current profile
            visibility at a glance, not just when a team is already public. */}
        <div className="flex items-center gap-1.5">
          <RegulationBadge team={team} onChange={onFormatChange} />
          <TeamVisibilityBadge team={team} onChange={onVisibilityChange} />
        </div>

        {/* Team name - permanently editable (Always-On Editing Leg 1, see
            TODO.md), no more isEditingTeam gate. Shows the raw stored
            team.name; no special-casing needed for the old Reg M-A/M-B/M-C
            display prefix (see Team Name Field Reg-Prefix Display in
            COMPLETED.md) - useTeams.ts's normalizeTeam strips it from
            team.name at the read boundary, so it's never present by the
            time this input reads it. */}
        <input
          type="text"
          value={localTeamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          onBlur={onTeamNameBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          placeholder="Untitled Team"
          className="text-left font-bold text-base text-zinc-100 truncate tracking-wide mt-0.5"
          style={{
            backgroundColor: 'transparent',
            borderBottom: '1px dashed #4b5563',
            color: '#ffffff',
            fontWeight: 'bold',
            outline: 'none',
            padding: '0.125rem 0.25rem',
          }}
        />

        {/* Author - team-level metadata, not per-Pokemon. Pokepaste pages carry one; a plain
            Showdown export doesn't, so this stays manually editable either way. Permanently
            editable (Always-On Editing Leg 1, see TODO.md) - the placeholder covers the
            empty-chrome case the old hide-when-empty behavior used to handle. */}
        <input
          type="text"
          value={localAuthor}
          onChange={(e) => onAuthorChange(e.target.value)}
          onBlur={onAuthorBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="Author"
          title="Author"
          className="w-24 px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-600 outline-none focus:border-accent-gold"
        />
      </div>

      {/* Mini sprite strip (Team Header Sprite Strip leg 1, see TODO.md) -
          flat, non-animated row of species sprites, reverted from the 3D
          coverflow (design-approved 2026-08-29, see TeamCoverflow.tsx's
          history): the perspective/scaling on off-center sprites actively
          hurt the quick species recognition this strip exists for. Always
          reserves 6 slots (empty ones padded) so the strip's width - and
          therefore its centered position between the identity column and
          the controls pill - stays fixed regardless of roster size, same
          as the original pre-coverflow strip. Sprites sized up from that
          strip's 32px to 56px since the 2-column layout's taller header
          (min-h-[116px] above, grown to fit the coverflow) affords more
          room than the strip needs at its old size. Note this strip's
          content width (6 * 56px + 5 * 8px gaps = 376px) is well past the
          coverflow's old fixed 240px box that TeamsPage.tsx's 2-column
          breakpoint comment measured its floor against - that breakpoint
          hasn't been re-verified live against this new width. flex-wrap
          below `md` (Responsive Layout Audit: Teams & Box Leg 1, see
          TODO.md) - even a full-width mobile row isn't reliably wide
          enough for the strip's 376px content, so it wraps into 2 rows of
          3 there instead of overflowing. */}
      <div className="w-full md:flex-1 flex items-center justify-center">
        <div className="flex flex-row items-center gap-2 flex-wrap justify-center">
          {Array.from({ length: 6 }, (_, idx) => team.pokemon?.[idx]).map((p, idx) => {
            if (!p) return <div key={idx} className="w-14 h-14 shrink-0" />;
            // Same "own Mega Stone AND toggle on" gate the expanded card's
            // sprite uses - holding the stone alone isn't Mega-evolved.
            const megaApiSlug = resolveActiveMegaSlug(
              p.showdownData.item,
              p.showdownData.species,
              activeForms[p.id] ?? null,
            );
            const megaSprite = megaApiSlug ? getCachedMegaSprite(megaApiSlug) : null;
            const spriteUrl = megaSprite
              ? p.showdownData.shiny
                ? megaSprite.shinySpriteUrl
                : megaSprite.spriteUrl
              : getPixelSpriteUrl(
                  p.pokedexNumber,
                  p.showdownData.species,
                  p.showdownData.gender || 'M',
                  p.showdownData.shiny,
                );
            // Over-cap SP warning (Speed Tiers Save Override: Over-Cap SP
            // Warning, see TODO.md) - surfaced here too, not just on the
            // expanded PokemonCard, so the overage is visible without
            // expanding the team card at all.
            const totalSP = getTotalSP(p.showdownData.evs);
            const isOverSPCap = totalSP > MAX_TOTAL_SP;
            return (
              <div key={idx} className="relative w-14 h-14 shrink-0">
                <img
                  src={resolveSprite(spriteUrl)}
                  alt={p.showdownData.species}
                  className="w-14 h-14 object-contain [image-rendering:pixelated]"
                />
                {isOverSPCap && (
                  <span
                    title={`${p.showdownData.nickname || p.showdownData.species}: total SP (${totalSP}) exceeds the ${MAX_TOTAL_SP} cap`}
                    className="absolute -top-1 -right-1 text-[9px] font-bold leading-none px-1 py-0.5 rounded bg-red-600 text-white border border-red-400"
                  >
                    ⚠
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pill-shaped controls cluster (header/controls rework leg 2, see
          TODO.md) - the Edit button that used to live here is gone
          (Always-On Editing Leg 1, see TODO.md): field-level edits no
          longer need a mode toggle to unlock. The Drag handle re-adds Leg
          1's other structural gate (drag-reorder) with its own
          always-visible trigger (Always-On Editing Leg 2); delete-slot,
          swap, and add-Pokemon get theirs down in the roster grid instead,
          since they're per-Pokemon/per-slot rather than team-level.
          Everything else (Validate/Export/Export Image/Export PDF/Delete)
          still lives in TeamOverflowMenu.tsx's "⋮" dropdown. Centered as
          its own full-width row below `md` (Responsive Layout Audit:
          Teams & Box Leg 1, see TODO.md), same stacking as the identity
          column/sprite strip above it. */}
      <div className="flex items-center justify-center md:justify-start gap-0.5 bg-zinc-800 border border-zinc-700 rounded-full p-1 w-full md:w-auto shrink-0">
        {/* Favorite toggle (Favorite Teams, see TODO.md) - favorited teams
            always sort to the top of the Teams page (TeamsPage.tsx's own
            sort), independent of the drag-reorder position setTeamOrder
            persists. Plain updateTeam call, same as RegulationBadge's
            onChange above - no dedicated hook action needed for a
            single-field toggle. */}
        <button
          onClick={onToggleFavorite}
          title={team.favorite ? 'Unfavorite' : 'Favorite'}
          className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
            team.favorite
              ? 'text-accent-gold hover:text-accent-gold-deep'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill={team.favorite ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
          </svg>
        </button>

        <span className="w-px h-[18px] bg-zinc-700 mx-0.5" />

        {/* Drag handle (Always-On Editing Leg 2, see TODO.md) - scoped to
            just this button, not the whole header, so dragging can't fight
            with clicking the name/author inputs or the Expand/overflow
            buttons (an always-draggable header was tried and reverted for
            exactly that ambiguity - see Leg 1's COMPLETED.md entry). Same
            grip-icon glyph as PokemonCard.tsx's per-slot handle. */}
        <div
          onPointerDown={onGripPointerDown}
          title="Drag to reorder"
          className="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full text-zinc-400 transition-colors select-none hover:text-zinc-200 hover:bg-zinc-700 cursor-grab"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <circle cx="9" cy="6" r="1.4" />
            <circle cx="15" cy="6" r="1.4" />
            <circle cx="9" cy="12" r="1.4" />
            <circle cx="15" cy="12" r="1.4" />
            <circle cx="9" cy="18" r="1.4" />
            <circle cx="15" cy="18" r="1.4" />
          </svg>
        </div>

        <span className="w-px h-[18px] bg-zinc-700 mx-0.5" />

        {/* Expand/Collapse Toggle Button */}
        <button
          onClick={onToggleExpand}
          className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer ${
            isExpanded ? 'bg-zinc-700 text-zinc-200' : ''
          }`}
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <span className="w-px h-[18px] bg-zinc-700 mx-0.5" />

        {/* Overflow ("More") Menu - Validate/Export/Export Image/Export PDF/Delete */}
        <TeamOverflowMenu
          team={team}
          rulesetId={rulesetId}
          onExport={onExport}
          onExportImage={onExportImage}
          onExportPdf={onExportPdf}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
