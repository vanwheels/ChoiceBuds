/**
 * SpeedTiersPage.tsx - Speed Tiers (Speed Calc-like Feature - see TODO.md /
 * docs/investigations/speed-calc-scope.md)
 * Own top-level tab (nav-placement question resolved 2026-09-09). Pick a
 * saved team, see its members' real field-modified Speed plotted against
 * every regulation-legal species (Champions-native usage data folds in only
 * as an optional ranking/filter, not the defining data source - see
 * docs/investigations/speed-tiers-full-roster-pivot.md, which reverses
 * speed-calc-scope.md's original "team-anchored threat list" call). All
 * Speed math lives in utils/speedTiers.ts; this page's own
 * utils/speedTierList.ts merges/sorts/ties/filters that output into
 * SpeedTierList.tsx's continuous, densely-packed icon grid (row list → icon
 * grid rework: docs/investigations/speed-tiers-layout-rework.md; that grid
 * reworked again into one continuous flow rather than a block per speed
 * value: docs/investigations/speed-tiers-full-roster-pivot.md). Live Calc →
 * Speed Tiers tie-in (an inferred SP-Speed range overriding a threat's
 * generic entry) is a later leg, not built here.
 *
 * Roster scope: every species in the selected team's own regulation
 * (validateSpeciesLegality against toRegulationId(selectedTeam.format)) is
 * plotted by default, plus one extra candidate per Champions-legal Mega form
 * each species has (see rosterCandidates below - Mega Evolution changes base
 * stats/ability, so it needs its own Speed number). A page-level toggle
 * narrows the base-species set to the top 60/120 by Champions ranked-ladder
 * usage (ChampionsUsageEntry.columnPosition) - a species (or Mega form, which
 * never has its own usage entry - see rosterCandidates) with no usage data
 * at all only shows under "All". Typing-based threat filtering (Team Gap
 * Analysis's computeUsageThreats) is deliberately not used here anymore -
 * theoretical "still standing" information isn't the right default for
 * teambuilding, where a specific Pokemon needs to answer a specific
 * matchup's speed, not the team's overall weaknesses. A "threats only" mode
 * is a possible future toggle, not built here (see TODO.md).
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
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { ChampionsUsageEntry, ImportedPokemonInfo } from '../../types/pokemon';
import { validateSpeciesLegality, toRegulationId } from '../../utils/pokemonRules';
import { toReadableName } from '../../utils/displayName';
import { getFormeFamily } from '../../utils/calcFormes';
import { getMegaAbility } from '../../config/megaAbilities';
import { getCachedMegaSprite } from '../../hooks/useMegaSprite';
import { computeTeamSpeed, computeThreatSpeedProfile, defaultSpeedFieldContext, type SpeedFieldContext } from '../../utils/speedTiers';
import { buildSpeedTierEntries, filterSpeedTierEntries, groupSpeedTiers, type ThreatTierInput } from '../../utils/speedTierList';
import { applySpeedOverride, defaultSpeedOverride, type TeamSpeedOverride } from '../../utils/speedTierOverrides';
import SpeedTierFieldPanel, { ToggleButton } from './SpeedTierFieldPanel';
import SpeedTierList from './SpeedTierList';
import TeamPreviewStrip from './TeamPreviewStrip';

const GEN_NUM = 9;

/** Roster-scope toggle options - see this file's header. Cutoffs are the user's own hand-picked values, not derived from a measured usage distribution. */
type RosterScope = 'all' | 'top60' | 'top120';
const ROSTER_SCOPE_OPTIONS: { value: RosterScope; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'top60', label: 'Top 60' },
  { value: 'top120', label: 'Top 120' },
];

/**
 * One candidate species (or Mega form) to compute a speed profile for - see
 * the rosterCandidates memo below for how the list is built. `usage` is
 * always null for a Mega candidate (Mega access is item-driven, not a
 * roster/usage entry of its own - see pokemonRules.ts's header), so it only
 * ever surfaces under the "All" roster scope, same rule as any other
 * usage-less species.
 */
interface RosterCandidate {
  species: string;
  ability: string;
  usage: ChampionsUsageEntry | null;
  spriteUrl: string;
}

interface SpeedTiersPageProps {
  teamsState: UseTeamsReturn;
  gameDataState: UseGameDataReturn;
  databaseState: UseDatabaseReturn;
  spriteCacheState: UseSpriteCacheReturn;
  speciesRosterState: UseSpeciesRosterReturn;
}

