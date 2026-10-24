/**
 * CoverageTable.tsx - Shared Layout for Offensive/Defensive Coverage Tables
 * Both tables are structurally identical (18 type rows, one column per team
 * slot, two aggregate count columns) - only the data, column labels, and
 * which direction counts as "favorable" differ, so a single generic table
 * covers both rather than duplicating markup.
 *
 * Every header `<th>` (type column, each pokemon slot, both aggregate-count
 * columns) shares one fixed `w-20` so the table reads as evenly-spaced
 * columns rather than `table-layout: auto` stretching whichever columns have
 * the least content of their own to fill the row - the two aggregate
 * columns in particular used to force themselves far wider than needed
 * fitting "Not Very Effective" on one `whitespace-nowrap` line; they now
 * wrap instead.
 *
 * Each header sprite also carries this table's own Mega-preview toggle
 * (Ability-Affects-Move Indicator & Type Matchup Mega Toggle Leg 3, see
 * TODO.md) - `activeForms`/`onToggleMegaForm` are this table's page-local
 * slice of TypeMatchupPage.tsx's `megaFormsByTable`, never the shared
 * team-card store (see that file's header comment). The sprite itself swaps
 * to the Mega form while genuinely active, same as EditablePokemonCore.tsx's
 * team/Box card (`getCachedMegaSprite`, reading the shared cache
 * TypeMatchupPage.tsx's `useMegaSpritePrefetch()` call warms - Rules of
 * Hooks forbids calling `useMegaSprite` itself inside this file's own
 * per-pokemon `.map()`) - unlike that card, though, there's no stone-held
 * "always on" sprite state here, since this toggle is the only Mega signal
 * this table has at all.
 *
 * A single-form Mega-capable species (holding its own stone) reuses
 * MegaFormToggleBadge exactly as the Team/Box card does. A split-form
 * species (Charizard/Raichu's X/Y stones - `resolveSplitFormOptions` below)
 * instead renders one small letter badge per form, mirroring
 * config/megaEvolution.ts's `resolveOpponentMegaControl` "choice" shape
 * (used by the Battle Logger's opponent Mega picker) - but unlike that
 * picker, this is team data with an already-known, fixed held item, not an
 * opponent's unconfirmed one, so there's no "reveal the item" step and only
 * ONE of the two letters can ever actually take effect:
 * hooks/useTeamMoveTypes.ts resolves Mega strictly off the real held item
 * (`resolveActiveMegaSlug`) and that gate is out of scope to change this
 * leg. Offering both letters but only lighting up the one that matches the
 * real stone - rather than letting either look "active" - is the correction
 * this leg's form-toggle-features.md check calls for: a toggle that visibly
 * activated without actually changing anything downstream would be exactly
 * the dead end that rule exists to catch.
 */

import type { ImportedPokemonInfo } from '../../types/pokemon';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { CoverageRow } from '../../utils/typeCoverage';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import {
  getMegaApiSlug,
  getMegaFormsForSpecies,
  formatMegaLabel,
  megaFormBadgeLetter,
} from '../../config/megaEvolution';
import { getCachedMegaSprite } from '../../hooks/useMegaSprite';
import TypeBadge from '../TypeBadge';
import CoverageCell from './CoverageCell';
import MegaFormToggleBadge from '../MegaFormToggleBadge';

/**
 * Charizard/Raichu's two-stone X/Y split specifically - distinct from
 * Absol/Garchomp/Lucario's Mega/Mega-Z pair (Reg M-C), which keeps the
 * single generic MegaFormToggleBadge like any other single-form Mega since
 * there's no letter-pair convention for those two forms. Returns null for
 * every non-X/Y species, including single-form ones and Mega/Mega-Z ones.
 */
function resolveSplitFormOptions(species: string): { slug: string; suffix: string }[] | null {
  const base = species.trim().toLowerCase();
  const xy = getMegaFormsForSpecies(species).filter(
    (f) => f.suffix === 'mega-x' || f.suffix === 'mega-y',
  );
  return xy.length < 2 ? null : xy.map((f) => ({ slug: `${base}-${f.suffix}`, suffix: f.suffix }));
}

// Threshold coloring for the two aggregate count columns (how many team
// slots land on each side for this type), independent of CoverageCell's
// per-cell magnitude palette - a row with 4+ weaknesses reads as a real
// team-building problem (red) even if none of the individual hits is a 4x.
const COUNT_BADGE = 'inline-block w-6 rounded py-0.5 font-semibold';

function unfavorableCountClasses(count: number): string {
  if (count === 0) return `${COUNT_BADGE} bg-zinc-700 text-zinc-300`;
  if (count >= 3) return `${COUNT_BADGE} bg-red-900/50 text-red-300`;
  return `${COUNT_BADGE} bg-yellow-900/50 text-yellow-300`;
}

