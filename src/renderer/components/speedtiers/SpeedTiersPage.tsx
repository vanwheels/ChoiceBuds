/**
 * SpeedTiersPage.tsx - Speed Tiers (Speed Calc-like Feature - see TODO.md /
 * docs/investigations/speed-calc-scope.md)
 * Own top-level tab (nav-placement question resolved 2026-09-09). Pick a
 * saved team, see its members' real field-modified Speed plotted against
 * Team Gap Analysis's own ranked usage-threat list
 * (utils/usageThreats.ts::computeUsageThreats) - Champions-native usage data
 * (ChampionsUsageEntry.statSpreads), not a Showdown-ladder reskin. All Speed
 * math lives in utils/speedTiers.ts; this page's own utils/speedTierList.ts
 * merges/sorts/ties/filters that output into the rendered icon grid (row
 * list → icon grid rework: see docs/investigations/
 * speed-tiers-layout-rework.md). Live Calc → Speed Tiers tie-in (an inferred
 * SP-Speed range overriding a threat's generic entry) is a later leg, not
 * built here.
 *
 * Team-anchored on purpose (same reasoning as TypeMatchupPage's Team Gap
 * Analysis panel): the threat set is derived from the selected team's own
 * defensive typing via computeUsageThreats, not a free-text opponent picker.
 *
 * Team Preview Strip (Leg 5, see docs/investigations/
 * speed-tiers-preview-strip-scope.md): a session-only per-mon Speed SP/
 * nature/form override, merged into computeTeamSpeed's input below via
 * utils/speedTierOverrides.ts - none of it writes back to the team. The
 * override Map lives here rather than a new hook (see TeamPreviewStrip.tsx's
 * header), keyed by ImportedPokemonInfo.id, which is a crypto.randomUUID()
 * unique across every team, so it's never cleared on a team switch.
 */
import { useMemo, useState } from 'react';
import { Generations } from '@smogon/calc';
import type { NatureName } from '@smogon/calc/dist/data/interface';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { ChampionsUsageEntry, ImportedPokemonInfo } from '../../types/pokemon';
import { computeUsageThreats, type UsageThreat } from '../../utils/usageThreats';
import { computeTeamSpeed, computeThreatSpeedProfile, defaultSpeedFieldContext, type SpeedFieldContext } from '../../utils/speedTiers';
import { buildSpeedTierEntries, filterSpeedTierEntries, groupSpeedTiers, type ThreatTierInput } from '../../utils/speedTierList';
import { applySpeedOverride, defaultSpeedOverride, type TeamSpeedOverride } from '../../utils/speedTierOverrides';
import SpeedTierFieldPanel from './SpeedTierFieldPanel';
import SpeedTierList from './SpeedTierList';
import TeamPreviewStrip from './TeamPreviewStrip';

const GEN_NUM = 9;

