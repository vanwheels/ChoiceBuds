/**
 * LiveCalcDefenderPanel.tsx - Opponent's Known Inputs + Inferred Result
 * Unlike CalcPokemonPanel's fully-known set (reused as-is for the Live Calc
 * attacker - see LiveCalcPage.tsx), the opponent is species plus whatever's
 * actually been confirmed in-battle - a forme-family toggle (for stat-block
 * and Mega formes, same `FormeToggle`/`FormeFamily` CalcPokemonPanel uses)
 * and its read-only base stats. Level has no visible field here either (Live
 * Calc Player/Opponent Card Redesign, same call as CalcPokemonPanel's own
 * header - VGC is always Lv50); `level` is still a prop (used by
 * `handlePin` and every calc this panel's data feeds), just not user-edited
 * from this panel.
 *
 * All five combat stats (Live Calc Page Layout & Function Rework - Leg 1/2)
 * carry an editable stage-boost input (-6..+6) now, not just Def/Sp. Def -
 * once the opponent's own offense is modeled (`inferOpponentOffensiveStats()`
 * narrows their Atk/SpA from "their move -> you" observations), a seen
 * Swords Dance/Dragon Dance/etc. needs to feed the boosts object on BOTH
 * damage directions, not just the outgoing one. The `speBoost` field here is
 * a static "current known stage" snapshot fed into every calc going forward,
 * distinct from `LiveCalcTurnOrderList`'s `defenderSpeedStage` - that one is
 * a per-observation stage (what the opponent's Speed stage WAS at the moment
 * of that specific turn-order read, since it can change turn to turn), used
 * only by the Speed-narrowing pass itself. They don't conflict: this panel's
 * `speBoost` answers "what's their Speed stage right now," the turn-order
 * list answers "what was it back when I saw this particular turn."
 *
 * Ability/Item/Nature all follow the same Known-Fact Lock shape (Live Calc
 * Known-Ability Lock, generalized in Leg 1): each select's default ("Unknown")
 * keeps the engine's full-pool scan; picking a real value hard-locks that
 * axis once it's been confirmed in-battle (an Intimidate trigger, a Life Orb
 * recoil message, a crit that only makes sense off a certain nature, etc.).
 * Known Item deliberately offers the FULL item list (`itemOptions`, same pool
 * CalcPokemonPanel's own item field uses) rather than
 * `config/liveCalcDefensiveItems.ts`'s narrower defensive-berry subset - that
 * curated list is only the engine's default SCAN pool (items that change
 * incoming damage), but a hard lock can name literally anything revealed in
 * battle, offensive items included (Choice Specs, Life Orb) now that the
 * opponent's own attacks are modeled too.
 *
 * Status (Live Calc Player/Opponent Card Redesign) is NOT a Known-Fact Lock
 * like Item/Ability/Nature above - it doesn't narrow a scanned axis, it's a
 * directly-known fact wired straight into every calc, same shape as the
 * Boost inputs. Named `status`/`onChangeStatus` (not `knownStatus`) to match
 * that Boost-field naming rather than the three Lock fields' `known*` naming.
 * See `liveCalcEngine.ts`'s `LiveCalcDefenderInput.status` for the real
 * damage/speed effects this unlocks via `@smogon/calc`'s own mechanics
 * (burn halving physical damage dealt, paralysis halving Speed, Hex/Facade's
 * own status checks, etc.).
 *
 * Fields are grouped/ordered (species+Mega toggle, stat-forme toggle,
 * Item+Ability, Nature+Status, stat table) to match CalcPokemonPanel's own
 * field order - Live Calc Feedback Pass 2's ask that the Attacker and
 * Opponent panels visually mirror each other, extended by the Card Redesign
 * leg to also move the Mega toggle beside species the same way
 * CalcPokemonPanel's now does. The header row follows the same "title left,
 * actions right" shape too, though the action itself (Pin to Speed Tiers) is
 * necessarily different since there's no known-set to copy/save for a
 * partially-known opponent.
 *
 * The stat table itself (`LiveCalcDefenderStatRows`) is the unified
 * Base/SP/Boost/Total shape `CalcStatRows.tsx` already gives the Attacker
 * panel, with SP/Total as ranges instead of single values - see that
 * component's own header. The "Inferred Defender" result underneath it -
 * narrowed Def/Sp. Def/Atk/Sp. Atk/Speed Stat Point ranges (as detailed
 * progress bars, not just the stat table's compact numbers) plus
 * nature/ability/item candidates - lives at the bottom of this same panel
 * rather than as its own section further down the page (Live Calc Feedback
 * Pass 2, Leg 3): it's the live readout of exactly the fields above it, so
 * keeping it in the same panel reads as one continuous "what do we know
 * about the opponent" unit instead of two disconnected ones. `StatBoundBar`
 * (moved here from the now-removed LiveCalcResultPanel) renders the SP range
 * bars against a fixed 0-32 scale - grown from 3 (Def/SpD/Speed) to all 5
 * combat stats once `inferOpponentOffensiveStats()` started narrowing
 * Atk/SpA too (Live Calc Player/Opponent Card Redesign: those two bounds
 * already existed on `LiveCalcInference`, just weren't rendered anywhere
 * until now - no engine work needed for this). `LiveCalcCandidateGroup`
 * (still its own file, shared shape) renders the three candidate-narrowing
 * fractions. This panel only presents whatever `LiveCalcInference` (and
 * `computeDefenderTotalRanges()`'s derived Total ranges) it's given - no
 * inference logic lives here, see utils/liveCalcEngine.ts.
 */

