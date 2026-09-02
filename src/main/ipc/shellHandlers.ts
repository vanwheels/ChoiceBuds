/**
 * IPC handlers for delegating to OS-level shell operations.
 */

import { ipcMain, shell } from 'electron';

export function registerShellHandlers(): void {
  /**
   * Open a URL in the user's default system browser (e.g. a GitHub Release
   * link from the update checker) - never navigates the app's own window.
   */
  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
  });
}
