/**
 * pokepaste.ts - Pokepast.es Link Import/Export
 * Fetches a pasted pokepast.es URL's own JSON API (title/author/notes/paste)
 * so ImportTeamModal.tsx can pull a team's name, author, and raw Showdown
 * text directly from a link instead of requiring pasted export text. See
 * CLAUDE.md's external-integration policy for why this live fetch (and only
 * this endpoint shape) is allowed here - a same-day addition alongside this
 * feature, not an existing blanket allowance.
 *
 * createPokepaste() is the reverse direction: posts a team's Showdown export
 * text to pokepast.es/create and returns the new paste's URL. The POST
 * itself is proxied through the main process (window.electron.createPokepaste)
 * rather than called directly with fetch() here, because that endpoint's
 * response carries no CORS headers - see main.ts's pokepaste:create handler
 * for the full explanation and CLAUDE.md's external-integration policy for
 * the exception this falls under.
 */

import { formatShowdownText } from './parser';
import type { ShowdownPokemon } from '../types/pokemon';

export interface PokepasteData {
  title: string;
  author: string;
  notes: string;
  paste: string;
}

const POKEPASTE_URL_REGEX = /^https?:\/\/pokepast\.es\/([a-f0-9]+)\/?$/i;

/** Returns the paste id if `text` is (trimmed) exactly a pokepast.es link, else null. */
export function extractPokepasteId(text: string): string | null {
  const match = text.trim().match(POKEPASTE_URL_REGEX);
  return match ? match[1] : null;
}

export async function fetchPokepaste(id: string): Promise<PokepasteData> {
  const response = await fetch(`https://pokepast.es/${id}/json`);
  if (!response.ok) {
    throw new Error('Could not fetch that Pokepaste - check the link and try again');
  }
  return response.json();
}

/**
 * Best-effort Reg M-A/Reg M-B detection from the paste's own `notes` field
 * (commonly a "Format: gen9championsvgc2026regmb"-style string) - pokepast.es
 * doesn't guarantee a parseable convention here, so callers should keep
 * whatever format they already have selected when this returns null.
 */
export function detectRegulationFromNotes(notes: string): 'Reg M-A' | 'Reg M-B' | null {
  const match = /reg\s*m[\s-]?([ab])/i.exec(notes);
  if (!match) return null;
  return match[1].toLowerCase() === 'a' ? 'Reg M-A' : 'Reg M-B';
}

/**
 * Posts a team (or single Pokemon) to pokepast.es/create as Showdown export
 * text and returns the new paste's URL, or null on failure.
 */
export async function createPokepaste(
  pokemonList: ShowdownPokemon[],
  title?: string,
  author?: string,
  notes?: string
): Promise<string | null> {
  const paste = formatShowdownText(pokemonList);
  const result = await window.electron.createPokepaste({ paste, title, author, notes });
  return result as string | null;
}