import type { StatsTable, NatureName, StatusName, Generation } from '@smogon/calc/dist/data/interface';
import type { FormeFamily } from '../../utils/calcFormes';
import type { LiveCalcInference, LiveCalcStatBound, LiveCalcTotalRange } from '../../utils/liveCalcEngine';
import { defaultInference } from '../../utils/liveCalcEngine';
import { STATUS_OPTIONS, STATUS_LABELS } from '../../utils/damageCalcEngine';
import type { UseLiveCalcThreatPinsReturn } from '../../hooks/useLiveCalcThreatPins';
import CalcAutocomplete from '../calc/CalcAutocomplete';
import FormeToggle from '../calc/FormeToggle';
import LiveCalcCandidateGroup from './LiveCalcCandidateGroup';
import LiveCalcDefenderStatRows from './LiveCalcDefenderStatRows';

const SP_RANGE_TOTAL = 32;

function StatBoundBar({ label, bound, observationCount }: { label: string; bound: LiveCalcStatBound; observationCount: number }) {
  const startPercent = (bound.min / SP_RANGE_TOTAL) * 100;
  const widthPercent = ((bound.max - bound.min) / SP_RANGE_TOTAL) * 100;
  const rangeText = bound.min === bound.max ? `${bound.min} SP` : `${bound.min}-${bound.max} SP`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300 font-semibold">{label}</span>
        <span className="text-zinc-500">
          {rangeText} · {observationCount} {observationCount === 1 ? 'observation' : 'observations'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden relative">
        <div
          className="h-full bg-accent-gold absolute top-0"
          style={{ left: `${startPercent}%`, width: `${Math.max(widthPercent, 100 / SP_RANGE_TOTAL)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-zinc-600">
        <span>0</span>
        <span>32</span>
      </div>
    </div>
  );
}

interface LiveCalcDefenderPanelProps {
  gen: Generation;
  species: string;
  level: number;
  speciesOptions: string[];
  formes: FormeFamily;
  baseStats: StatsTable | null;
  atkBoost: number;
  defBoost: number;
  spaBoost: number;
  spdBoost: number;
  speBoost: number;
  /** The defender species' own real ability pool - options for the Known
   * Ability select below. Empty until a species is picked. */
  abilityOptions: string[];
  /** Full item/nature pools, same lists CalcPokemonPanel's attacker fields
   * use - see this file's header for why Known Item isn't restricted to the
   * engine's narrower defensive-item scan pool. */
  itemOptions: string[];
  natureOptions: NatureName[];
  /** Empty string means still unknown (the engine's default full-pool scan);
   * a real value hard-locks that axis to it. */
  knownAbility: string;
  knownItem: string;
  knownNature: NatureName | '';
  /** Directly-known status, not a locked scan axis - see this file's header. */
  status: StatusName | '';
  onChangeSpecies: (species: string) => void;
  onChangeAtkBoost: (stage: number) => void;
  onChangeDefBoost: (stage: number) => void;
  onChangeSpaBoost: (stage: number) => void;
  onChangeSpdBoost: (stage: number) => void;
  onChangeSpeBoost: (stage: number) => void;
  onChangeKnownAbility: (ability: string) => void;
  onChangeKnownItem: (item: string) => void;
  onChangeKnownNature: (nature: NatureName | '') => void;
  onChangeStatus: (status: StatusName | '') => void;
  /** The live narrowed result for this species, presented at the bottom of
   * this panel - see this file's header. */
  inference: LiveCalcInference;
  /** The stat table's own Total column, derived from `inference` plus the
   * boosts/known-nature above - see `liveCalcEngine.ts::computeDefenderTotalRanges()`. */
  totalRanges: Record<keyof StatsTable, LiveCalcTotalRange> | null;
  liveCalcThreatPinsState: UseLiveCalcThreatPinsReturn;
}

export default function LiveCalcDefenderPanel({
  gen, species, level, speciesOptions, formes, baseStats,
  atkBoost, defBoost, spaBoost, spdBoost, speBoost,
  abilityOptions, itemOptions, natureOptions, knownAbility, knownItem, knownNature, status,
  onChangeSpecies, onChangeAtkBoost, onChangeDefBoost, onChangeSpaBoost, onChangeSpdBoost, onChangeSpeBoost,
  onChangeKnownAbility, onChangeKnownItem, onChangeKnownNature, onChangeStatus,
  inference, totalRanges, liveCalcThreatPinsState,
}: LiveCalcDefenderPanelProps) {
  const megaGroup = formes.megaFormes.length > 0 ? [formes.root, ...formes.megaFormes] : [];
  const baseline = defaultInference(gen, species);
  // Live Calc Feedback Pass 2 - Leg 5: the Ability group's own "N of TOTAL"
  // denominator uses the already-correct `abilityOptions` prop (sourced from
  // useLiveCalc.ts's real PokeAPI-backed pipeline) instead of `baseline`
  // above, which - lacking access to that pipeline itself - would otherwise
  // still seed abilityCandidates from @smogon/calc's own bundled species
  // data here, undercounting a species like Farigiraf whose bundled entry
  // is missing a real ability (Armor Tail). Nature/item totals below are
  // unaffected by that bug (neither axis is species-ability-pool-derived),
  // so `baseline` still covers those two as-is.
  const totalObservations =
    inference.physicalObservationCount + inference.specialObservationCount + inference.speedObservationCount +
    inference.theirPhysicalObservationCount + inference.theirSpecialObservationCount;

  const { pins, pinThreat, unpinThreat } = liveCalcThreatPinsState;
  const isPinned = !!species && pins.has(species.toLowerCase());
  const handlePin = () => {
    pinThreat({
      species,
      level,
      speedSpBound: inference.speedBound,
      natureCandidates: inference.natureCandidates,
      observationCount: inference.speedObservationCount,
    });
  };

  const boostForKey = (key: keyof StatsTable): { value: number; onChange: (stage: number) => void } | undefined => {
    if (key === 'atk') return { value: atkBoost, onChange: onChangeAtkBoost };
    if (key === 'def') return { value: defBoost, onChange: onChangeDefBoost };
    if (key === 'spa') return { value: spaBoost, onChange: onChangeSpaBoost };
    if (key === 'spd') return { value: spdBoost, onChange: onChangeSpdBoost };
    if (key === 'spe') return { value: speBoost, onChange: onChangeSpeBoost };
    return undefined;
  };

  const spBounds: Record<keyof StatsTable, LiveCalcStatBound> = {
    hp: { min: 0, max: 32 },
    atk: inference.atkBound,
    def: inference.defBound,
    spa: inference.spaBound,
    spd: inference.spdBound,
    spe: inference.speedBound,
  };
  const statRowBoosts: Partial<Record<keyof StatsTable, { value: number; onChange: (stage: number) => void }>> = {
    atk: boostForKey('atk'), def: boostForKey('def'), spa: boostForKey('spa'), spd: boostForKey('spd'), spe: boostForKey('spe'),
  };

  return (
    <div className="flex-1 min-w-[280px] bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Opponent</h3>
        {species && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handlePin}
              title="Snapshot the narrowed Speed SP range and surviving nature candidates below onto the Speed Tiers tab"
              className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 border border-accent-gold/40"
            >
              {isPinned ? 'Update Pin' : 'Pin to Speed Tiers'}
            </button>
            {isPinned && (
              <button
                type="button"
                onClick={() => unpinThreat(species)}
                title="Remove this species' pin from the Speed Tiers tab"
                className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded transition-colors cursor-pointer bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              >
                Unpin
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex gap-2 items-end">
        <div className="flex-1 min-w-0">
          <CalcAutocomplete
            label="Species (Forme)"
            value={species}
            options={speciesOptions}
            placeholder="Search species..."
            onChange={onChangeSpecies}
          />
        </div>
        {megaGroup.length > 0 && (
          <FormeToggle group={megaGroup} current={species} onSelect={onChangeSpecies} />
        )}
      </div>

      {formes.statFormes.length > 1 && (
        <FormeToggle group={formes.statFormes} current={species} onSelect={onChangeSpecies} />
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Known Item</label>
          <select
            value={knownItem}
            onChange={(e) => onChangeKnownItem(e.target.value)}
            title="Pin the opponent's held item once it's been revealed in-battle (a Life Orb recoil message, a Fling/Knock Off reveal, etc.)"
            className="w-full px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value="">Unknown</option>
            {itemOptions.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Known Ability</label>
          <select
            value={knownAbility}
            onChange={(e) => onChangeKnownAbility(e.target.value)}
            disabled={abilityOptions.length === 0}
            title="Pin the opponent's ability once it's been revealed in-battle (an Intimidate trigger, an ability-activation message, etc.) - narrows the ability axis as a hard filter instead of scanning the full pool per observation"
            className="w-full px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Unknown</option>
            {abilityOptions.map(ability => <option key={ability} value={ability}>{ability}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Known Nature</label>
          <select
            value={knownNature}
            onChange={(e) => onChangeKnownNature(e.target.value as NatureName | '')}
            title="Pin the opponent's nature once it's been confirmed (a stat-boost/-reduction message, a damage roll that only fits one nature, etc.)"
            className="w-full px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value="">Unknown</option>
            {natureOptions.map(nature => <option key={nature} value={nature}>{nature}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Status</label>
          <select
            value={status}
            onChange={(e) => onChangeStatus(e.target.value as StatusName | '')}
            title="Mark a status confirmed in-battle - applies its real damage/speed effects (burn halving physical damage dealt, paralysis halving Speed, Hex/Facade's own checks) to every calc"
            className="w-full px-1 py-0.5 text-xs bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold cursor-pointer"
          >
            <option value="">Healthy</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <LiveCalcDefenderStatRows baseStats={baseStats} spBounds={spBounds} totalRanges={totalRanges} boosts={statRowBoosts} />

      {species && (
        <div className="flex flex-col gap-3 border-t border-zinc-800/80 pt-2">
          <p className="text-[10px] text-zinc-500">
            Narrows automatically as observations are added above - a tighter Stat Point range and fewer
            remaining candidates both mean more certainty, read independently per stat/axis (see each
            section's own count).
          </p>

          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Stat Points (0-32)</h4>
            <div className="grid grid-cols-1 gap-2">
              <StatBoundBar label="Attack" bound={inference.atkBound} observationCount={inference.theirPhysicalObservationCount} />
              <StatBoundBar label="Defense" bound={inference.defBound} observationCount={inference.physicalObservationCount} />
              <StatBoundBar label="Sp. Atk" bound={inference.spaBound} observationCount={inference.theirSpecialObservationCount} />
              <StatBoundBar label="Sp. Def" bound={inference.spdBound} observationCount={inference.specialObservationCount} />
              <StatBoundBar label="Speed" bound={inference.speedBound} observationCount={inference.speedObservationCount} />
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Candidates Narrowed</h4>
            <div className="grid grid-cols-1 gap-2">
              <LiveCalcCandidateGroup label="Nature" candidates={inference.natureCandidates} totalCount={baseline.natureCandidates.length} usageCandidates={inference.natureUsageCandidates} />
              <LiveCalcCandidateGroup label="Ability" candidates={inference.abilityCandidates} totalCount={abilityOptions.length} usageCandidates={inference.abilityUsageCandidates} />
              <LiveCalcCandidateGroup label="Item" candidates={inference.itemCandidates} totalCount={baseline.itemCandidates.length} usageCandidates={inference.itemUsageCandidates} />
            </div>
          </div>

          {totalObservations === 0 && (
            <p className="text-xs text-zinc-500">Nothing narrowed yet - add an observation below to begin.</p>
          )}

          {inference.contradictions.length > 0 && (
            <div className="flex flex-col gap-1">
              <h4 className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wide">
                Skipped/Ignored Observations
              </h4>
              {inference.contradictions.map((note, i) => (
                <p key={i} className="text-xs text-amber-400">{note}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

