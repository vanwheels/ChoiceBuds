/**
 * BattlefieldSlot.tsx - One Battlefield Position (Empty or Occupied)
 * Extracted out of Battlefield.tsx as a real component (not a plain helper
 * function) specifically so useMegaSprite - a hook - has a stable per-slot
 * lifecycle to attach to; Battlefield.tsx used to call a renderSlot()
 * helper a variable number of times per render (early-returning for empty
 * slots), which would violate the Rules of Hooks the moment a hook call
 * was added inside it. useMegaSprite is still called unconditionally at
 * the top of this component (passing null when not applicable) rather
 * than skipped for the empty-slot case, for the same reason.
 *
 * All interaction STATE (armed/pendingTarget/benchSlot/statsFor) still
 * lives in the parent Battlefield.tsx - this component is handed already-
 * computed booleans and narrow callbacks, matching the rest of this
 * feature's "local useState in the container, dumb-ish presentational
 * children" split.
 */

import { useState } from 'react';
import type { MouseEvent, DragEvent } from 'react';
import type { Battle, BattleSide, BroughtPokemonSnapshot, OpponentPokemonEntry, StatusCondition } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import { getMegaApiSlug, getMegaFormsForSpecies } from '../../config/megaEvolution';
import { useMegaSprite } from '../../hooks/useMegaSprite';
import { getSwitchInEffect } from '../../config/onSwitchInAbilities';
import { getReactiveLowerEffect } from '../../config/reactiveAbilities';
import { getHitReactiveEffect } from '../../config/hitReactiveAbilities';
import { STAT_ORDER, STAT_LABELS } from '../../config/statStages';
import { STATUS_ABBREVIATIONS, STATUS_COLORS, STATUS_LABELS } from '../../config/statusConditions';
import { POKEMON_DRAG_TYPE, pokemonDragTypeForSide, type PokemonDragPayload } from '../../utils/dragTypes';
import {
  hasAppliedAbilityEffectSinceSwitchIn, hasUnappliedReactiveLowerEffect, hasUnappliedHitReactiveEffect,
  mostRecentTargetingActionThisTurn, canActThisTurn, canSwitchOutThisTurn,
} from '../../utils/battleLookup';
import { useDismissable } from '../../hooks/useDismissable';
import MoveLogPopover from './MoveLogPopover';
import StatStagePopover from './StatStagePopover';
import StatusConditionPopover from './StatusConditionPopover';

type ActiveMon = BroughtPokemonSnapshot | OpponentPokemonEntry;

function formatStatSummary(stages: Partial<Record<string, number>>): string {
  return STAT_ORDER
    .filter(stat => stages[stat])
    .map(stat => `${STAT_LABELS[stat]} ${(stages[stat] as number) > 0 ? '+' : ''}${stages[stat]}`)
    .join(', ');
}

/** "charizardite x" -> "Charizardite X" - Mega Stone names for the opponent item field. */
function titleCase(text: string): string {
  return text.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * `side` is this slot's own side - compared against the side-specific drag
 * type set at drag start (see dragTypes.ts::pokemonDragTypeForSide) to show
 * a live valid/invalid indicator while the drag is still in progress, not
 * just reject a mismatched drop silently (handleDropPayload in the parent
 * already does that part). `dataTransfer.getData()` can't be read until
 * `drop`, but `.types` can be checked during `dragover`.
 */
function EmptySlot({ side, onClick, onDrop }: { side: BattleSide; onClick: () => void; onDrop?: (dataTransfer: DataTransfer) => void }) {
  const [dragState, setDragState] = useState<'none' | 'valid' | 'invalid'>('none');
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDrop ? e => {
        e.preventDefault();
        setDragState(e.dataTransfer.types.includes(pokemonDragTypeForSide(side)) ? 'valid' : 'invalid');
      } : undefined}
      onDragLeave={onDrop ? () => setDragState('none') : undefined}
      onDrop={onDrop ? e => {
        e.preventDefault();
        setDragState('none');
        onDrop(e.dataTransfer);
      } : undefined}
      title={dragState === 'invalid' ? `Can't send in a Pokemon from the other side` : 'Bring in a benched Pokemon (click or drag)'}
      className={`w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center text-xs cursor-pointer transition-colors ${
        dragState === 'valid'
          ? 'border-blue-400 bg-blue-500/10 text-blue-300'
          : dragState === 'invalid'
            ? 'border-red-500 bg-red-500/10 text-red-400 cursor-not-allowed'
            : 'border-gray-800 text-gray-700 hover:border-gray-600 hover:text-gray-500'
      }`}
    >
      {dragState === 'invalid' ? '⊘' : '+'}
    </button>
  );
}

