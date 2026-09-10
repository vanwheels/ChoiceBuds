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
 * Analysis's computeUsageThreats) is deliberately not the default here -
 * theoretical "still standing" information isn't the right default for
 * teambuilding, where a specific Pokemon needs to answer a specific
 * matchup's speed, not the team's overall weaknesses. A "Threats Only"
 * checkbox (Leg 9, see TODO.md) narrows whichever roster scope is already
 * selected down to species the selected team has no typing answer for at
 * all - reuses utils/usageThreats.ts's slotResistsThreat (the resist check
 * only, not computeUsageThreats itself, which carries its own hidden rank
 * cutoff that would shadow the Top 60/Top 120 scope above) rather than
 * replacing roster scope. A Live Calc pinned threat bypasses it too - same
 * precedent as it already bypassing the usage-rank cutoff below, since a pin
 * is a confirmed real opponent, not theoretical.
 *
 * Min Spread Usage (Leg 11, see TODO.md): a page-level stepper controlling
 * how much of a species' own real usage a ranked stat spread needs to get
 * its own plotted row - passed through to utils/speedTierList.ts's
 * buildSpeedTierEntries, which otherwise falls back to that file's
 * DEFAULT_SPREAD_USAGE_CUTOFF_PERCENT. Doesn't touch the 3 fixed bound rows
 * (min/neutral/max), which aren't usage data to begin with - same scope
 * split Leg 12's "Bounds Only" toggle (see TODO.md) is built around.
 *
 * Team Preview Strip (Leg 5, see docs/investigations/
 * speed-tiers-preview-strip-scope.md): a session-only per-mon Speed SP/
 * nature/form override, merged into computeTeamSpeed's input below via
 * utils/speedTierOverrides.ts - none of it writes back to the team. The
 * override Map lives here rather than a new hook (see TeamPreviewStrip.tsx's
 * header), keyed by ImportedPokemonInfo.id, which is a crypto.randomUUID()
 * unique across every team, so it's never cleared on a team switch.
 *
 * Live Calc -> Speed Tiers Tie-in (Leg 6, see TODO.md): `liveCalcThreatPinsState`
 * is App.tsx-level shared state (hooks/useLiveCalcThreatPins.ts) - a pin made
 * on the Live Calc tab surfaces here as an extra "Live" bound row on any
 * roster candidate whose species matches, computed via utils/speedTiers.ts::
 * computeInferredThreatSpeedBound and merged in by threatTierInputs below. A
 * pinned species bypasses the roster-scope usage-rank cutoff (top60/top120)
 * even if it has no usage data at all or ranks outside it - the user
 * explicitly pinned this exact opponent Pokémon, so it should always show.
 */
import { useMemo, useState } from 'react';
import { Generations, toID } from '@smogon/calc';
import type { NatureName } from '@smogon/calc/dist/data/interface';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { UseLiveCalcThreatPinsReturn } from '../../hooks/useLiveCalcThreatPins';
import type { ChampionsUsageEntry, ImportedPokemonInfo } from '../../types/pokemon';
import { validateSpeciesLegality, toRegulationId } from '../../utils/pokemonRules';
import { toReadableName } from '../../utils/displayName';
import { getFormeFamily } from '../../utils/calcFormes';
import { getMegaAbility } from '../../config/megaAbilities';
import { getCachedMegaSprite } from '../../hooks/useMegaSprite';
import { computeTeamSpeed, computeThreatSpeedProfile, computeInferredThreatSpeedBound, defaultSpeedFieldContext, type SpeedFieldContext } from '../../utils/speedTiers';
import { buildSpeedTierEntries, filterSpeedTierEntries, groupSpeedTiers, DEFAULT_SPREAD_USAGE_CUTOFF_PERCENT, type ThreatTierInput } from '../../utils/speedTierList';
import { applySpeedOverride, defaultSpeedOverride, type TeamSpeedOverride } from '../../utils/speedTierOverrides';
import { slotResistsThreat } from '../../utils/usageThreats';
import SpeedTierFieldPanel, { ToggleButton } from './SpeedTierFieldPanel';
import SpeedTierList from './SpeedTierList';
import TeamPreviewStrip from './TeamPreviewStrip';

