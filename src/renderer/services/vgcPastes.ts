/**
 * Network communication service for the public VGCPastes Google Sheet
 * (community-run repository of real tournament teams, crowd-sourced mostly
 * from Twitter/Discord). See CLAUDE.md's "Eighth exception" for the
 * project-policy authorization and docs/investigations/
 * vgcpastes-sourcing-scope.md for the scoping session this leg came out of.
 *
 * Fetches one regulation tab at a time via the sheet's own
 * `gviz/tq?tqx=out:csv&sheet=<tab>` CSV export endpoint (no auth, CORS-open
 * - confirmed live 2026-09-14, it echoes back whatever Origin sent the
 * request) and maps it to this app's own VgcPasteTeamRow shape, keeping
 * only rows the sheet itself flags `EVs == Yes` (per the scoping session's
 * reliability-filtering decision - a row without a confirmed real spread
 * isn't a trustworthy sample team for this catalog).
 *
 * Column layout below is FIXED-POSITION, not header-name-matched - verified
 * empirically live against all three current-game tabs (Champions M-A/M-B/
 * M-C all share one identical layout), same "verified empirically against
 * the live API, not guessed" precedent as services/championsBattleData.ts's
 * header comment. The sheet has no single reliable per-column header row
 * (its row 3 and row 4 both carry scattered/misaligned labels across
 * different columns, an artifact of merged cells and icon-only slot
 * columns) - a header-name lookup would be less reliable here than fixed
 * indices, not more. HEADER_ROW_INDEX's two cells are checked as a sanity
 * gate instead, so a future layout change fails loudly (a thrown error)
 * rather than silently misparsing every row.
 */

import { parseCsv } from '../utils/csv';
import type { RegulationLabel, VgcPasteTeamRow } from '../types/pokemon';

const SHEET_ID = '1axlwmzPA49rYkqXh7zHvAtSP-TKbM0ijGYBPRflLSWw';

const REGULATION_TO_SHEET_TAB: Record<RegulationLabel, string> = {
  'Reg M-A': 'Champions M-A',
  'Reg M-B': 'Champions M-B',
  'Reg M-C': 'Champions M-C',
};

// 0-indexed row/column positions, verified live 2026-09-14 - see file header.
const HEADER_ROW_INDEX = 2;
const FIRST_DATA_ROW_INDEX = 3;
const COL_TEAM_ID = 0;
const COL_DESCRIPTION = 1;
const COL_POKEPASTE_URL = 24;
const COL_EVS = 25;
const COL_DATE = 29;
const COL_TOURNAMENT = 30;
const COL_RANK = 31;
const COL_LINK_TO_SOURCE = 32;
const COL_REPORT_VIDEO = 33;
const COL_OTHER_LINKS = 34;
const COL_OWNER = 35;
const SPECIES_COLUMNS = [37, 38, 39, 40, 41, 42];

function buildSheetCsvUrl(regulation: RegulationLabel): string {
  const tab = REGULATION_TO_SHEET_TAB[regulation];
  const params = new URLSearchParams({ tqx: 'out:csv', sheet: tab });
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params.toString()}`;
}

/** Throws if the sheet's column layout no longer matches what this parser was built against. */
function assertKnownLayout(rows: string[][]): void {
  const header = rows[HEADER_ROW_INDEX];
  if (!header || header[COL_TEAM_ID] !== 'Team ID' || header[COL_POKEPASTE_URL] !== 'Pokepaste') {
    throw new Error('VGCPastes sheet layout has changed - column parsing needs updating');
  }
}

function toRow(cells: string[]): VgcPasteTeamRow | null {
  const id = cells[COL_TEAM_ID]?.trim();
  const pokepasteUrl = cells[COL_POKEPASTE_URL]?.trim();
  const hasEvs = cells[COL_EVS]?.trim() === 'Yes';
  if (!id || !pokepasteUrl || !hasEvs) return null;

  return {
    id,
    description: cells[COL_DESCRIPTION]?.trim() ?? '',
    owner: cells[COL_OWNER]?.trim() ?? '',
    tournament: cells[COL_TOURNAMENT]?.trim() ?? '',
    rank: cells[COL_RANK]?.trim() ?? '',
    date: cells[COL_DATE]?.trim() ?? '',
    pokepasteUrl,
    species: SPECIES_COLUMNS.map(col => cells[col]?.trim() ?? '').filter(Boolean),
    linkToSource: cells[COL_LINK_TO_SOURCE]?.trim() ?? '',
    reportVideo: cells[COL_REPORT_VIDEO]?.trim() ?? '',
    otherLinks: cells[COL_OTHER_LINKS]?.trim() ?? '',
  };
}

/** True for a sheet cell that's genuinely empty, or holds the sheet's own "-" placeholder for "not filled in". */
function isBlankSheetValue(value: string): boolean {
  return value.trim() === '' || value.trim() === '-';
}

/**
 * Builds the Notes text a catalog import (ImportTeamModal.tsx's `catalogRow`
 * prop) auto-populates the new team's `Team.notes` with - one line per
 * non-blank field, in sheet-column order (Tournament/Event, Rank, Link to
 * Source, Report/Video, Other Links). `Team.notes` is a plain string with no
 * rich-text/rendering anywhere in the app (TeamCard.tsx's Notes field is a
 * plain `<textarea>`), so "hyperlinked" per the original request just means
 * the bare URL as text - there's no markup to hyperlink it with. Returns
 * undefined (not an empty string) when every field is blank, matching
 * `Team.notes`'s own optional-field convention elsewhere.
 */
export function buildCatalogNotes(row: VgcPasteTeamRow): string | undefined {
  const lines: string[] = [];
  if (!isBlankSheetValue(row.tournament)) lines.push(`Tournament / Event: ${row.tournament}`);
  if (!isBlankSheetValue(row.rank)) lines.push(`Rank: ${row.rank}`);
  if (!isBlankSheetValue(row.linkToSource)) lines.push(`Link to Source: ${row.linkToSource}`);
  if (!isBlankSheetValue(row.reportVideo)) lines.push(`Report / Video: ${row.reportVideo}`);
  if (!isBlankSheetValue(row.otherLinks)) lines.push(`Other Links: ${row.otherLinks}`);
  return lines.length > 0 ? lines.join('\n') : undefined;
}

/**
 * Fetches and parses one regulation's VGCPastes sample-team rows, filtered
 * to `EVs == Yes` only. Throws on a network failure or an unrecognized
 * sheet layout - callers (useVgcPastesCache.ts) surface that as an error
 * state and leave any previously-cached rows untouched.
 */
export async function fetchVgcPasteRows(regulation: RegulationLabel): Promise<VgcPasteTeamRow[]> {
  const response = await fetch(buildSheetCsvUrl(regulation));
  if (!response.ok) {
    throw new Error(`VGCPastes sheet request failed with status ${response.status}`);
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);
  assertKnownLayout(rows);

  return rows
    .slice(FIRST_DATA_ROW_INDEX)
    .map(toRow)
    .filter((row): row is VgcPasteTeamRow => row !== null);
}
