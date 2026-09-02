/**
 * Crash-safe JSON writes shared by every IPC handler/module that persists a
 * userData file (teams, caches, settings, window state, ...).
 */

import fs from 'fs/promises';

/**
 * Per-file write queues so concurrent writes to the same path never race on
 * the shared `.tmp` file below - two overlapping writers previously could
 * both write `<file>.tmp` and then have the second `rename` fail with ENOENT
 * because the first rename had already consumed it. Keyed by filePath so
 * writes to different files stay independent/concurrent.
 */
const writeQueues = new Map<string, Promise<void>>();

/**
 * Write to a temp file then rename over the target, so a crash/power-loss
 * mid-write can never leave one of these JSON files truncated to zero bytes
 * - a plain fs.writeFile truncates the destination before writing, which is
 * the window this closes. rename() is atomic on the same volume, which the
 * temp file always is since it's written alongside its target.
 */
export async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const previous = writeQueues.get(filePath) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(async () => {
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf-8');
    await fs.rename(tempPath, filePath);
  });
  writeQueues.set(filePath, run.catch(() => {}));
  return run;
}
