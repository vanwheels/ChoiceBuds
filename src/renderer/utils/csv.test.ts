/**
 * Test suite for the CSV parser - covers plain rows, quoted fields with
 * embedded commas, doubled-quote escaping, and trailing-newline handling.
 */

import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses plain comma-separated rows', () => {
    const result = parseCsv('a,b,c\n1,2,3');
    expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('parses quoted fields containing commas', () => {
    const result = parseCsv('"Team, Description",owner\n"Louis, Markl","Louisvgc"');
    expect(result).toEqual([
      ['Team, Description', 'owner'],
      ['Louis, Markl', 'Louisvgc'],
    ]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const result = parseCsv('"He said ""hi""",plain');
    expect(result).toEqual([['He said "hi"', 'plain']]);
  });

  it('does not produce a phantom trailing row for a clean trailing newline', () => {
    const result = parseCsv('a,b\n1,2\n');
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('still parses a final row with no trailing newline', () => {
    const result = parseCsv('a,b\n1,2');
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('handles \\r\\n line endings', () => {
    const result = parseCsv('a,b\r\n1,2\r\n');
    expect(result).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('preserves empty fields', () => {
    const result = parseCsv('a,,c');
    expect(result).toEqual([['a', '', 'c']]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