interface SpeedTiersPageProps {
  teamsState: UseTeamsReturn;
  gameDataState: UseGameDataReturn;
  databaseState: UseDatabaseReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function SpeedTiersPage({ teamsState, gameDataState, databaseState, spriteCacheState }: SpeedTiersPageProps) {
  const { teams } = teamsState;
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const [field, setField] = useState<SpeedFieldContext>(defaultSpeedFieldContext());
  const [trickRoom, setTrickRoom] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [speedOverrides, setSpeedOverrides] = useState<Map<string, TeamSpeedOverride>>(new Map());
  const gen = useMemo(() => Generations.get(GEN_NUM), []);
  // Same construction useDamageCalc.ts/useLiveCalc.ts use for their own
  // Calc-tab forme toggles - see TeamPreviewCard.tsx's Mega/stat-forme rows.
  const allSpecies = useMemo(() => [...gen.species].map(s => ({ name: s.name, baseSpecies: s.baseSpecies })), [gen]);
  const natureOptions = useMemo(() => [...gen.natures].map(n => n.name).sort() as NatureName[], [gen]);

  const { cache: gameDataCache } = gameDataState;
  const { getCachedEntry } = databaseState;

  const updateSpeedOverride = (pokemon: ImportedPokemonInfo, updates: Partial<TeamSpeedOverride>) => {
    setSpeedOverrides(prev => {
      const next = new Map(prev);
      const current = prev.get(pokemon.id) ?? defaultSpeedOverride(pokemon);
      next.set(pokemon.id, { ...current, ...updates });
      return next;
    });
  };

  const defensiveSlots = useMemo(
    () => (selectedTeam?.pokemon ?? []).map(p => ({ types: p.types, ability: p.showdownData.ability })),
    [selectedTeam]
  );

  // Same construction TypeMatchupPage uses for its own usageCandidates -
  // duplicated rather than shared, since the two pages' usage differs enough
  // (this one also needs the full ChampionsUsageEntry per threat, below)
  // that factoring it out isn't a clean win for this leg.
  const usageCandidates = useMemo<UsageThreat[]>(() => {
    if (!gameDataCache) return [];
    return Object.values(gameDataCache.usage)
      .map((entry): UsageThreat | null => {
        const dbEntry = getCachedEntry(entry.species);
        if (!dbEntry) return null;
        return {
          species: entry.species,
          types: dbEntry.types,
          columnPosition: entry.columnPosition,
          spriteUrl: dbEntry.spriteUrl,
          speed: dbEntry.baseStats.speed,
        };
      })
      .filter((c): c is UsageThreat => c !== null);
  }, [gameDataCache, getCachedEntry]);

  const usageThreats = useMemo(() => computeUsageThreats(defensiveSlots, usageCandidates), [defensiveSlots, usageCandidates]);

  const usageEntryBySpecies = useMemo(() => {
    const map = new Map<string, ChampionsUsageEntry>();
    if (gameDataCache) {
      for (const entry of Object.values(gameDataCache.usage)) map.set(entry.species.toLowerCase(), entry);
    }
    return map;
  }, [gameDataCache]);

  const teamSpeedEntries = useMemo(
    () => (selectedTeam?.pokemon ?? []).flatMap(p => {
      const entry = computeTeamSpeed(gen, applySpeedOverride(p, speedOverrides.get(p.id)), field);
      return entry ? [entry] : [];
    }),
    [selectedTeam, gen, field, speedOverrides]
  );

  const threatTierInputs = useMemo<ThreatTierInput[]>(
    () => usageThreats.flatMap((threat): ThreatTierInput[] => {
      const usageEntry = usageEntryBySpecies.get(threat.species.toLowerCase());
      if (!usageEntry) return [];
      const profile = computeThreatSpeedProfile(gen, usageEntry, field);
      return profile ? [{ spriteUrl: threat.spriteUrl, profile }] : [];
    }),
    [usageThreats, usageEntryBySpecies, gen, field]
  );

  const tierGroups = useMemo(() => {
    const entries = filterSpeedTierEntries(buildSpeedTierEntries(teamSpeedEntries, threatTierInputs), speciesFilter);
    return groupSpeedTiers(entries, trickRoom);
  }, [teamSpeedEntries, threatTierInputs, trickRoom, speciesFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Speed Tiers</h1>
        <p className="text-sm text-zinc-400 mt-1">
          See a team's real, field-modified Speed against the same ranked usage threats Team Gap Analysis checks
          typing for.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Team</label>
        <select
          value={selectedTeamId}
          onChange={e => setSelectedTeamId(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
        >
          <option value="">Select a team...</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedTeam ? (
        <p className="text-sm text-zinc-400">
          {teams.length === 0 ? 'Import or create a team first to see its speed tiers.' : 'Pick a team above to see its speed tiers.'}
        </p>
      ) : (
        <>
          <TeamPreviewStrip
            pokemon={selectedTeam.pokemon}
            allSpecies={allSpecies}
            natureOptions={natureOptions}
            overrides={speedOverrides}
            onChangeOverride={updateSpeedOverride}
            spriteCacheState={spriteCacheState}
          />
          <SpeedTierFieldPanel field={field} onChangeField={updates => setField(prev => ({ ...prev, ...updates }))} trickRoom={trickRoom} onChangeTrickRoom={setTrickRoom} />
          <div className="flex flex-col gap-1.5 max-w-xs">
            <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Filter by species</label>
            <input
              type="text"
              value={speciesFilter}
              onChange={e => setSpeciesFilter(e.target.value)}
              placeholder="Pokémon name..."
              className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold placeholder:text-zinc-500"
            />
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <SpeedTierList groups={tierGroups} spriteCacheState={spriteCacheState} />
          </div>
        </>
      )}
    </div>
  );
}
