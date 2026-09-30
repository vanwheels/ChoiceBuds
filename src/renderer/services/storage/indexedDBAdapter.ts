/**
 * StorageAdapter backed by IndexedDB, for the web build (no Electron
 * process/userData directory to write files into there). One database
 * ("choicebuds"), one object store ("kv") keyed directly by StorageKey -
 * no per-resource object stores, since the value shapes are already
 * self-describing JSON and a single store is simpler to version.
 */

import type { StorageAdapter, StorageKey } from './StorageAdapter';

const DB_NAME = 'choicebuds';
const STORE_NAME = 'kv';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDBStorageAdapter implements StorageAdapter {
  // Closes the connection after every call rather than caching it - this
  // adapter's calls are infrequent (a handful per app session, same as the
  // Electron adapter's file reads/writes), so there's no meaningful cost to
  // reopening, and it avoids leaving a dangling connection around that
  // would otherwise block a later indexedDB.deleteDatabase (e.g. tests
  // resetting state between cases).
  async read<T>(key: StorageKey): Promise<T | null> {
    const db = await openDB();
    try {
      return await new Promise<T | null>((resolve, reject) => {
        const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
        request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async write<T>(key: StorageKey, value: T): Promise<boolean> {
    const db = await openDB();
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put(value, key);
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }
}
