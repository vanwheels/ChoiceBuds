/**
 * Test suite for vgcPastes.ts's row-mapping/filtering logic. Exercises
 * fetchVgcPasteRows() against a small fixture CSV string shaped like a real
 * VGCPastes sheet export (junk rows, the real header at row index 2, then
 * data rows) rather than a live network call.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchVgcPasteRows } from './vgcPastes';

/** Builds one fixture data row with the real sheet's column layout (43 columns, 0-42). */
function buildRow(overrides: {
  teamId?: string;
  description?: string;
  pokepasteUrl?: string;
  evs?: string;
  date?: string;
  tournament?: string;
  rank?: string;
  owner?: string;
  species?: string[];
}): string {
  const cells = new Array(43).fill('');
  cells[0] = overrides.teamId ?? 'MC001';
  cells[1] = overrides.description ?? 'A sample team';
  cells[24] = overrides.pokepasteUrl ?? 'https://pokepast.es/abc123';
  cells[25] = overrides.evs ?? 'Yes';
  cells[29] = overrides.date ?? '13 Sep 2026';
  cells[30] = overrides.tournament ?? 'Some Regional';
  cells[31] = overrides.rank ?? 'Top 8';
  cells[35] = overrides.owner ?? 'SomeOwner';
  (overrides.species ?? ['Raichu-Mega-Y', 'Staraptor-Mega', 'Rillaboom', 'Gholdengo', 'Sylveon', 'Incineroar'])
    .forEach((species, i) => { cells[37 + i] = species; });
  return cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
}

const HEADER_ROW = '"Team ID","Team Description"' + ',""'.repeat(41);
const patchedHeader = (() => {
  const cells = HEADER_ROW.split(',');
  cells[24] = '"Pokepaste"';
  return cells.join(',');
})();

function buildFixtureCsv(dataRows: string[]): string {
  return [
    'junk row 1',
    'junk row 2',
    patchedHeader,
    ...dataRows,
  ].join('\n');
}

describe('fetchVgcPasteRows', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(csvBody: string, ok = true, status = 200) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok,
      status,
      text: () => Promise.resolve(csvBody),
    }));
  }

  it('keeps only EVs == Yes rows', async () => {
    const csv = buildFixtureCsv([
      buildRow({ teamId: 'MC001', evs: 'Yes' }),
      buildRow({ teamId: 'MC002', evs: 'No' }),
      buildRow({ teamId: 'MC003', evs: '' }),
    ]);
    stubFetch(csv);

    const rows = await fetchVgcPasteRows('Reg M-C');
    expect(rows.map(r => r.id)).toEqual(['MC001']);
  });

  it('skips rows with no Team ID or no Pokepaste URL even if EVs == Yes', async () => {
    const csv = buildFixtureCsv([
      buildRow({ teamId: '', evs: 'Yes' }),
      buildRow({ teamId: 'MC010', pokepasteUrl: '', evs: 'Yes' }),
      buildRow({ teamId: 'MC011', evs: 'Yes' }),
    ]);
    stubFetch(csv);

    const rows = await fetchVgcPasteRows('Reg M-C');
    expect(rows.map(r => r.id)).toEqual(['MC011']);
  });

  it('maps every field, trimmed, to VgcPasteTeamRow', async () => {
    const csv = buildFixtureCsv([
      buildRow({
        teamId: 'MC254',
        description: "MichaelderBeste's VR September Challenge Champion Team",
        pokepasteUrl: 'https://pokepast.es/421ae13bcb967417',
        date: '13 Sep 2026',
        tournament: 'VR Septembeer Challenge',
        rank: 'Champion',
        owner: 'MichaelderBeste',
        species: ['Raichu-Mega-Y', 'Staraptor-Mega', 'Arcanine-Hisui', 'Rillaboom', 'Gholdengo', 'Sylveon'],
      }),
    ]);
    stubFetch(csv);

    const rows = await fetchVgcPasteRows('Reg M-C');
    expect(rows).toEqual([{
      id: 'MC254',
      description: "MichaelderBeste's VR September Challenge Champion Team",
      owner: 'MichaelderBeste',
      tournament: 'VR Septembeer Challenge',
      rank: 'Champion',
      date: '13 Sep 2026',
      pokepasteUrl: 'https://pokepast.es/421ae13bcb967417',
      species: ['Raichu-Mega-Y', 'Staraptor-Mega', 'Arcanine-Hisui', 'Rillaboom', 'Gholdengo', 'Sylveon'],
    }]);
  });

  it('throws when the sheet layout no longer matches the expected header', async () => {
    stubFetch('junk\njunk\n"Not The Header","Something"');
    await expect(fetchVgcPasteRows('Reg M-C')).rejects.toThrow(/layout/i);
  });

  it('throws on a non-OK response', async () => {
    stubFetch('', false, 500);
    await expect(fetchVgcPasteRows('Reg M-C')).rejects.toThrow(/500/);
  });
});
