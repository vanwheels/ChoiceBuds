/**
 * LiveCalcResultPanel.tsx - Live Calc Results Display (Leg 3)
 * Replaces LiveCalcPage.tsx's Leg 2 raw plumbing-confirmation preview with
 * the real result surface: a 0-32 SP range bar per defensive stat, narrowed
 * nature/ability/item candidate groups (LiveCalcCandidateGroup), and any
 * skipped/contradicted observation notes. See docs/investigations/
 * live-calc-stat-inference-scope.md for what the engine underneath this can
 * and can't disentangle (v1 approximations listed in utils/liveCalcEngine.ts's
 * own header) - this panel only presents `LiveCalcInference` as-is, no
 * inference logic lives here.
 *
 * "Certainty" is shown per stat axis the engines narrow: a physical SP range
 * bar for Def, a special SP range bar for SpD, and a Speed SP range bar (Leg
 * 15's turn-order engine) (each also showing its own observation count - the
 * bar alone can't distinguish "0 observations, full range" from "many
 * observations that all landed within the full range"), and a candidates-narrowed
 * fraction bar per nature/ability/item (LiveCalcCandidateGroup). Nothing
 * here invents a single aggregate "confidence score" across all of these -
 * the axes narrow independently (per the engine's own documented
 * per-variable-heuristic approximation) and a single blended number would
 * imply a joint precision the engine doesn't actually have.
 *
 * Live Calc Result Clarity Pass (per feedback that "the UI is just not clear
 * on how it's meant to read"): the two axis families are now under their own
 * "Stat Points (0-32)"/"Candidates Narrowed" section labels rather than
 * flowing together as one undifferentiated grid stack, each SP bar carries a
 * 0/32 tick row so the highlighted range reads against a fixed scale instead
 * of a bar with no anchor, and a subtitle under the panel's own title states
 * the read-this-independently-per-axis rule up front rather than leaving it
 * implicit. The skipped/ignored-observations list also gained its own
 * section label - it was previously bare amber text with no heading tying it
 * to "these are the observations that DIDN'T narrow anything." The
 * diagnostic wording of the messages themselves is `liveCalcEngine.ts`'s own
 * concern (`inferDefenderStats()`'s contradiction messages now name which
 * axis/lock actually failed) - this panel just renders whatever string it's
 * given, same as before.
 *
 * Also owns the "Pin to Speed Tiers" action (Live Calc -> Speed Tiers
 * Tie-in, Leg 6, see TODO.md / hooks/useLiveCalcThreatPins.ts) - snapshots
 * the current defender species/level + the Speed SP bound and nature
 * candidates narrowed above into a shared pin the Speed Tiers tab reads
 * back. An explicit action rather than automatic mirroring, so a doubles
 * opponent's several mons can each get their own independently-pinned
 * snapshot (switch defender species here, pin again) instead of Speed Tiers
 * only ever reflecting whichever species this page's defender field
 * currently holds.
 */

import type { Generation } from '@smogon/calc/dist/data/interface';
import type { LiveCalcInference, LiveCalcStatBound } from '../../utils/liveCalcEngine';
import { defaultInference } from '../../utils/liveCalcEngine';
import type { UseLiveCalcThreatPinsReturn } from '../../hooks/useLiveCalcThreatPins';
import LiveCalcCandidateGroup from './LiveCalcCandidateGroup';

const SP_RANGE_TOTAL = 32;

interface LiveCalcResultPanelProps {
  gen: Generation;
  defenderSpecies: string;
  defenderLevel: number;
  inference: LiveCalcInference;
  liveCalcThreatPinsState: UseLiveCalcThreatPinsReturn;
}

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

export default function LiveCalcResultPanel({ gen, defenderSpecies, defenderLevel, inference, liveCalcThreatPinsState }: LiveCalcResultPanelProps) {
  const baseline = defaultInference(gen, defenderSpecies);
  const totalObservations = inference.physicalObservationCount + inference.specialObservationCount + inference.speedObservationCount;

  const { pins, pinThreat, unpinThreat } = liveCalcThreatPinsState;
  const isPinned = !!defenderSpecies && pins.has(defenderSpecies.toLowerCase());
  const handlePin = () => {
    pinThreat({
      species: defenderSpecies,
      level: defenderLevel,
      speedSpBound: inference.speedBound,
      natureCandidates: inference.natureCandidates,
      observationCount: inference.speedObservationCount,
    });
  };

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Inferred Defender</h3>
        <p className="text-xs text-zinc-500">
          Narrows automatically as observations are added above - a tighter Stat Point range and fewer
          remaining candidates both mean more certainty, read independently per stat/axis (see each
          section's own count).
        </p>
      </div>

      {!defenderSpecies ? (
        <p className="text-sm text-zinc-500">Pick a defender species above to start narrowing its stats.</p>
      ) : (
        <>
          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Stat Points (0-32)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatBoundBar label="Defense" bound={inference.defBound} observationCount={inference.physicalObservationCount} />
              <StatBoundBar label="Sp. Def" bound={inference.spdBound} observationCount={inference.specialObservationCount} />
              <StatBoundBar label="Speed" bound={inference.speedBound} observationCount={inference.speedObservationCount} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePin}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30 border border-accent-gold/40"
            >
              {isPinned ? 'Update Speed Tiers pin' : 'Pin to Speed Tiers'}
            </button>
            {isPinned && (
              <>
                <button
                  type="button"
                  onClick={() => unpinThreat(defenderSpecies)}
                  className="px-2.5 py-1 text-xs rounded text-zinc-400 hover:text-zinc-200"
                >
                  Unpin
                </button>
                <span className="text-[10px] text-zinc-500">Annotated on the Speed Tiers tab</span>
              </>
            )}
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Candidates Narrowed</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LiveCalcCandidateGroup label="Nature" candidates={inference.natureCandidates} totalCount={baseline.natureCandidates.length} />
              <LiveCalcCandidateGroup label="Ability" candidates={inference.abilityCandidates} totalCount={baseline.abilityCandidates.length} />
              <LiveCalcCandidateGroup label="Item" candidates={inference.itemCandidates} totalCount={baseline.itemCandidates.length} />
            </div>
          </div>

          {totalObservations === 0 && (
            <p className="text-xs text-zinc-500">Nothing narrowed yet - add an observation above (a damage% hit, or a turn-order read) to begin.</p>
          )}

          {inference.contradictions.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-zinc-800/80 pt-2">
              <h4 className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wide">
                Skipped/Ignored Observations
              </h4>
              {inference.contradictions.map((note, i) => (
                <p key={i} className="text-xs text-amber-400">{note}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