const GEN_NUM = 9;

/**
 * Bounds for the Min Spread Usage stepper (Leg 11, see TODO.md) - the user's
 * own hand-picked range/step, not derived from a measured usage
 * distribution, same as the roster-scope cutoffs above.
 */
const SPREAD_USAGE_CUTOFF_STEP = 10;
const SPREAD_USAGE_CUTOFF_MIN = 5;
const SPREAD_USAGE_CUTOFF_MAX = 95;

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
  /** This candidate's own defending types, for the "Threats Only" filter
   * (Leg 9, see TODO.md). A Mega form gets its own - some change types on
   * Mega Evolution (e.g. Altaria Dragon/Flying -> Mega Altaria Dragon/Fairy) -
   * not its base species' types, so it's resolved separately per candidate
   * below rather than inherited from the base species push. */
  types: string[];
}

interface SpeedTiersPageProps {
  teamsState: UseTeamsReturn;
  gameDataState: UseGameDataReturn;
  databaseState: UseDatabaseReturn;
  spriteCacheState: UseSpriteCacheReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  liveCalcThreatPinsState: UseLiveCalcThreatPinsReturn;
}

export default function SpeedTiersPage({ teamsState, gameDataState, databaseState, spriteCacheState, speciesRosterState, liveCalcThreatPinsState }: SpeedTiersPageProps) {
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
  const [threatsOnly, setThreatsOnly] = useState(false);
  const [spreadUsageCutoff, setSpreadUsageCutoff] = useState(DEFAULT_SPREAD_USAGE_CUTOFF_PERCENT);

  const usageEntryBySpecies = useMemo(() => {
    const map = new Map<string, ChampionsUsageEntry>();
    if (gameDataCache) {
      for (const entry of Object.values(gameDataCache.usage)) map.set(entry.species.toLowerCase(), entry);
    }
    return map;
  }, [gameDataCache]);

  // Every species in the selected team's own regulation - see this file's
  // header. Not filtered by the team's defensive typing here - that's an
  // opt-in narrowing via the "Threats Only" checkbox below (Leg 9), not this
  // roster's own default shape.
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
    // @smogon/calc's own species dex resolves a regional sibling's baseSpecies
    // to the same root as its non-regional form (e.g. both "Raichu" and
    // "Raichu-Alola" resolve to root "Raichu" - see calcFormes.ts's header),
    // so getFormeFamily returns that root's same megaFormes list for every
    // sibling. legalRoster lists each regional variant as its own legal
    // entry, so without this guard the loop below would push a root's Mega
    // forme(s) once per sibling present in the roster (confirmed live via
    // React's duplicate-key warning on Raichu-Mega-X/-Y and Slowbro-Mega -
    // see TODO.md's "Speed Tiers Duplicate Mega Roster Candidates" entry).
    const addedMegaFormes = new Set<string>();
    for (const rosterEntry of legalRoster) {
      const dbEntry = getCachedEntry(rosterEntry.name);
      if (!dbEntry) continue;
      const usage = usageEntryBySpecies.get(rosterEntry.name.toLowerCase()) ?? null;
      // Real observed top-ranked ability when usage data exists, otherwise
      // this species' own default ability (dbEntry.abilities is a lowercase
      // PokeAPI slug list - see gameData.ts's PokeAPICacheEntry - so it needs
      // the same slug->display conversion as PokemonCard/AbilityPickerPanel).
      const ability = usage?.abilities[0]?.name || (dbEntry.abilities[0] ? toReadableName(dbEntry.abilities[0]) : '');
      candidates.push({ species: rosterEntry.name, ability, usage, spriteUrl: dbEntry.spriteUrl, types: dbEntry.types });

      for (const megaName of getFormeFamily(allSpecies, rosterEntry.name).megaFormes) {
        if (addedMegaFormes.has(megaName)) continue;
        addedMegaFormes.add(megaName);
        const megaSprite = getCachedMegaSprite(megaName.toLowerCase());
        // @smogon/calc's own species dex, not the PokeAPI cache (which has no
        // entry for Mega forms - see useMegaSprite.ts's header) - the only
        // source in this codebase for a Mega form's own types. Some Mega
        // forms change types on evolution (see this file's RosterCandidate
        // doc comment), so this can't just inherit the base species' types.
        const megaTypes = gen.species.get(toID(megaName))?.types;
        candidates.push({
          species: megaName,
          ability: getMegaAbility(megaName.toLowerCase()) ?? ability,
          usage: null,
          spriteUrl: megaSprite?.spriteUrl ?? dbEntry.spriteUrl,
          types: megaTypes ? [...megaTypes] : dbEntry.types,
        });
      }
    }
    return candidates;
  }, [legalRoster, usageEntryBySpecies, getCachedEntry, allSpecies, gen]);

  const { pins: liveCalcPins } = liveCalcThreatPinsState;

  // "Threats Only" checkbox's own defending slots - same construction
  // TypeMatchupPage.tsx already builds for its own usage-threat check.
  const defensiveSlots = useMemo(
    () => (selectedTeam?.pokemon ?? []).map(p => ({ types: p.types, ability: p.showdownData.ability })),
    [selectedTeam]
  );

  const threatTierInputs = useMemo<ThreatTierInput[]>(() => {
    const cutoff = rosterScope === 'top60' ? 60 : rosterScope === 'top120' ? 120 : null;
    return rosterCandidates.flatMap((candidate): ThreatTierInput[] => {
      const pin = liveCalcPins.get(candidate.species.toLowerCase());
      // A pinned species bypasses the usage-rank cutoff - see this file's header.
      if (cutoff !== null && !pin && (!candidate.usage || candidate.usage.columnPosition > cutoff)) return [];
      // "Threats Only": drop any candidate at least one team slot already
      // resists/is immune to - see this file's header. Same pin bypass as
      // the cutoff check above, for the same reason.
      if (threatsOnly && !pin && defensiveSlots.some(d => slotResistsThreat(candidate.types, d))) return [];
      const profile = computeThreatSpeedProfile(gen, { species: candidate.species, ability: candidate.ability, usage: candidate.usage }, field);
      if (!profile) return [];
      const inferredBound = pin
        ? computeInferredThreatSpeedBound(
            gen,
            { species: candidate.species, ability: candidate.ability, level: pin.level, spMin: pin.speedSpBound.min, spMax: pin.speedSpBound.max, natureCandidates: pin.natureCandidates },
            field
          ) ?? undefined
        : undefined;
      return [{ spriteUrl: candidate.spriteUrl, profile, inferredBound, types: candidate.types }];
    });
  }, [rosterCandidates, gen, field, rosterScope, liveCalcPins, threatsOnly, defensiveSlots]);

  const tierGroups = useMemo(() => {
    const entries = filterSpeedTierEntries(buildSpeedTierEntries(teamSpeedEntries, threatTierInputs, spreadUsageCutoff), speciesFilter);
    return groupSpeedTiers(entries, trickRoom);
  }, [teamSpeedEntries, threatTierInputs, trickRoom, speciesFilter, spreadUsageCutoff]);

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
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer pb-1.5">
              <input
                type="checkbox"
                checked={threatsOnly}
                onChange={e => setThreatsOnly(e.target.checked)}
                className="cursor-pointer accent-accent-gold"
              />
              Threats Only
            </label>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Min Spread Usage</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSpreadUsageCutoff(v => Math.max(SPREAD_USAGE_CUTOFF_MIN, v - SPREAD_USAGE_CUTOFF_STEP))}
                  disabled={spreadUsageCutoff <= SPREAD_USAGE_CUTOFF_MIN}
                  className="w-7 h-7 flex items-center justify-center text-sm font-bold bg-zinc-800 border border-zinc-600 rounded text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  −
                </button>
                <span className="min-w-[3.5ch] text-center text-sm text-zinc-200">{spreadUsageCutoff}%</span>
                <button
                  type="button"
                  onClick={() => setSpreadUsageCutoff(v => Math.min(SPREAD_USAGE_CUTOFF_MAX, v + SPREAD_USAGE_CUTOFF_STEP))}
                  disabled={spreadUsageCutoff >= SPREAD_USAGE_CUTOFF_MAX}
                  className="w-7 h-7 flex items-center justify-center text-sm font-bold bg-zinc-800 border border-zinc-600 rounded text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  +
                </button>
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
