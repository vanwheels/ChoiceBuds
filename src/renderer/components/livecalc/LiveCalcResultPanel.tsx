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
 */

import type { Generation } from '@smogon/calc/dist/data/interface';
import type { LiveCalcInference, LiveCalcStatBound } from '../../utils/liveCalcEngine';
import { defaultInference } from '../../utils/liveCalcEngine';
import LiveCalcCandidateGroup from './LiveCalcCandidateGroup';

const SP_RANGE_TOTAL = 32;

interface LiveCalcResultPanelProps {
  gen: Generation;
  defenderSpecies: string;
  inference: LiveCalcInference;
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
          {rangeText} · {observationCount} obs.
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden relative">
        <div
          className="h-full bg-accent-gold absolute top-0"
          style={{ left: `${startPercent}%`, width: `${Math.max(widthPercent, 100 / SP_RANGE_TOTAL)}%` }}
        />
      </div>
    </div>
  );
}

export default function LiveCalcResultPanel({ gen, defenderSpecies, inference }: LiveCalcResultPanelProps) {
  const baseline = defaultInference(gen, defenderSpecies);
  const totalObservations = inference.physicalObservationCount + inference.specialObservationCount + inference.speedObservationCount;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-3">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Inferred Defender</h3>

      {!defenderSpecies ? (
        <p className="text-sm text-zinc-500">Pick a defender species to start narrowing its stats.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBoundBar label="Defense SP" bound={inference.defBound} observationCount={inference.physicalObservationCount} />
            <StatBoundBar label="Sp. Def SP" bound={inference.spdBound} observationCount={inference.specialObservationCount} />
            <StatBoundBar label="Speed SP" bound={inference.speedBound} observationCount={inference.speedObservationCount} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LiveCalcCandidateGroup label="Nature" candidates={inference.natureCandidates} totalCount={baseline.natureCandidates.length} />
            <LiveCalcCandidateGroup label="Ability" candidates={inference.abilityCandidates} totalCount={baseline.abilityCandidates.length} />
            <LiveCalcCandidateGroup label="Item" candidates={inference.itemCandidates} totalCount={baseline.itemCandidates.length} />
          </div>

          {totalObservations === 0 && (
            <p className="text-xs text-zinc-500">Add an observation to begin narrowing.</p>
          )}

          {inference.contradictions.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-zinc-800/80 pt-2">
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
