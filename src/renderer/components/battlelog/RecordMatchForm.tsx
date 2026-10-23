/**
 * RecordMatchForm.tsx - Post-Match Record
 * Replaces the old StartBattleFlow -> ActiveBattleView live-logging flow
 * (see src/renderer/_archived/battle-logger/README.md) with a single
 * ~30-second form: pick a Team, check which of the 6 were brought, add the
 * opponent Pokemon seen, record the result, jot a freeform note. Submits one
 * `addBattle` call.
 *
 * Still builds a full `Battle` object (not a new leaner type) so the
 * Statistics page and its aggregations in utils/battleStats.ts need zero
 * changes - the turn-log/field-state fields it doesn't populate are just
 * left at their empty defaults, same as a fresh live battle used to start.
 *
 * Doubles as the edit flow for an already-saved battle when `editingBattle`
 * is passed (see BattleLogPage.tsx/PastBattlesList.tsx): team/date/setId are
 * locked (Battle.playerRoster is a point-in-time snapshot, not a live
 * reference to the team, so there's no sound way to let the team change
 * mid-edit) and only brought selection, opponent roster, opponent name,
 * result, and notes are editable, persisted via `updateBattle` instead of
 * `addBattle`.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type {
  Battle,
  BroughtPokemonSnapshot,
  OpponentPokemonEntry,
  SpeciesRosterEntry,
  Team,
} from '../../types/pokemon';
import { getPixelSpriteUrl, MEGA_BADGE_ICON_URL } from '../../utils/spriteUrl';
import { setMegaEvolvedForSide, toggleMegaEvolvedIds } from '../../utils/battleMegaToggle';
import {
  formatMegaLabel,
  getMegaApiSlug,
  megaFormBadgeLetter,
  resolveOpponentMegaControl,
} from '../../config/megaEvolution';
import { useMegaSprite } from '../../hooks/useMegaSprite';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseBattlesReturn } from '../../hooks/useBattles';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { groupBattlesBySet, getSetOutcome } from '../../utils/battleSets';
import { toRegulationId } from '../../utils/pokemonRules';
import SpeciesPickerCard from '../SpeciesPickerCard';
import TeamPickerDropdown from '../TeamPickerDropdown';
import BroughtToggleTile from './BroughtToggleTile';

const MAX_BROUGHT = 4;
const MAX_OPPONENT_ROSTER_SIZE = 6;

/** Shared toggle logic for both brought-4 pickers below (player roster, opponent roster) - add up to `max` ids, remove on re-click. */
function toggleId(prev: string[], id: string, max: number): string[] {
  if (prev.includes(id)) return prev.filter((existing) => existing !== id);
  if (prev.length >= max) return prev;
  return [...prev, id];
}

interface RecordMatchFormProps {
  teamsState: UseTeamsReturn;
  battlesState: UseBattlesReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  onRecorded: () => void;
  onCancel: () => void;
  /** Registers this session's live opponent roster + write-back updater + own team id with the global Calc popup (Regular Calc Battle Log Integration Leg 3/4) - the effect below calls this on mount and on every roster/team change, and with `null` on unmount, so the floating Calc launcher always has the current battle's roster ready without needing a per-tile trigger. See App.tsx's battleLogSession doc. */
  registerBattleLogSession: (
    session: {
      roster: OpponentPokemonEntry[];
      onUpdateEntry: (entryId: string, updates: Partial<OpponentPokemonEntry>) => void;
      teamId?: string;
    } | null,
  ) => void;
  /** When set, the form edits this already-saved battle instead of creating a new one - see the header doc above. */
  editingBattle?: Battle;
}

function snapshotRoster(team: Team): BroughtPokemonSnapshot[] {
  return team.pokemon.map((p) => ({
    id: crypto.randomUUID(),
    species: p.showdownData.species,
    nickname: p.showdownData.nickname,
    ability: p.showdownData.ability,
    item: p.showdownData.item,
    teraType: p.showdownData.teraType,
    moves: p.showdownData.moves,
    gender: p.showdownData.gender,
    pokedexNumber: p.pokedexNumber,
    types: p.types,
    // Recomputed live, not read off the stored `p.spriteUrl` snapshot field -
    // that field is only rewritten on a FORM_DIVERGENT gender toggle
    // (EditablePokemonCore.tsx::handleGenderToggle), never on a shiny toggle,
    // so it silently goes stale for any other Pokemon whose shiny state
    // changed after import. Same stored-snapshot-vs-live-recompute bug class
    // as the old public-profile spriteUrl bug - see
    // .claude/rules/stored-snapshot-vs-live-recompute.md.
    spriteUrl: getPixelSpriteUrl(
      p.pokedexNumber,
      p.showdownData.species,
      p.showdownData.gender || 'M',
      p.showdownData.shiny,
    ),
    nature: p.showdownData.nature,
    evs: p.showdownData.evs,
    level: p.showdownData.level,
  }));
}

