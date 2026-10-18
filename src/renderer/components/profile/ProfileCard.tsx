/**
 * ProfileCard.tsx - Profile Content (Avatar, Favorite, Teams)
 * Pure presentational render of a fetched `PublicProfile`, extracted out of
 * PublicProfilePage.tsx so the standalone `/u/<username>` route and the
 * in-app profile page (ProfilePage.tsx) render identical content from one
 * place instead of two hand-synced copies.
 *
 * A `visibility: 'open'` team's Pokemon additionally carry the full
 * competitive set (Teamsheet Open/Closed Visibility Tiers, see TODO.md/
 * COMPLETED.md) - rendered as an expanded per-Pokemon block below the
 * sprite grid, same compact item/ability-nature/EVs/moves line layout
 * VgcPasteCatalogRow.tsx's own set preview already uses. A `'closed'` team
 * just shows the existing sprite-strip-only view.
 */

import type { PublicProfile, PublicTeam } from '../../services/syncApi';
import { formatEvs } from '../../utils/vgcPasteRowDisplay';

function OpenTeamSetPreview({ pokemon }: { pokemon: PublicTeam['pokemon'] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-zinc-700 pt-3 sm:grid-cols-2">
      {pokemon.map((p, idx) => (
        <div key={idx} className="text-xs">
          <p className="truncate font-semibold text-zinc-100">
            {p.nickname || p.species}
            {p.item ? ` @ ${p.item}` : ''}
          </p>
          <p className="truncate text-zinc-400">
            {[p.ability, p.nature && `${p.nature} Nature`].filter(Boolean).join(' · ') || ' '}
          </p>
          {p.evs && <p className="text-zinc-400">{formatEvs(p.evs)}</p>}
          <p className="truncate text-zinc-500">{p.moves?.join(' / ') || 'No moves'}</p>
        </div>
      ))}
    </div>
  );
}

export default function ProfileCard({ profile }: { profile: PublicProfile }) {
  return (
    <>
      <img src="/mascot.png" alt="" className="h-20 w-20" />
      <h1 className="mt-6 text-2xl font-bold">{profile.username}</h1>

      {profile.favoritePokemon && (
        <div className="mt-6 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Favorite Pokémon
          </span>
          <img
            src={profile.favoritePokemon.spriteUrl}
            alt={profile.favoritePokemon.species}
            className="h-20 w-20 object-contain [image-rendering:pixelated]"
          />
          <span className="text-sm text-zinc-300">{profile.favoritePokemon.species}</span>
        </div>
      )}

      {profile.teams.length > 0 && (
        <div className="mt-10 flex w-full max-w-xl flex-col gap-4">
          {profile.teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-100">{team.name || 'Untitled Team'}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  {team.format}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {team.pokemon.map((p, idx) => (
                  <div key={idx} className="flex flex-col items-center w-14">
                    <img
                      src={p.spriteUrl}
                      alt={p.species}
                      className="h-12 w-12 object-contain [image-rendering:pixelated]"
                    />
                    <span className="w-full truncate text-center text-[10px] text-zinc-400">
                      {p.nickname || p.species}
                    </span>
                  </div>
                ))}
              </div>
              {team.visibility === 'open' && <OpenTeamSetPreview pokemon={team.pokemon} />}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
