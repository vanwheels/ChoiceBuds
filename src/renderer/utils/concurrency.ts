/**
 * Generic bounded-concurrency runner - shared by useInitialSync.ts and
 * useUsageSync.ts, both of which need to walk a batch of species/items
 * through a network-bound worker without firing every request at once.
 * A single failing item is skipped, not fatal to the rest of the batch.
 */
export async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  onTick: () => void,
  worker: (item: T) => Promise<unknown>
): Promise<void> {
  let index = 0;
  async function runNext(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    try {
      await worker(items[current]);
    } catch {
      // Per-item failures are skipped, not fatal to the overall sync
    } finally {
      onTick();
    }
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
}