/** Mirrors the old useBattleLogActions.ts::startBattle Bo3-continuation rule: a non-blank opponent name joins the most recently-updated still-open set (undecided, not full, no in-progress member) against that name instead of starting a fresh one. */
function resolveSetId(battles: Battle[], opponentName: string): string {
  const trimmed = opponentName.trim();
  if (!trimmed) return crypto.randomUUID();

  const matchingSets = groupBattlesBySet(
    battles.filter((b) => b.opponentName?.trim().toLowerCase() === trimmed.toLowerCase()),
  );
  const openSet = matchingSets
    .filter((group) => {
      const outcome = getSetOutcome(group.battles);
      return !outcome.decided && group.battles.length < 3;
    })
    .sort(
      (a, b) =>
        Math.max(...b.battles.map((x) => x.updatedAt)) -
        Math.max(...a.battles.map((x) => x.updatedAt)),
    )[0];

  return openSet?.setId ?? crypto.randomUUID();
}

/** Builds the Battle object handleSave persists - pulled out to a plain top-level function (rather than inlined in the handler) so the id/timestamp generation reads as one deliberate snapshot step, same spirit as snapshotRoster above. */
function buildMatchRecord(args: {
  team: Team;
  playerRoster: BroughtPokemonSnapshot[];
  broughtIds: string[];
  opponentRoster: OpponentPokemonEntry[];
  opponentBroughtIds: string[];
  megaEvolvedIds: string[];
  opponentName: string;
  result: 'win' | 'loss';
  notes: string;
  existingBattles: Battle[];
}): Battle {
  const {
    team,
    playerRoster,
    broughtIds,
    opponentRoster,
    opponentBroughtIds,
    megaEvolvedIds,
    opponentName,
    result,
    notes,
    existingBattles,
  } = args;
  const trimmedName = opponentName.trim();
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    date: now,
    teamId: team.id,
    teamName: team.name,
    format: team.format,
    setId: resolveSetId(existingBattles, trimmedName),
    opponentName: trimmedName || undefined,
    playerRoster,
    broughtIds,
    playerActiveIds: [null, null],
    playerFaintedIds: [],
    opponentRoster,
    opponentBroughtIds,
    opponentActiveIds: [null, null],
    megaEvolvedIds,
    statStages: {},
    statusConditions: {},
    statusSetOnTurn: {},
    turns: [],
    fieldState: { playerSide: {}, opponentSide: {} },
    result,
    notes: notes.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export default function RecordMatchForm({
  teamsState,
  battlesState,
  speciesRosterState,
  spriteCacheState,
  onRecorded,
  onCancel,
  registerBattleLogSession,
  editingBattle,
}: RecordMatchFormProps) {
  const eligibleTeams = teamsState.teams.filter((t) => t.pokemon.length >= 4);
  const priorOpponentNames = Array.from(
    new Set(battlesState.battles.map((b) => b.opponentName).filter((n): n is string => !!n)),
  );

  const [teamId, setTeamId] = useState<string>('');
  const [opponentName, setOpponentName] = useState(editingBattle?.opponentName ?? '');
  const [broughtIds, setBroughtIds] = useState<string[]>(editingBattle?.broughtIds ?? []);
  const [opponentRoster, setOpponentRoster] = useState<OpponentPokemonEntry[]>(
    editingBattle?.opponentRoster ?? [],
  );
  const [opponentBroughtIds, setOpponentBroughtIds] = useState<string[]>(
    editingBattle?.opponentBroughtIds ?? [],
  );
  // ids (either roster) marked Mega Evolved this battle - mirrors
  // Battle.megaEvolvedIds (see types/battle.ts). Real VGC rule is at most
  // one Mega per side, enforced in toggleMegaEvolved below rather than left
  // to the user, since it's a hard game constraint rather than something
  // only the user watching the real battle can judge (unlike outcomes/notes
  // elsewhere in this flexible manual log).
  const [megaEvolvedIds, setMegaEvolvedIds] = useState<string[]>(
    editingBattle?.megaEvolvedIds ?? [],
  );
  // Snapshotted once per team selection (see handleSelectTeam) rather than
  // derived in render - snapshotRoster mints fresh crypto.randomUUID() ids,
  // so deriving it every render (as this used to) handed out new ids on
  // every re-render, including the one right after a brought-tile click:
  // the id just selected no longer matched anything, so no tile ever
  // visually showed as selected even though broughtIds.length was correct.
  const [playerRoster, setPlayerRoster] = useState<BroughtPokemonSnapshot[]>(
    editingBattle?.playerRoster ?? [],
  );
  const [isAddingOpponent, setIsAddingOpponent] = useState(false);
  const [result, setResult] = useState<'win' | 'loss' | null>(
    editingBattle && editingBattle.result !== 'in-progress' ? editingBattle.result : null,
  );
  const [notes, setNotes] = useState(editingBattle?.notes ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Edit mode locks the team - playerRoster is a point-in-time snapshot, not
  // a live reference, so the stored snapshot is used as-is rather than
  // re-derived from the (possibly since-changed) live team.
  const team = editingBattle
    ? teamsState.teams.find((t) => t.id === editingBattle.teamId)
    : eligibleTeams.find((t) => t.id === teamId);
  const rulesetFormat = editingBattle ? (team?.format ?? editingBattle.format) : team?.format;
  const canSave = editingBattle
    ? broughtIds.length > 0 && result !== null && !isSaving
    : !!team && broughtIds.length > 0 && result !== null && !isSaving;

  // Species Clause: no legal team fields the same species twice, so once a
  // species is on the opponent's observed roster it's removed from the
  // picker's own candidate list entirely (rather than left pickable-again
  // and disabled) - otherwise the same opponent Pokemon could be added a
  // second time and both entries independently marked brought, double-
  // counting one Pokemon in the opponent's brought-4.
  const opponentSpeciesSeen = new Set(opponentRoster.map((o) => o.species.toLowerCase()));
  const opponentPickerRoster = speciesRosterState.roster.filter(
    (s) => !opponentSpeciesSeen.has(s.name.toLowerCase()),
  );

  const handleSelectTeam = (nextTeamId: string) => {
    setTeamId(nextTeamId);
    setBroughtIds([]); // roster identity (crypto.randomUUID() ids) is re-rolled per snapshot, so a prior selection can't carry over
    const oldPlayerIds = new Set(playerRoster.map((p) => p.id));
    setMegaEvolvedIds((prev) => prev.filter((id) => !oldPlayerIds.has(id))); // same reason - a stale player-side Mega mark can't carry over either
    const nextTeam = eligibleTeams.find((t) => t.id === nextTeamId);
    setPlayerRoster(nextTeam ? snapshotRoster(nextTeam) : []);
  };

  const toggleBrought = (pokemonId: string) =>
    setBroughtIds((prev) => toggleId(prev, pokemonId, MAX_BROUGHT));
  const toggleOpponentBrought = (pokemonId: string) =>
    setOpponentBroughtIds((prev) => toggleId(prev, pokemonId, MAX_BROUGHT));

  /** Toggles pokemonId's Mega Evolved mark on the player side - a player's held item is always known/fixed (the team's own set), so renderPlayerMegaControl below already gated this to a species actually holding its own Mega Stone; no item reveal needed here. */
  const handlePlayerMegaToggle = (pokemonId: string) =>
    setMegaEvolvedIds((prev) =>
      toggleMegaEvolvedIds(
        prev,
        pokemonId,
        playerRoster.map((p) => p.id),
      ),
    );

  /** Toggles an opponent's Mega Evolved mark for an already-unambiguous form (single possible Mega, or a confirmed item that already pins it) - `revealItem` is the roster entry's held item to set first, if it isn't known yet, since declaring Mega IS revealing the stone (see resolveOpponentMegaControl's doc comment). */
  const handleOpponentMegaToggle = (pokemonId: string, revealItem: string | null) => {
    if (revealItem && !megaEvolvedIds.includes(pokemonId)) {
      setOpponentRoster((prev) =>
        prev.map((o) => (o.id === pokemonId ? { ...o, item: revealItem } : o)),
      );
    }
    setMegaEvolvedIds((prev) =>
      toggleMegaEvolvedIds(
        prev,
        pokemonId,
        opponentRoster.map((o) => o.id),
      ),
    );
  };

  /** Picks (or switches to) a specific Mega form for an opponent species with real X/Y/Z ambiguity - sets the roster entry's item to the chosen stone and marks Mega Evolved via setMegaEvolvedForSide (not a plain toggle, since the id may already be marked under a *different* form - a plain id-based toggle would just unmark it instead of reassigning). Re-clicking the currently-active form unmarks instead, mirroring the single-form toggle's behavior. */
  const handleOpponentMegaChoice = (pokemonId: string, chosenItem: string) => {
    const mon = opponentRoster.find((o) => o.id === pokemonId);
    const isActiveForm =
      megaEvolvedIds.includes(pokemonId) &&
      mon?.item?.trim().toLowerCase() === chosenItem.trim().toLowerCase();
    if (isActiveForm) {
      setMegaEvolvedIds((prev) => prev.filter((id) => id !== pokemonId));
      return;
    }
    setOpponentRoster((prev) =>
      prev.map((o) => (o.id === pokemonId ? { ...o, item: chosenItem } : o)),
    );
    setMegaEvolvedIds((prev) =>
      setMegaEvolvedForSide(
        prev,
        pokemonId,
        opponentRoster.map((o) => o.id),
      ),
    );
  };

  /** Shared Mega badge styling - same gold-circle treatment as the team card's MegaFormToggleBadge, just inline (BroughtToggleTile's trailing slot sits beside the tile, not overlaid on it). */
  function megaBadgeButton(args: {
    key?: string;
    isActive: boolean;
    onClick: () => void;
    title: string;
    content: ReactNode;
  }) {
    return (
      <button
        key={args.key}
        type="button"
        onClick={args.onClick}
        title={args.title}
        className={`w-5 h-5 flex items-center justify-center rounded-full border text-[10px] font-bold transition-colors cursor-pointer ${
          args.isActive
            ? 'bg-accent-gold border-accent-gold text-zinc-900'
            : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:border-accent-gold'
        }`}
      >
        {args.content}
      </button>
    );
  }

  const megaIcon = (
    <img src={spriteCacheState.resolveSprite(MEGA_BADGE_ICON_URL)} alt="Mega" className="w-3 h-3" />
  );

  /** Only rendered for a player Pokemon currently holding its own Mega Stone - a different held item (or none) means there's nothing to toggle, so this returns null rather than an always-visible control every roster slot would otherwise get. */
  const renderPlayerMegaControl = (p: BroughtPokemonSnapshot) => {
    const slug = getMegaApiSlug(p.item, p.species);
    if (!slug) return null;
    const isMega = megaEvolvedIds.includes(p.id);
    return megaBadgeButton({
      isActive: isMega,
      onClick: () => handlePlayerMegaToggle(p.id),
      title: isMega ? 'Mega Evolved - click to unmark' : 'Mark as Mega Evolved',
      content: megaIcon,
    });
  };

  /** See resolveOpponentMegaControl's doc comment for the full policy (hidden/single/choice). */
  const renderOpponentMegaControl = (o: OpponentPokemonEntry) => {
    const control = resolveOpponentMegaControl(o.species, o.item);
    if (control.kind === 'none') return null;

    if (control.kind === 'single') {
      const isMega = megaEvolvedIds.includes(o.id);
      return megaBadgeButton({
        isActive: isMega,
        onClick: () => handleOpponentMegaToggle(o.id, control.revealItem),
        title: isMega ? 'Mega Evolved - click to unmark' : 'Mark as Mega Evolved',
        content: megaIcon,
      });
    }

    return (
      <div className="flex gap-0.5">
        {control.options.map((option) => {
          const isActive =
            megaEvolvedIds.includes(o.id) &&
            o.item?.trim().toLowerCase() === option.item.toLowerCase();
          return megaBadgeButton({
            key: option.slug,
            isActive,
            onClick: () => handleOpponentMegaChoice(o.id, option.item),
            title: formatMegaLabel(o.species, option.suffix),
            content: megaFormBadgeLetter(option.suffix),
          });
        })}
      </div>
    );
  };

  // Mega sprite swap for a declared Mega - same useMegaSprite hook the team
  // card's Mega Team Card Flip uses. At most one Pokemon per side can be
  // marked (megaEvolvedIds' own invariant), so these are two plain hook
  // calls rather than one per roster item (Rules of Hooks forbids the
  // latter inside the .map() calls below).
  const playerMegaMon = playerRoster.find((p) => megaEvolvedIds.includes(p.id)) ?? null;
  const playerMegaSlug = playerMegaMon
    ? getMegaApiSlug(playerMegaMon.item, playerMegaMon.species)
    : null;
  const playerMegaSprite = useMegaSprite(playerMegaSlug);

  const opponentMegaMon = opponentRoster.find((o) => megaEvolvedIds.includes(o.id)) ?? null;
  const opponentMegaSlug = opponentMegaMon
    ? getMegaApiSlug(opponentMegaMon.item, opponentMegaMon.species)
    : null;
  const opponentMegaSprite = useMegaSprite(opponentMegaSlug);

  const handleAddOpponent = (species: SpeciesRosterEntry) => {
    setIsAddingOpponent(false);
    setOpponentRoster((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        species: species.name,
        pokedexNumber: species.id,
        spriteUrl: species.spriteUrl,
        types: [],
        moves: [],
        fainted: false,
        addedAt: Date.now(),
      },
    ]);
  };

  const removeOpponent = (id: string) => {
    setOpponentRoster((prev) => prev.filter((o) => o.id !== id));
    setOpponentBroughtIds((prev) => prev.filter((broughtId) => broughtId !== id)); // drop a stale brought-selection if its entry is removed entirely
    setMegaEvolvedIds((prev) => prev.filter((megaId) => megaId !== id)); // drop a stale Mega mark the same way
  };

  /** Merges Calc-reported moves/ability/item back into a specific opponent-roster entry by id, whenever the global Calc popup's write-back link points at it (Regular Calc Battle Log Integration Leg 2, now dispatched by entryId via registerBattleLogSession's onUpdateEntry rather than a per-tile-bound closure - Leg 3). Moves union rather than overwrite (case-insensitive, since `OpponentPokemonEntry.moves` is a growable tag list, not the Calc grid's fixed 4 slots) - ability/item overwrite directly since they're single values. Wrapped in useCallback so the registration effect below doesn't re-register on every unrelated render. */
  const handleCalcUpdate = useCallback(
    (entryId: string, updates: Partial<OpponentPokemonEntry>) => {
      setOpponentRoster((prev) =>
        prev.map((o) => {
          if (o.id !== entryId) return o;
          const next = { ...o };
          if (updates.ability !== undefined) next.ability = updates.ability;
          if (updates.item !== undefined) next.item = updates.item;
          if (updates.moves !== undefined) {
            const existingLower = new Set(o.moves.map((m) => m.toLowerCase()));
            next.moves = [
              ...o.moves,
              ...updates.moves.filter((m) => !existingLower.has(m.toLowerCase())),
            ];
          }
          return next;
        }),
      );
    },
    [setOpponentRoster],
  );

  // Keeps the global Calc popup's opponent-roster snapshot (and this
  // session's own team id, so Calc's Pokemon 1 side can default its "Load
  // from Team" tray to the team actually being played - Regular Calc
  // Battle Log Integration Leg 4) live - registers on mount and
  // re-registers on every roster/team change so CalcOpponentTray always
  // reflects this session's current roster the instant Calc is opened,
  // then clears the registration on unmount so a stale closure over this
  // form's own setOpponentRoster never survives it. `registerBattleLogSession`'s
  // identity must stay stable (App.tsx passes its raw useState setter) -
  // an unstable one here would re-register every render.
  useEffect(() => {
    registerBattleLogSession({
      roster: opponentRoster,
      onUpdateEntry: handleCalcUpdate,
      teamId: team?.id,
    });
    return () => registerBattleLogSession(null);
  }, [opponentRoster, handleCalcUpdate, registerBattleLogSession, team?.id]);

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);

    const trimmedName = opponentName.trim();
    const trimmedNotes = notes.trim();

    const success = editingBattle
      ? await battlesState.updateBattle(editingBattle.id, {
          broughtIds,
          opponentRoster,
          opponentBroughtIds,
          megaEvolvedIds,
          opponentName: trimmedName || undefined,
          result,
          notes: trimmedNotes || undefined,
        })
      : team
        ? await battlesState.addBattle(
            buildMatchRecord({
              team,
              playerRoster,
              broughtIds,
              opponentRoster,
              opponentBroughtIds,
              megaEvolvedIds,
              opponentName,
              result,
              notes,
              existingBattles: battlesState.battles,
            }),
          )
        : false;

    setIsSaving(false);
    if (success) onRecorded();
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl px-4 md:px-0">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-100">
          {editingBattle ? 'Edit Match' : 'Record a Match'}
        </h2>
        <button onClick={onCancel} className="text-sm text-zinc-400 hover:text-zinc-200">
          Cancel
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Team</label>
        {editingBattle ? (
          // Locked in edit mode - playerRoster is a snapshot tied to this team, so it can't be reselected (see header doc).
          <p className="text-sm text-zinc-100">
            {editingBattle.teamName} ({editingBattle.format})
          </p>
        ) : eligibleTeams.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No saved teams with at least 4 Pokemon yet - build one in the Teams tab first.
          </p>
        ) : (
          <TeamPickerDropdown
            teams={eligibleTeams}
            selectedTeamId={teamId}
            onSelect={handleSelectTeam}
            resolveSprite={spriteCacheState.resolveSprite}
          />
        )}
      </div>

      {(editingBattle || team) && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Brought ({broughtIds.length}/{MAX_BROUGHT})
          </label>
          <div className="flex flex-wrap gap-2">
            {playerRoster.map((p) => (
              <BroughtToggleTile
                key={p.id}
                spriteUrl={
                  p.id === playerMegaMon?.id && playerMegaSprite
                    ? p.spriteUrl.includes('/shiny/')
                      ? playerMegaSprite.shinySpriteUrl
                      : playerMegaSprite.spriteUrl
                    : p.spriteUrl
                }
                resolveSprite={spriteCacheState.resolveSprite}
                label={p.nickname || p.species}
                selected={broughtIds.includes(p.id)}
                onToggle={() => toggleBrought(p.id)}
                trailing={renderPlayerMegaControl(p)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Opponent's Team ({opponentRoster.length}/{MAX_OPPONENT_ROSTER_SIZE}) · Brought (
          {opponentBroughtIds.length}/{MAX_BROUGHT})
        </label>
        <div className="flex flex-wrap gap-2">
          {opponentRoster.map((o) => (
            <BroughtToggleTile
              key={o.id}
              spriteUrl={
                o.id === opponentMegaMon?.id && opponentMegaSprite
                  ? opponentMegaSprite.spriteUrl
                  : o.spriteUrl
              }
              resolveSprite={spriteCacheState.resolveSprite}
              label={o.species}
              selected={opponentBroughtIds.includes(o.id)}
              onToggle={() => toggleOpponentBrought(o.id)}
              trailing={
                <>
                  {renderOpponentMegaControl(o)}
                  <button
                    onClick={() => removeOpponent(o.id)}
                    title="Remove"
                    className="text-zinc-500 hover:text-red-400 cursor-pointer"
                  >
                    ×
                  </button>
                </>
              }
            />
          ))}
          {opponentRoster.length < MAX_OPPONENT_ROSTER_SIZE &&
            (isAddingOpponent ? (
              <SpeciesPickerCard
                roster={opponentPickerRoster}
                rulesetId={toRegulationId(rulesetFormat ?? 'Reg M-B')}
                resolveSprite={spriteCacheState.resolveSprite}
                onSelect={handleAddOpponent}
                onClose={() => setIsAddingOpponent(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingOpponent(true)}
                className="px-3 py-2 rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-xs"
              >
                + Add Opponent Pokemon
              </button>
            ))}
        </div>
      </div>

      <div>
        <label htmlFor="opponentName" className="block text-sm font-medium text-zinc-300 mb-2">
          Opponent Name{' '}
          {!editingBattle && (
            <span className="text-zinc-500 font-normal">
              (optional - type the same name again to continue a Bo3 set)
            </span>
          )}
        </label>
        <input
          id="opponentName"
          type="text"
          list="prior-opponent-names"
          value={opponentName}
          onChange={(e) => setOpponentName(e.target.value)}
          placeholder="Who did you play?"
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold"
        />
        <datalist id="prior-opponent-names">
          {priorOpponentNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Result</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setResult('win')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${result === 'win' ? 'bg-green-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
          >
            Win
          </button>
          <button
            type="button"
            onClick={() => setResult('loss')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${result === 'loss' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
          >
            Loss
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-300 mb-2">
          Notes <span className="text-zinc-500 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything worth remembering about this match..."
          className="w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="px-4 py-2 rounded-lg bg-accent-gold hover:bg-accent-gold-deep disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {editingBattle ? 'Save Changes' : 'Save Match'}
      </button>
    </div>
  );
}