function BenchPicker({
  options, resolveSprite, onPick, onClose,
}: {
  options: ActiveMon[];
  resolveSprite: (remoteUrl: string) => string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useDismissable<HTMLDivElement>(onClose);
  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-40 p-2 rounded-lg bg-gray-800 border-2 border-blue-500 shadow-lg flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Switch in</span>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-400 cursor-pointer text-xs">×</button>
      </div>
      {options.length === 0 ? (
        <p className="text-[11px] text-gray-500 italic">Nobody available</p>
      ) : (
        options.map(mon => {
          const isPlayer = 'nickname' in mon;
          const displayName = isPlayer ? (mon.nickname || mon.species) : mon.species;
          const gender = isPlayer ? (mon.gender || 'M') : 'M';
          return (
            <button
              key={mon.id}
              type="button"
              onClick={() => onPick(mon.id)}
              className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-blue-900/60 cursor-pointer transition-colors"
            >
              <img
                src={resolveSprite(getPixelSpriteUrl(mon.pokedexNumber, mon.species, gender, false))}
                alt={mon.species}
                className="w-7 h-7 object-contain [image-rendering:pixelated] shrink-0"
              />
              <span className="text-xs text-gray-100 truncate">{displayName}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

function MegaFormPicker({
  forms, onPick, onClose,
}: {
  forms: { item: string; suffix: string }[];
  onPick: (form: { item: string; suffix: string }) => void;
  onClose: () => void;
}) {
  const ref = useDismissable<HTMLDivElement>(onClose);
  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 p-1 rounded-lg bg-gray-800 border-2 border-yellow-500 shadow-lg flex gap-1">
      {forms.map(form => (
        <button
          key={form.item}
          type="button"
          onClick={() => onPick(form)}
          title={titleCase(form.item)}
          className="px-2 py-1 text-[10px] font-bold rounded bg-gray-900 text-yellow-300 hover:bg-yellow-900/60 cursor-pointer"
        >
          {form.suffix.replace('mega-', '').toUpperCase()}
        </button>
      ))}
    </div>
  );
}

interface BattlefieldSlotProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  resolveSprite: (remoteUrl: string) => string;
  side: BattleSide;
  mon: ActiveMon | undefined;
  arrowAbove: boolean;
  switchedIn: boolean;
  isArmed: boolean;
  isCandidate: boolean;
  isBenchOpen: boolean;
  isStatsOpen: boolean;
  isStatusOpen: boolean;
  benchOptions: ActiveMon[];
  onSlotClick: () => void;
  onOpenBench: () => void;
  onDrop?: (pokemonId: string) => void;
  onPickMove: (move: string) => void;
  onLogNoAction: (note: string) => void;
  onCloseMovePopover: () => void;
  onPickBench: (pokemonId: string) => void;
  onCloseBench: () => void;
  onOpenStats: () => void;
  onCloseStats: () => void;
  onOpenStatus: () => void;
  onCloseStatus: () => void;
}

export default function BattlefieldSlot({
  battle, battleLogActions, resolveSprite, side, mon, arrowAbove, switchedIn,
  isArmed, isCandidate, isBenchOpen, isStatsOpen, isStatusOpen, benchOptions,
  onSlotClick, onOpenBench, onDrop, onPickMove, onLogNoAction, onCloseMovePopover, onPickBench, onCloseBench,
  onOpenStats, onCloseStats, onOpenStatus, onCloseStatus,
}: BattlefieldSlotProps) {
  const [showMegaPicker, setShowMegaPicker] = useState(false);

  const isMega = mon ? battle.megaEvolvedIds.includes(mon.id) : false;
  const resolvedMegaSlug = mon ? getMegaApiSlug(mon.item, mon.species) : null;
  const megaSprite = useMegaSprite(isMega ? resolvedMegaSlug : null);

  // Parses the drag payload (see utils/dragTypes.ts) and only forwards to
  // the parent's onDrop when it was dragged from this same side - a
  // player card dropped on an opponent slot (or vice versa) is ignored.
  const handleDropPayload = (dataTransfer: DataTransfer) => {
    if (!onDrop) return;
    const raw = dataTransfer.getData(POKEMON_DRAG_TYPE);
    if (!raw) return;
    try {
      const payload: PokemonDragPayload = JSON.parse(raw);
      if (payload.side === side) onDrop(payload.pokemonId);
    } catch {
      // malformed/foreign drag payload - ignore
    }
  };

  if (!mon) {
    return (
      <div className="relative flex flex-col items-center">
        <EmptySlot side={side} onClick={onSlotClick} onDrop={onDrop ? handleDropPayload : undefined} />
        {isBenchOpen && (
          <BenchPicker options={benchOptions} resolveSprite={resolveSprite} onPick={onPickBench} onClose={onCloseBench} />
        )}
      </div>
    );
  }

  const isPlayer = 'nickname' in mon;
  const displayName = isPlayer ? (mon.nickname || mon.species) : mon.species;
  const gender = isPlayer ? (mon.gender || 'M') : 'M';
  const stages = battle.statStages[mon.id] ?? {};
  const statSummary = formatStatSummary(stages);
  const currentStatus: StatusCondition | null = battle.statusConditions[mon.id] ?? null;
  const arrow = <span className="text-[10px] leading-none text-yellow-400">{arrowAbove ? '▼' : '▲'}</span>;

  const knownAbility = mon.ability;
  const switchInEffect = getSwitchInEffect(knownAbility);
  const showAbilityChip = !!switchInEffect && !!knownAbility && !hasAppliedAbilityEffectSinceSwitchIn(battle, mon.id, knownAbility);
  const reactiveEffect = getReactiveLowerEffect(knownAbility);
  const showReactiveChip = !!reactiveEffect && !!knownAbility && hasUnappliedReactiveLowerEffect(battle, mon.id, knownAbility);
  const hitReactiveEffect = getHitReactiveEffect(knownAbility);
  const showHitReactiveChip = !!hitReactiveEffect && !!knownAbility && hasUnappliedHitReactiveEffect(battle, mon.id, knownAbility, hitReactiveEffect.trigger);

  // "What just happened to me this turn" - drives the Inflict-Status chip
  // below (Miss/Crit/No Effect/Blocked moved to the inline MoveOutcomePrompt
  // shown right after logging - see Battlefield.tsx's pendingOutcomes -
  // since a per-slot chip that lingers for the rest of the turn was easy to
  // lose track of, and didn't naturally extend to multi-target moves).
  const targetingAction = mostRecentTargetingActionThisTurn(battle, mon.id);
  const showStatusInflictChip = !!targetingAction?.statusAilment && battle.statusConditions[mon.id] !== targetingAction.statusAilment;

  const canAct = canActThisTurn(battle, mon.id);
  const canSwitchOut = canSwitchOutThisTurn(battle, mon.id);
  const hasReplacement = benchOptions.length > 0;
  const sideRoster = side === 'player' ? battle.playerRoster : battle.opponentRoster;
  const sideAlreadyMega = battle.megaEvolvedIds.some(id => sideRoster.some(p => p.id === id));

  const megaForms = getMegaFormsForSpecies(mon.species);
  const spriteUrl = megaSprite ? megaSprite.spriteUrl : resolveSprite(getPixelSpriteUrl(mon.pokedexNumber, mon.species, gender, false));

  const declareMega = (form?: { item: string; suffix: string }) => {
    battleLogActions.setMegaEvolved(battle, mon.id, form ? titleCase(form.item) : undefined);
    setShowMegaPicker(false);
  };

  const handleMegaClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (resolvedMegaSlug) return declareMega();
    if (megaForms.length === 1) return declareMega(megaForms[0]);
    setShowMegaPicker(prev => !prev);
  };

  const handleSwitchClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!canSwitchOut) return;
    if (hasReplacement) onOpenBench();
    else battleLogActions.switchOut(battle, side, mon.id);
  };

  const handleDragOver = onDrop ? (e: DragEvent<HTMLDivElement>) => e.preventDefault() : undefined;
  const handleDrop = onDrop ? (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleDropPayload(e.dataTransfer);
  } : undefined;

  return (
    <div key={mon.id} className="relative flex flex-col items-center gap-0.5" onDragOver={handleDragOver} onDrop={handleDrop}>
      {arrowAbove && switchedIn && arrow}
      <button
        type="button"
        onClick={onSlotClick}
        title={!canAct ? 'Already acted this turn' : undefined}
        className={`relative rounded-lg p-1 cursor-pointer transition-colors ${!canAct ? 'opacity-50' : ''} ${
          isArmed ? 'bg-blue-600/30 ring-2 ring-blue-400' : isCandidate ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'hover:bg-gray-800/60'
        }`}
      >
        <img src={spriteUrl} alt={mon.species} className="w-20 h-20 object-contain [image-rendering:pixelated]" />
      </button>
      <span className={isPlayer ? 'text-xs text-blue-300' : 'text-xs text-red-300'}>{displayName}{isMega ? ' ⚡' : ''}</span>
      {!arrowAbove && switchedIn && arrow}
      {statSummary && <span className="text-[9px] text-gray-400">{statSummary}</span>}
      {currentStatus && (
        <span className={`text-[9px] font-bold px-1 rounded ${STATUS_COLORS[currentStatus]}`}>
          {STATUS_ABBREVIATIONS[currentStatus]}
        </span>
      )}

      {showAbilityChip && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); battleLogActions.applyAbilityEffect(battle, side, mon.id, knownAbility!); }}
          title="Apply this ability's switch-in effect"
          className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 hover:bg-purple-800 cursor-pointer"
        >
          {knownAbility}!
        </button>
      )}
      {showReactiveChip && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); battleLogActions.applyReactiveLowerEffect(battle, mon.id, knownAbility!); }}
          title="Apply this ability's reactive stat raise"
          className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 hover:bg-purple-800 cursor-pointer"
        >
          {knownAbility}!
        </button>
      )}
      {showHitReactiveChip && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); battleLogActions.applyHitReactiveEffect(battle, mon.id, knownAbility!); }}
          title="Apply this ability's hit-triggered stat change"
          className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 hover:bg-purple-800 cursor-pointer"
        >
          {knownAbility}!
        </button>
      )}
      {showStatusInflictChip && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); battleLogActions.setStatusCondition(battle, side, mon.id, targetingAction!.statusAilment!); }}
          title="Apply this move's status effect"
          className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 hover:bg-purple-800 cursor-pointer"
        >
          Inflict {STATUS_LABELS[targetingAction!.statusAilment!]}?
        </button>
      )}

      <div className="relative flex gap-1">
        <button
          type="button"
          onClick={handleSwitchClick}
          disabled={!canSwitchOut}
          title={canSwitchOut ? (hasReplacement ? 'Switch this Pokemon out' : 'Switch this Pokemon out (last one standing)') : "Can't switch out - already acted this turn"}
          className={`text-[9px] px-1 rounded bg-gray-900 ${canSwitchOut ? 'text-gray-500 hover:text-gray-300 cursor-pointer' : 'text-gray-700 cursor-not-allowed'}`}
        >
          Switch
        </button>
        {!isMega && megaForms.length > 0 && !sideAlreadyMega && (
          <button
            type="button"
            onClick={handleMegaClick}
            disabled={!canAct}
            title={canAct ? 'Mark as Mega Evolved' : 'Already acted this turn'}
            className={`text-[9px] px-1 rounded bg-gray-900 ${canAct ? 'text-gray-500 hover:text-yellow-300 cursor-pointer' : 'text-gray-700 cursor-not-allowed'}`}
          >
            Mega
          </button>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onOpenStats(); }}
          title="Adjust stat stages"
          className="text-[9px] px-1 rounded bg-gray-900 text-gray-500 hover:text-blue-300 cursor-pointer"
        >
          Stats
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onOpenStatus(); }}
          title="Set status condition"
          className="text-[9px] px-1 rounded bg-gray-900 text-gray-500 hover:text-yellow-300 cursor-pointer"
        >
          Status
        </button>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); battleLogActions.setFainted(battle, side, mon.id, true); }}
          title="Mark fainted"
          className="text-[9px] px-1 rounded bg-gray-900 text-gray-500 hover:text-red-400 cursor-pointer"
        >
          Fainted
        </button>

        {showMegaPicker && (
          <MegaFormPicker forms={megaForms} onPick={declareMega} onClose={() => setShowMegaPicker(false)} />
        )}
        {isBenchOpen && (
          <BenchPicker options={benchOptions} resolveSprite={resolveSprite} onPick={onPickBench} onClose={onCloseBench} />
        )}
      </div>

      {isArmed && (
        <MoveLogPopover
          actorLabel={displayName}
          moves={mon.moves}
          allowFreeform={!isPlayer}
          currentStatus={currentStatus}
          weather={battle.fieldState.weather?.type ?? null}
          onPickMove={onPickMove}
          onLogNoAction={onLogNoAction}
          onClose={onCloseMovePopover}
        />
      )}

      {isStatsOpen && (
        <StatStagePopover
          stages={stages}
          onAdjust={(stat, delta) => battleLogActions.adjustStatStage(battle, mon.id, stat, delta)}
          onClose={onCloseStats}
        />
      )}

      {isStatusOpen && (
        <StatusConditionPopover
          current={currentStatus}
          onPick={status => battleLogActions.setStatusCondition(battle, side, mon.id, status)}
          onClose={onCloseStatus}
        />
      )}
    </div>
  );
}
