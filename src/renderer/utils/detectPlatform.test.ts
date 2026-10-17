import { describe, expect, it } from 'vitest';
import { detectPlatform } from './detectPlatform';

describe('detectPlatform', () => {
  it('detects macOS from a Safari/Chrome user agent', () => {
    expect(
      detectPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15'),
    ).toBe('mac');
  });

  it('detects Windows from a Chrome/Edge user agent', () => {
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')).toBe(
      'windows',
    );
  });

  it('defaults to windows for an unrecognized user agent', () => {
    expect(detectPlatform('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')).toBe('windows');
  });
});
