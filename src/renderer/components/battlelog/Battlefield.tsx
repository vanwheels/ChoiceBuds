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
 * drag a roster card onto it - both call the same switchActive action, so
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
 * Also hosts the overall field-effect display: SideConditionsRow (per-side
 * screens/Tailwind/hazards) beside each row, FieldWeatherBar
 * (weather/terrain/Trick Room) in the top-right - see the two mockup
 * screenshots this layout was built from.
 */

import { useState } from 'react';
import type { Battle, BattleSide, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import { getTargetCategory } from '../../config/moveTargeting';
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
  const [pendingTarget, setPendingTarget] = useState<{ side: BattleSide; pokemonId: string; move: string; candidates: SlotRef[] } | null>(null);
  const [benchSlot, setBenchSlot] = useState<SlotPosition | null>(null);
  const [statsFor, setStatsFor] = useState<SlotRef | null>(null);

  const opponentActive = battle.opponentActiveIds
    .map(id => battle.opponentRoster.find(o => o.id === id))
    .filter((o): o is OpponentPokemonEntry => !!o);
  const playerActive = battle.playerActiveIds
    .map(id => battle.playerRoster.find(p => p.id === id))
    .filter((p): p is BroughtPokemonSnapshot => !!p);

  const lastTurn = battle.turns[battle.turns.length - 1];
  const switchedInIds = new Set(lastTurn?.actions.filter(a => a.phase === 'switch').map(a => a.pokemonId) ?? []);

  const playerBench = battle.playerRoster.filter(p =>
    battle.broughtIds.includes(p.id) && !battle.playerActiveIds.includes(p.id) && !battle.playerFaintedIds.includes(p.id));
  const opponentBench = battle.opponentRoster.filter(o =>
    !battle.opponentActiveIds.includes(o.id) && !o.fainted);

  const finalizeTarget = async (clicked: SlotRef) => {
    if (!pendingTarget) return;
    await battleLogActions.logAction(battle, {
      side: pendingTarget.side,
      pokemonId: pendingTarget.pokemonId,
      move: pendingTarget.move,
      target: [clicked],
      phase: 'move',
    });
    setPendingTarget(null);
  };

  const handleMovePicked = async (side: BattleSide, pokemonId: string, move: string) => {
    setArmed(null);
    const moveData = gameDataState.getCachedMove(move) ?? await gameDataState.getMoveData(move);
    const category = getTargetCategory(moveData?.target);

    const oppSide: BattleSide = side === 'player' ? 'opponent' : 'player';
    const sameSideActive = side === 'player' ? battle.playerActiveIds : battle.opponentActiveIds;
    const oppActive = oppSide === 'player' ? battle.playerActiveIds : battle.opponentActiveIds;
    const allyIds = sameSideActive.filter(id => id !== pokemonId);

    const logWithTargets = (target: SlotRef[]) =>
      battleLogActions.logAction(battle, { side, pokemonId, move, target, phase: 'move' });

    if (category === 'self') return void logWithTargets([{ side, pokemonId }]);
    if (category === 'field') return void logWithTargets([]);
    if (category === 'all-foes') return void logWithTargets(oppActive.map(id => ({ side: oppSide, pokemonId: id })));
    if (category === 'all-allies') return void logWithTargets(sameSideActive.map(id => ({ side, pokemonId: id })));
    if (category === 'all-except-self') {
      return void logWithTargets([
        ...allyIds.map(id => ({ side, pokemonId: id })),
        ...oppActive.map(id => ({ side: oppSide, pokemonId: id })),
      ]);
    }
    if (category === 'single-ally' && allyIds.length <= 1) {
      return void logWithTargets(allyIds.length === 1 ? [{ side, pokemonId: allyIds[0] }] : []);
    }

    // single-foe, an ambiguous single-ally count, or unknown target data - wait for a click on the field
    const candidates: SlotRef[] = category === 'single-ally'
      ? allyIds.map(id => ({ side, pokemonId: id }))
      : category === 'unknown'
        ? [...oppActive.map(id => ({ side: oppSide, pokemonId: id })), ...sameSideActive.map(id => ({ side, pokemonId: id }))]
        : oppActive.map(id => ({ side: oppSide, pokemonId: id }));
    setPendingTarget({ side, pokemonId, move, candidates });
  };

  const handleSlotClick = (side: BattleSide, slotIndex: number, pokemonId: string | undefined) => {
    if (!pokemonId) {
      setArmed(null);
      setPendingTarget(null);
      setStatsFor(null);
      setBenchSlot(prev => prev && prev.side === side && prev.index === slotIndex ? null : { side, index: slotIndex });
      return;
    }
    if (pendingTarget) {
      finalizeTarget({ side, pokemonId });
      return;
    }
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
      onDrop={side === 'player' ? id => { setBenchSlot(null); battleLogActions.switchActive(battle, side, id); } : undefined}
      onPickMove={move => mon && handleMovePicked(side, mon.id, move)}
      onCloseMovePopover={() => setArmed(null)}
      onPickBench={id => { battleLogActions.switchActive(battle, side, id); setBenchSlot(null); }}
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

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <SideConditionsRow battle={battle} side="opponent" battleLogActions={battleLogActions} />
        </div>
        <div className="flex gap-6 shrink-0">
          {[0, 1].map(slot => renderSlot('opponent', slot, opponentActive[slot], true))}
        </div>
        <div className="flex-1 min-w-0">
          <FieldWeatherBar battle={battle} battleLogActions={battleLogActions} />
        </div>
      </div>

      <div className="w-full border-t border-dashed border-gray-800" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <SideConditionsRow battle={battle} side="player" battleLogActions={battleLogActions} />
        </div>
        <div className="flex gap-6 shrink-0">
          {[0, 1].map(slot => renderSlot('player', slot, playerActive[slot], false))}
        </div>
        <div className="flex-1 min-w-0" />
      </div>
    </div>
  );
}
