import { describe, it, expect } from 'vitest';
import { mergeCollection } from './merge';

interface Record_ {
  id: string;
  updatedAt: number;
  label: string;
}

function record(id: string, updatedAt: number, label = id): Record_ {
  return { id, updatedAt, label };
}

describe('mergeCollection', () => {
  it('keeps the newer record when both sides have it', () => {
    const existing = [record('a', 100, 'old')];
    const incoming = [record('a', 200, 'new')];
    const result = mergeCollection(existing, [], incoming, []);
    expect(result.records).toEqual([record('a', 200, 'new')]);
  });

  it('keeps the existing record when the incoming one is older', () => {
    const existing = [record('a', 200, 'server')];
    const incoming = [record('a', 100, 'stale')];
    const result = mergeCollection(existing, [], incoming, []);
    expect(result.records).toEqual([record('a', 200, 'server')]);
  });

  it('adds a record present on only one side', () => {
    const result = mergeCollection([record('a', 100)], [], [record('b', 200)], []);
    expect(result.records.map(r => r.id).sort()).toEqual(['a', 'b']);
  });

  it('a delete removes an older record and the tombstone survives', () => {
    const existing = [record('a', 100)];
    const incomingTombstones = [{ id: 'a', deletedAt: 200 }];
    const result = mergeCollection(existing, [], [], incomingTombstones);
    expect(result.records).toEqual([]);
    expect(result.tombstones).toEqual([{ id: 'a', deletedAt: 200 }]);
  });

  it('an edit after a delete resurrects the record and drops the stale tombstone', () => {
    const existingTombstones = [{ id: 'a', deletedAt: 100 }];
    const incoming = [record('a', 200, 'edited-after-delete')];
    const result = mergeCollection([], existingTombstones, incoming, []);
    expect(result.records).toEqual([record('a', 200, 'edited-after-delete')]);
    expect(result.tombstones).toEqual([]);
  });

  it('a delete after an edit still wins (delete newer than the edit)', () => {
    const existing = [record('a', 100, 'edited')];
    const incomingTombstones = [{ id: 'a', deletedAt: 200 }];
    const result = mergeCollection(existing, [], [], incomingTombstones);
    expect(result.records).toEqual([]);
    expect(result.tombstones).toEqual([{ id: 'a', deletedAt: 200 }]);
  });

  it('unions tombstones from both sides, keeping the newer deletedAt per id', () => {
    const existingTombstones = [{ id: 'a', deletedAt: 100 }];
    const incomingTombstones = [{ id: 'a', deletedAt: 50 }, { id: 'b', deletedAt: 300 }];
    const result = mergeCollection([], existingTombstones, [], incomingTombstones);
    expect(result.tombstones.sort((x, y) => x.id.localeCompare(y.id))).toEqual([
      { id: 'a', deletedAt: 100 },
      { id: 'b', deletedAt: 300 },
    ]);
  });

  it('a tombstone with no matching record on either side is a no-op beyond being retained', () => {
    const incomingTombstones = [{ id: 'never-existed', deletedAt: 100 }];
    const result = mergeCollection([], [], [], incomingTombstones);
    expect(result.records).toEqual([]);
    expect(result.tombstones).toEqual([{ id: 'never-existed', deletedAt: 100 }]);
  });
});
