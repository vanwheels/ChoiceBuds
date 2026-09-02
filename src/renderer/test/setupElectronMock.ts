/**
 * Vitest setup file - stubs `window.electron` (normally injected at runtime
 * by preload.ts's contextBridge) with vi.fn() mocks for every method, since
 * jsdom has no Electron main process behind it. Registered once via
 * vitest.config.ts's `setupFiles`, so every hook test that touches
 * window.electron starts from a known-empty state; reset before each test
 * so one test's `.mockResolvedValue(...)` never leaks into the next.
 *
 * Default resolutions mirror what a fresh, empty userData directory looks
 * like (reads resolve null, writes resolve true) - individual tests override
 * whichever calls they actually care about.
 */
import { beforeEach, vi } from 'vitest';

function createElectronMock() {
  return {
    readTeamsDatabase: vi.fn().mockResolvedValue(null),
    writeTeamsDatabase: vi.fn().mockResolvedValue(true),
    readPokeAPICache: vi.fn().mockResolvedValue(null),
    writePokeAPICache: vi.fn().mockResolvedValue(true),
    getUserDataPath: vi.fn().mockResolvedValue('/mock/userData'),
    readGameDataCache: vi.fn().mockResolvedValue(null),
    writeGameDataCache: vi.fn().mockResolvedValue(true),
    readBattlesDatabase: vi.fn().mockResolvedValue(null),
    writeBattlesDatabase: vi.fn().mockResolvedValue(true),
    readSavedPokemonDatabase: vi.fn().mockResolvedValue(null),
    writeSavedPokemonDatabase: vi.fn().mockResolvedValue(true),
    readSettings: vi.fn().mockResolvedValue(null),
    writeSettings: vi.fn().mockResolvedValue(true),
    openExternal: vi.fn().mockResolvedValue(undefined),
    getSpritePath: vi.fn().mockResolvedValue(null),
    downloadSprite: vi.fn().mockResolvedValue(null),
    createPokepaste: vi.fn().mockResolvedValue(null),
    onUpdateStatus: vi.fn().mockReturnValue(() => {}),
    installUpdate: vi.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  window.electron = createElectronMock() as unknown as typeof window.electron;
});
