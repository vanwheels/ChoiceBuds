/**
 * csv.ts - Minimal RFC4180-style CSV parser
 * Pure, offline, no dependencies - same "hand-rolled pure parser" precedent
 * as services/parser.ts, since no CSV library is in package.json and this
 * app's policy is direct fetches over third-party middleware anyway.
 * Handles quoted fields, embedded commas/newlines inside quotes, and
 * doubled-quote escaping (`""` -> `"`) - all of which Google Sheets' own
 * `gviz/tq?tqx=out:csv` export produces (see services/vgcPastes.ts, its
 * only caller so far).
 */

/**
 * Parses `text` into rows of fields. A trailing newline (or no trailing
 * newline at all) both produce no spurious empty final row.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
    } else if (char === ',') {
      endField();
      i++;
    } else if (char === '\r') {
      i++; // swallow - the following '\n' (or end of text) closes the row
    } else if (char === '\n') {
      endRow();
      i++;
    } else {
      field += char;
      i++;
    }
  }

  // Only flush a trailing partial row if there's actually content pending
  // (a real unterminated last line) - avoids an all-empty phantom row when
  // the text ends cleanly on a newline.
  if (field !== '' || row.length > 0) {
    endRow();
  }

  return rows;
}
