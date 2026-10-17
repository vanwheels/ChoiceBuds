/**
 * detectPlatform.ts - Desktop OS Sniffing for the Web Download Page
 * Only Windows and macOS installers exist (see package.json's electron-builder
 * `win`/`mac` targets), so this is a binary call, not a full OS taxonomy -
 * anything that isn't a Mac user agent defaults to Windows, the more common
 * desktop OS, same as DownloadPage.tsx's own fallback for the "other OS" link.
 */

export type DetectedPlatform = 'windows' | 'mac';

export function detectPlatform(userAgent: string): DetectedPlatform {
  return /Mac OS X|Macintosh/i.test(userAgent) ? 'mac' : 'windows';
}