export default function SpeedTiersPage({ teamsState, gameDataState, databaseState, spriteCacheState, speciesRosterState }: SpeedTiersPageProps) {
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

  const [rosterScope, setRosterScope] = useState<RosterScope>('all');

  const usageEntryBySpecies = useMemo(() => {
    const map = new Map<string, ChampionsUsageEntry>();
    if (gameDataCache) {
      for (const entry of Object.values(gameDataCache.usage)) map.set(entry.species.toLowerCase(), entry);
    }
    return map;
  }, [gameDataCache]);

  // Every species in the selected team's own regulation - see this file's
  // header. Not filtered by the team's defensive typing (that's Team Gap
  // Analysis's own, deliberately different, concern).
  const legalRoster = useMemo(() => {
    if (!selectedTeam) return [];
    const rulesetId = toRegulationId(selectedTeam.format);
    return speciesRosterState.roster.filter(entry => validateSpeciesLegality(entry.name, rulesetId));
  }, [selectedTeam, speciesRosterState.roster]);

  const teamSpeedEntries = useMemo(
    () => (selectedTeam?.pokemon ?? []).flatMap(p => {
      const entry = computeTeamSpeed(gen, applySpeedOverride(p, speedOverrides.get(p.id)), field);
      return entry ? [entry] : [];
    }),
    [selectedTeam, gen, field, speedOverrides]
  );

  // One candidate per legal roster species, plus one more per Champions-legal
  // Mega form it has (getFormeFamily's own CURATED_MEGA_FORM_SLUGS gate,
  // same one calcFormes.ts's Calc-tab toggle already trusts) - Mega
  // Evolution changes base stats and forces a fixed ability (see
  // speedTierOverrides.ts's header), both of which matter for Speed, so it
  // needs its own row rather than folding into the base species' number.
  const rosterCandidates = useMemo<RosterCandidate[]>(() => {
    const candidates: RosterCandidate[] = [];
    for (const rosterEntry of legalRoster) {
      const dbEntry = getCachedEntry(rosterEntry.name);
      if (!dbEntry) continue;
      const usage = usageEntryBySpecies.get(rosterEntry.name.toLowerCase()) ?? null;
      // Real observed top-ranked ability when usage data exists, otherwise
      // this species' own default ability (dbEntry.abilities is a lowercase
      // PokeAPI slug list - see gameData.ts's PokeAPICacheEntry - so it needs
      // the same slug->display conversion as PokemonCard/AbilityPickerPanel).
      const ability = usage?.abilities[0]?.name || (dbEntry.abilities[0] ? toReadableName(dbEntry.abilities[0]) : '');
      candidates.push({ species: rosterEntry.name, ability, usage, spriteUrl: dbEntry.spriteUrl });

      for (const megaName of getFormeFamily(allSpecies, rosterEntry.name).megaFormes) {
        const megaSprite = getCachedMegaSprite(megaName.toLowerCase());
        candidates.push({
          species: megaName,
          ability: getMegaAbility(megaName.toLowerCase()) ?? ability,
          usage: null,
          spriteUrl: megaSprite?.spriteUrl ?? dbEntry.spriteUrl,
        });
      }
    }
    return candidates;
  }, [legalRoster, usageEntryBySpecies, getCachedEntry, allSpecies]);

  const threatTierInputs = useMemo<ThreatTierInput[]>(() => {
    const cutoff = rosterScope === 'top60' ? 60 : rosterScope === 'top120' ? 120 : null;
    return rosterCandidates.flatMap((candidate): ThreatTierInput[] => {
      if (cutoff !== null && (!candidate.usage || candidate.usage.columnPosition > cutoff)) return [];
      const profile = computeThreatSpeedProfile(gen, { species: candidate.species, ability: candidate.ability, usage: candidate.usage }, field);
      return profile ? [{ spriteUrl: candidate.spriteUrl, profile }] : [];
    });
  }, [rosterCandidates, gen, field, rosterScope]);

  const tierGroups = useMemo(() => {
    const entries = filterSpeedTierEntries(buildSpeedTierEntries(teamSpeedEntries, threatTierInputs), speciesFilter);
    return groupSpeedTiers(entries, trickRoom);
  }, [teamSpeedEntries, threatTierInputs, trickRoom, speciesFilter]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Speed Tiers</h1>
        <p className="text-sm text-zinc-400 mt-1">
          See a team's real, field-modified Speed against every Pokemon legal in its regulation - not just theoretical
          threats, since a specific team member often needs to hit a specific matchup's speed, not just the team's
          overall weak points.
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
          <div className="flex flex-wrap items-end gap-3">
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
            <div className="flex flex-col gap-1.5 min-w-[220px]">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Roster (by ladder usage)</label>
              <div className="flex gap-1">
                {ROSTER_SCOPE_OPTIONS.map(option => (
                  <ToggleButton key={option.value} active={rosterScope === option.value} onClick={() => setRosterScope(option.value)}>
                    {option.label}
                  </ToggleButton>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <SpeedTierList groups={tierGroups} spriteCacheState={spriteCacheState} />
          </div>
        </>
      )}
    </div>
  );
}