function favorableCountClasses(count: number): string {
  if (count === 0) return `${COUNT_BADGE} bg-yellow-900/50 text-yellow-300`;
  if (count >= 3) return `${COUNT_BADGE} bg-blue-900/50 text-blue-300`;
  return `${COUNT_BADGE} bg-green-900/50 text-green-300`;
}

interface CoverageTableProps {
  title: string;
  pokemon: ImportedPokemonInfo[];
  rows: CoverageRow[];
  favorableWhenAbove1: boolean;
  unfavorableLabel: string;
  favorableLabel: string;
  spriteCacheState: UseSpriteCacheReturn;
  /** This table's own slice of TypeMatchupPage.tsx's `megaFormsByTable` - keyed by pokemon id, independent of the other coverage table and of the Team/Box card's own toggle. */
  activeForms: Record<string, string | null>;
  onToggleMegaForm: (pokemonId: string, slug: string) => void;
}

export default function CoverageTable({
  title,
  pokemon,
  rows,
  favorableWhenAbove1,
  unfavorableLabel,
  favorableLabel,
  spriteCacheState,
  activeForms,
  onToggleMegaForm,
}: CoverageTableProps) {
  return (
    <div className="bg-zinc-800 rounded-lg p-4 overflow-x-auto">
      <h2 className="text-sm font-bold text-zinc-100 mb-3">{title}</h2>
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr className="bg-zinc-900/60">
            <th className="w-20 border border-zinc-700/60" />
            {pokemon.map((p, i) => {
              const species = p.showdownData.species;
              const heldItem = p.showdownData.item;
              const activeForm = activeForms[p.id] ?? null;
              const splitOptions = resolveSplitFormOptions(species);
              const singleSlug = splitOptions ? null : getMegaApiSlug(heldItem, species);
              const heldSlug = splitOptions ? getMegaApiSlug(heldItem, species) : null;
              // The one slug (if any) genuinely in effect right now - same
              // "matches the real held stone" gate the badges below use, so
              // the sprite and the badge highlighting can never disagree.
              const activeMegaSlug =
                singleSlug && activeForm === singleSlug
                  ? singleSlug
                  : heldSlug && activeForm === heldSlug
                    ? heldSlug
                    : null;
              const megaSprite = activeMegaSlug ? getCachedMegaSprite(activeMegaSlug) : null;
              const rawSpriteUrl = megaSprite
                ? p.showdownData.shiny
                  ? megaSprite.shinySpriteUrl
                  : megaSprite.spriteUrl
                : getPixelSpriteUrl(
                    p.pokedexNumber,
                    species,
                    p.showdownData.gender || 'M',
                    p.showdownData.shiny,
                  );
              return (
                <th
                  key={i}
                  className="w-20 py-3 px-1 border border-zinc-700/60"
                  title={p.showdownData.nickname || species}
                >
                  <div className="relative inline-block mx-auto">
                    <img
                      src={spriteCacheState.resolveSprite(rawSpriteUrl)}
                      alt={species}
                      className="w-11 h-11 object-contain [image-rendering:pixelated]"
                    />
                    {singleSlug && (
                      <MegaFormToggleBadge
                        isActive={activeMegaSlug === singleSlug}
                        onToggle={() => onToggleMegaForm(p.id, singleSlug)}
                        resolveSprite={spriteCacheState.resolveSprite}
                      />
                    )}
                    {splitOptions && (
                      <div className="absolute -top-1.5 -right-1.5 z-10 flex gap-0.5">
                        {splitOptions.map((option) => {
                          const isActive = activeMegaSlug === option.slug;
                          return (
                            <button
                              key={option.slug}
                              type="button"
                              data-no-drag
                              onClick={() => onToggleMegaForm(p.id, option.slug)}
                              title={formatMegaLabel(species, option.suffix)}
                              className={`w-4 h-4 flex items-center justify-center rounded-full border text-[9px] font-bold transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-accent-gold border-accent-gold text-zinc-900'
                                  : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:border-accent-gold'
                              }`}
                            >
                              {megaFormBadgeLetter(option.suffix)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
            <th className="w-20 py-1.5 px-2 text-zinc-300 font-medium border border-zinc-700/60">
              {unfavorableLabel}
            </th>
            <th className="w-20 py-1.5 px-2 text-zinc-300 font-medium border border-zinc-700/60">
              {favorableLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.type} className={i % 2 === 1 ? 'bg-zinc-900/30' : undefined}>
              <td className="py-1.5 px-2 border border-zinc-700/60">
                <TypeBadge type={row.type} />
              </td>
              {row.cells.map((cell, j) => (
                <CoverageCell key={j} multiplier={cell} favorableWhenAbove1={favorableWhenAbove1} />
              ))}
              <td className="text-center py-1.5 border border-zinc-700/60">
                <span className={unfavorableCountClasses(row.unfavorableCount)}>
                  {row.unfavorableCount}
                </span>
              </td>
              <td className="text-center py-1.5 border border-zinc-700/60">
                <span className={favorableCountClasses(row.favorableCount)}>
                  {row.favorableCount}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
