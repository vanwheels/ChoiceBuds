/**
 * Battlefield.tsx - Center Battlefield: the 4 Currently-Active Combatants
 * Opponent's 2 active on top, player's 2 active on bottom - mirrors how a
 * real doubles field reads from the player's own point of view. This is
 * also the interactive core of the click-to-log flow: click an occupied
 * slot to open its move list (MoveLogPopover), click a move to log it -
 * self/field/spread moves auto-resolve their target(s), single-target
 * moves wait for a follow-up click on the field (any occupied slot always
 * works, highlighted ones are just a suggestion - this is a log, not a
 * rules enforcer). Click an empty slot to bring in a benched Pokemon, or
 * drag a roster card onto it - both call switchIn/swapActive, so
 * switch-logging/the arrow indicator work identically either way.
 *
 * Per-slot rendering (sprite/mega/stat-stage/ability-chip presentation)
 * lives in BattlefieldSlot.tsx - split out as a real component so
 * useMegaSprite (a hook) has a stable per-slot lifecycle. All interaction
 * STATE (which actor is armed, which slot's bench/stats popover is open,
 * pending move-target selection) stays here and is handed down as
 * computed booleans/callbacks, matching the "local useState in the
 * container" split OpponentFieldPanel already uses for its own popover.
 *
 * Also hosts the overall field-effect display: FieldWeatherBar
 * (weather/terrain/Trick Room) as its own full-width row above both
 * sides, and SideConditionsRow (per-side screens/Tailwind/hazards,
 * vertically stacked - see SideConditionsRow.tsx) beside each row.
 * Previously FieldWeatherBar sat squeezed into the opponent row's right
 * column and SideConditionsRow wrapped its chips horizontally - both
 * pushed this component's own minimum width wider than it needed to be,
 * indirectly starving the roster columns flanking it (OpponentFieldPanel/
 * PlayerFieldPanel) of the room to shrink to match each other. Moving
 * weather out to its own row and stacking conditions narrows this
 * component's footprint instead.
 */

import { useState } from 'react';
import type { Battle, BattleSide, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import { getTargetCategory } from '../../config/moveTargeting';
import { canActThisTurn, compactActiveIds, computeMoveEffectiveness } from '../../utils/battleLookup';
import BattlefieldSlot from './BattlefieldSlot';
import SideConditionsRow from './SideConditionsRow';
import FieldWeatherBar from './FieldWeatherBar';

interface BattlefieldProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  gameDataState: UseGameDataReturn;
  resolveSprite: (remoteUrl: string) => string;
}

type ActiveMon = BroughtPokemonSnapshot | OpponentPokemonEntry;
type SlotRef = { side: BattleSide; pokemonId: string };
type SlotPosition = { side: BattleSide; index: number };

