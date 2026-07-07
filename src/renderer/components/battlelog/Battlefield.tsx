/**
 * Battlefield.tsx - Center Battlefield: the 4 Currently-Active Combatants
 * Opponent's 2 active on top, player's 2 active on bottom - mirrors how a
 * real doubles field reads from the player's own point of view. This is
 * also the interactive core of the click-to-log flow: click an occupied
 * slot to open its move list (MoveLogPopover), click a move to log it -
 * self/field/spread moves auto-resolve their target(s), single-target
 * moves wait for a follow-up click on the field (any occupied slot always
 * works, highlighted ones are just a suggestion - this is a log, not a
 * rules enforcer). Click an empty slot to bring in a benched Pokemon.
 *
 * All of this is ephemeral local UI state (which actor is armed, which
 * slots are awaiting a target click, which side's bench picker is open) -
 * the actual battle mutations still go through battleLogActions, matching
 * the same "local useState for popover state, hook for real data" split
 * OpponentFieldPanel already uses for its own add-species popover.
 */

import { useState } from 'react';
import type { Battle, BattleSide, BroughtPokemonSnapshot, OpponentPokemonEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import { getTargetCategory } from '../../config/moveTargeting';
import { useDismissable } from '../../hooks/useDismissable';
import MoveLogPopover from './MoveLogPopover';

interface BattlefieldProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  gameDataState: UseGameDataReturn;
  resolveSprite: (remoteUrl: string) => string;
}

type ActiveMon = BroughtPokemonSnapshot | OpponentPokemonEntry;
type SlotRef = { side: BattleSide; pokemonId: string };

function EmptySlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Bring in a benched Pokemon"
      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-800 flex items-center justify-center text-gray-700 hover:border-gray-600 hover:text-gray-500 text-xs cursor-pointer transition-colors"
    >
      +
    </button>
  );
}

export default function Battlefield({ battle, battleLogActions, gameDataState, resolveSprite }: BattlefieldProps) {
  const [armed, setArmed] = useState<SlotRef | null>(null);
  const [pendingTarget, setPendingTarget] = useState<{ side: BattleSide; pokemonId: string; move: string; candidates: SlotRef[] } | null>(null);
  const [benchSide, setBenchSide] = useState<BattleSide | null>(null);

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

  const handleSlotClick = (side: BattleSide, pokemonId: string | undefined) => {
    if (!pokemonId) {
      setArmed(null);
      setPendingTarget(null);
      setBenchSide(prev => prev === side ? null : side);
      return;
    }
    if (pendingTarget) {
      finalizeTarget({ side, pokemonId });
      return;
    }
    setBenchSide(null);
    setArmed(prev => prev && prev.side === side && prev.pokemonId === pokemonId ? null : { side, pokemonId });
  };

  const renderSlot = (side: BattleSide, mon: ActiveMon | undefined, arrowAbove: boolean) => {
    if (!mon) {
      return <EmptySlot onClick={() => handleSlotClick(side, undefined)} />;
    }

    const isPlayer = 'nickname' in mon;
    const displayName = isPlayer ? (mon.nickname || mon.species) : mon.species;
    const gender = isPlayer ? (mon.gender || 'M') : 'M';
    const isArmed = armed?.side === side && armed.pokemonId === mon.id;
    const isCandidate = pendingTarget?.candidates.some(c => c.side === side && c.pokemonId === mon.id) ?? false;
    const isMega = battle.megaEvolvedIds.includes(mon.id);
    const switchedIn = switchedInIds.has(mon.id);
    const arrow = <span className="text-[10px] leading-none text-yellow-400">{arrowAbove ? '▼' : '▲'}</span>;

    return (
      <div key={mon.id} className="relative flex flex-col items-center gap-0.5">
        {arrowAbove && switchedIn && arrow}
        <button
          type="button"
          onClick={() => handleSlotClick(side, mon.id)}
          className={`relative rounded-lg p-1 cursor-pointer transition-colors ${
            isArmed ? 'bg-blue-600/30 ring-2 ring-blue-400' : isCandidate ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'hover:bg-gray-800/60'
          }`}
        >
          <img
            src={resolveSprite(getPixelSpriteUrl(mon.pokedexNumber, mon.species, gender, false))}
            alt={mon.species}
            className="w-20 h-20 object-contain [image-rendering:pixelated]"
          />
        </button>
        <span className={isPlayer ? 'text-xs text-blue-300' : 'text-xs text-red-300'}>{displayName}{isMega ? ' ⚡' : ''}</span>
        {!arrowAbove && switchedIn && arrow}

        <div className="flex gap-1">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); battleLogActions.switchActive(battle, side, mon.id); }}
            title="Bench this Pokemon"
            className="text-[9px] px-1 rounded bg-gray-900 text-gray-500 hover:text-gray-300 cursor-pointer"
          >
            Bench
          </button>
          {!isMega && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); battleLogActions.setMegaEvolved(battle, mon.id); }}
              title="Mark as Mega Evolved"
              className="text-[9px] px-1 rounded bg-gray-900 text-gray-500 hover:text-yellow-300 cursor-pointer"
            >
              Mega
            </button>
          )}
        </div>

        {isArmed && (
          <MoveLogPopover
            actorLabel={displayName}
            moves={mon.moves}
            allowFreeform={!isPlayer}
            onPickMove={move => handleMovePicked(side, mon.id, move)}
            onClose={() => setArmed(null)}
          />
        )}

        {benchSide === side && (
          <BenchPicker
            options={side === 'player' ? playerBench : opponentBench}
            resolveSprite={resolveSprite}
            onPick={id => { battleLogActions.switchActive(battle, side, id); setBenchSide(null); }}
            onClose={() => setBenchSide(null)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-6 rounded-lg bg-gray-900/60 border border-gray-800 flex-1">
      {pendingTarget && (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-600 text-[11px] text-yellow-300">
          Choose a target for {pendingTarget.move}...
          <button type="button" onClick={() => setPendingTarget(null)} className="text-yellow-400 hover:text-yellow-200 cursor-pointer">Cancel</button>
        </div>
      )}

      <div className="flex gap-6">
        {[0, 1].map(slot => (
          <div key={`opp-${slot}`} className="relative">{renderSlot('opponent', opponentActive[slot], true)}</div>
        ))}
      </div>

      <div className="w-full border-t border-dashed border-gray-800" />

      <div className="flex gap-6">
        {[0, 1].map(slot => (
          <div key={`player-${slot}`} className="relative">{renderSlot('player', playerActive[slot], false)}</div>
        ))}
      </div>
    </div>
  );
}

function BenchPicker({
  options, resolveSprite, onPick, onClose,
}: {
  options: (BroughtPokemonSnapshot | OpponentPokemonEntry)[];
  resolveSprite: (remoteUrl: string) => string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useDismissable<HTMLDivElement>(onClose);
  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-40 p-2 rounded-lg bg-gray-800 border-2 border-blue-500 shadow-lg flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Bring in</span>
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
