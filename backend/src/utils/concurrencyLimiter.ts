/**
 * Simple handwritten concurrency limiter (Part 3.2):
 * Processes an array of items with at most `limit` active async operations running concurrently.
 * Preserves input order and isolates per-item processing.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const concurrency = Math.max(1, Math.min(limit, items.length));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  //makes a single worker keep grabbing the next item until all items are done.
  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  }

  const workers: Promise<void>[] = [];
  // creates 5 workers working on the shared queue at the same time.
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}