export default function Battlefield({ battle, battleLogActions, gameDataState, resolveSprite }: BattlefieldProps) {
  const [armed, setArmed] = useState<SlotRef | null>(null);
  const [pendingTarget, setPendingTarget] = useState<{
    side: BattleSide; pokemonId: string; move: string; moveType?: string; isDamaging: boolean; candidates: SlotRef[];
  } | null>(null);
  const [benchSlot, setBenchSlot] = useState<SlotPosition | null>(null);
  const [statsFor, setStatsFor] = useState<SlotRef | null>(null);

  // Slot-aligned, not compacted - index 0/1 must stay pinned to the
  // persisted left/right position even when one side is empty (`null`),
  // otherwise removing the left slot's occupant would visually shift the
  // right one into its place.
  const opponentActive: (OpponentPokemonEntry | undefined)[] = battle.opponentActiveIds
    .map(id => id ? battle.opponentRoster.find(o => o.id === id) : undefined);
  const playerActive: (BroughtPokemonSnapshot | undefined)[] = battle.playerActiveIds
    .map(id => id ? battle.playerRoster.find(p => p.id === id) : undefined);

  const lastTurn = battle.turns[battle.turns.length - 1];
  const switchedInIds = new Set(lastTurn?.actions.filter(a => a.phase === 'switch' || a.phase === 'sendIn').map(a => a.pokemonId) ?? []);

  const playerBench = battle.playerRoster.filter(p =>
    battle.broughtIds.includes(p.id) && !battle.playerActiveIds.includes(p.id) && !battle.playerFaintedIds.includes(p.id));
  const opponentBench = battle.opponentRoster.filter(o =>
    !battle.opponentActiveIds.includes(o.id) && !o.fainted);

  const finalizeTarget = async (clicked: SlotRef) => {
    if (!pendingTarget) return;
    const effectiveness = pendingTarget.isDamaging && pendingTarget.moveType
      ? computeMoveEffectiveness(battle, pendingTarget.moveType, [clicked])
      : undefined;
    await battleLogActions.logAction(battle, {
      side: pendingTarget.side,
      pokemonId: pendingTarget.pokemonId,
      move: pendingTarget.move,
      target: [clicked],
      phase: 'move',
      effectiveness,
    });
    setPendingTarget(null);
  };

  const handleMovePicked = async (side: BattleSide, pokemonId: string, move: string) => {
    setArmed(null);
    const moveData = gameDataState.getCachedMove(move) ?? await gameDataState.getMoveData(move);
    const category = getTargetCategory(moveData?.target, move);
    const isDamaging = !!moveData && moveData.category !== 'status';

    const oppSide: BattleSide = side === 'player' ? 'opponent' : 'player';
    const sameSideActive = compactActiveIds(side === 'player' ? battle.playerActiveIds : battle.opponentActiveIds);
    const oppActive = compactActiveIds(oppSide === 'player' ? battle.playerActiveIds : battle.opponentActiveIds);
    const allyIds = sameSideActive.filter(id => id !== pokemonId);

    const logWithTargets = (target: SlotRef[]) => {
      const effectiveness = isDamaging && moveData ? computeMoveEffectiveness(battle, moveData.type, target) : undefined;
      return battleLogActions.logAction(battle, { side, pokemonId, move, target, phase: 'move', effectiveness });
    };

    if (category === 'self') return void logWithTargets([{ side, pokemonId }]);
    if (category === 'field') return void logWithTargets([]);
    if (category === 'all-foes') return void logWithTargets(oppActive.map(id => ({ side: oppSide, pokemonId: id })));
    if (category === 'all-allies') return void logWithTargets(sameSideActive.map(id => ({ side, pokemonId: id })));
    if (category === 'other-allies') return void logWithTargets(allyIds.map(id => ({ side, pokemonId: id })));
    if (category === 'all-except-self') {
      return void logWithTargets([
        ...allyIds.map(id => ({ side, pokemonId: id })),
        ...oppActive.map(id => ({ side: oppSide, pokemonId: id })),
      ]);
    }
    if (category === 'single-ally' && allyIds.length <= 1) {
      return void logWithTargets(allyIds.length === 1 ? [{ side, pokemonId: allyIds[0] }] : []);
    }

    // An ambiguous single-ally count, or unknown target data - wait for a click on the field.
    // 'single-foe' ("selected-pokemon" etc.) also lands here rather than
    // auto-targeting the opponent: real doubles lets a single-target move
    // hit any adjacent Pokemon, ally included (Parting Shot on a teammate,
    // an attack redirected onto your own side, etc.), so both sides get
    // highlighted as candidates, not opponents only.
    const candidates: SlotRef[] = category === 'single-ally'
      ? allyIds.map(id => ({ side, pokemonId: id }))
      : [...oppActive.map(id => ({ side: oppSide, pokemonId: id })), ...allyIds.map(id => ({ side, pokemonId: id }))];
    setPendingTarget({ side, pokemonId, move, moveType: moveData?.type, isDamaging, candidates });
  };

  const openBenchPicker = (side: BattleSide, slotIndex: number) => {
    setArmed(null);
    setPendingTarget(null);
    setStatsFor(null);
    setBenchSlot(prev => prev && prev.side === side && prev.index === slotIndex ? null : { side, index: slotIndex });
  };

  const handleSlotClick = (side: BattleSide, slotIndex: number, pokemonId: string | undefined) => {
    if (!pokemonId) {
      openBenchPicker(side, slotIndex);
      return;
    }
    if (pendingTarget) {
      finalizeTarget({ side, pokemonId });
      return;
    }
    if (!canActThisTurn(battle, pokemonId)) return;
    setBenchSlot(null);
    setStatsFor(null);
    setArmed(prev => prev && prev.side === side && prev.pokemonId === pokemonId ? null : { side, pokemonId });
  };

  const renderSlot = (side: BattleSide, slotIndex: number, mon: ActiveMon | undefined, arrowAbove: boolean) => (
    <BattlefieldSlot
      key={mon?.id ?? `${side}-empty-${slotIndex}`}
      battle={battle}
      battleLogActions={battleLogActions}
      resolveSprite={resolveSprite}
      side={side}
      mon={mon}
      arrowAbove={arrowAbove}
      switchedIn={!!mon && switchedInIds.has(mon.id)}
      isArmed={!!mon && armed?.side === side && armed.pokemonId === mon.id}
      isCandidate={!!mon && (pendingTarget?.candidates.some(c => c.side === side && c.pokemonId === mon.id) ?? false)}
      isBenchOpen={benchSlot?.side === side && benchSlot.index === slotIndex}
      isStatsOpen={!!mon && statsFor?.side === side && statsFor.pokemonId === mon.id}
      benchOptions={side === 'player' ? playerBench : opponentBench}
      onSlotClick={() => handleSlotClick(side, slotIndex, mon?.id)}
      onOpenBench={() => openBenchPicker(side, slotIndex)}
      onDrop={id => {
        setBenchSlot(null);
        if (mon) battleLogActions.swapActive(battle, side, mon.id, id);
        else battleLogActions.switchIn(battle, side, id, slotIndex);
      }}
      onPickMove={move => mon && handleMovePicked(side, mon.id, move)}
      onCloseMovePopover={() => setArmed(null)}
      onPickBench={id => {
        if (mon) battleLogActions.swapActive(battle, side, mon.id, id);
        else battleLogActions.switchIn(battle, side, id, slotIndex);
        setBenchSlot(null);
      }}
      onCloseBench={() => setBenchSlot(null)}
      onOpenStats={() => mon && setStatsFor(prev => prev && prev.side === side && prev.pokemonId === mon.id ? null : { side, pokemonId: mon.id })}
      onCloseStats={() => setStatsFor(null)}
    />
  );

  return (
    <div className="flex flex-col gap-4 py-4 px-4 rounded-lg bg-gray-900/60 border border-gray-800 flex-1">
      {pendingTarget && (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-600 text-[11px] text-yellow-300 self-center">
          Choose a target for {pendingTarget.move}...
          <button type="button" onClick={() => setPendingTarget(null)} className="text-yellow-400 hover:text-yellow-200 cursor-pointer">Cancel</button>
        </div>
      )}

      <FieldWeatherBar battle={battle} battleLogActions={battleLogActions} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <SideConditionsRow battle={battle} side="opponent" battleLogActions={battleLogActions} />
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-[9px] font-bold uppercase tracking-wide text-red-400">Opponent&apos;s Side</span>
          <div className="flex gap-6">
            {[0, 1].map(slot => renderSlot('opponent', slot, opponentActive[slot], true))}
          </div>
        </div>
        <div className="flex-1 min-w-0" />
      </div>

      <div className="w-full border-t border-dashed border-gray-800" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <SideConditionsRow battle={battle} side="player" battleLogActions={battleLogActions} />
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="flex gap-6">
            {[0, 1].map(slot => renderSlot('player', slot, playerActive[slot], false))}
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wide text-blue-400">Your Side</span>
        </div>
        <div className="flex-1 min-w-0" />
      </div>
    </div>
  );
}
