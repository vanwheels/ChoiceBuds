/**
 * clipboardPayload.ts - Internal JSON Clipboard Format for Copy/Paste
 * Quick Copy/Paste Pokémon & Teams via Right-Click Leg 1 (see TODO.md).
 * Carries a full ImportedPokemonInfo or Team on the system clipboard as
 * signed JSON - a lossless round-trip of every field the type carries
 * (including e.g. `favorite`, and whatever a future saved-build-link field
 * adds), since the whole object is spread through rather than a hand-picked
 * subset of fields. This is deliberately NOT the Showdown-text/Pokepaste
 * format ExportTeamModal.tsx produces - that's for interop with other apps
 * and necessarily lossy (no id/pokedexNumber/spriteUrl/etc.); this format
 * only round-trips through ChoiceBuds itself.
 *
 * SIGNATURE lets a paste tell "our own JSON" apart from anything else that
 * happens to be on the clipboard (arbitrary copied text, another app's
 * JSON) - readers return null for anything that isn't a recognized payload
 * rather than throwing, same "malformed/foreign payload - ignore" posture
 * the drag-and-drop handlers already use for cross-team/cross-context drops.
 */

import type { ImportedPokemonInfo, Team } from '../types/pokemon';

const SIGNATURE = 'choicebuds-clipboard';
const SCHEMA_VERSION = 1;

interface PokemonClipboardPayload {
  signature: typeof SIGNATURE;
  kind: 'pokemon';
  version: number;
  data: ImportedPokemonInfo;
}

interface TeamClipboardPayload {
  signature: typeof SIGNATURE;
  kind: 'team';
  version: number;
  data: Team;
}

type ClipboardPayload = PokemonClipboardPayload | TeamClipboardPayload;

export async function copyPokemonToClipboard(pokemon: ImportedPokemonInfo): Promise<void> {
  const payload: PokemonClipboardPayload = { signature: SIGNATURE, kind: 'pokemon', version: SCHEMA_VERSION, data: pokemon };
  await navigator.clipboard.writeText(JSON.stringify(payload));
}

export async function copyTeamToClipboard(team: Team): Promise<void> {
  const payload: TeamClipboardPayload = { signature: SIGNATURE, kind: 'team', version: SCHEMA_VERSION, data: team };
  await navigator.clipboard.writeText(JSON.stringify(payload));
}

/** Null when the clipboard doesn't hold a ChoiceBuds Pokémon payload (foreign content, or a copied Team). */
export async function readPokemonFromClipboard(): Promise<ImportedPokemonInfo | null> {
  const payload = await readPayload();
  return payload?.kind === 'pokemon' ? payload.data : null;
}

/** Null when the clipboard doesn't hold a ChoiceBuds Team payload (foreign content, or a copied Pokémon). */
export async function readTeamFromClipboard(): Promise<Team | null> {
  const payload = await readPayload();
  return payload?.kind === 'team' ? payload.data : null;
}

async function readPayload(): Promise<ClipboardPayload | null> {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text);
    if (!parsed || parsed.signature !== SIGNATURE || !parsed.data) return null;
    if (parsed.kind !== 'pokemon' && parsed.kind !== 'team') return null;
    return parsed as ClipboardPayload;
  } catch {
    // Not JSON, or JSON.parse threw for some other reason (empty clipboard,
    // clipboard permission denied, etc.) - foreign/unreadable clipboard
    // content is a no-op for the caller, not an error.
    return null;
  }
}
