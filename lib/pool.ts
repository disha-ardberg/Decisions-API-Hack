export function getMaxConcurrency(): number {
  const raw = typeof document === "undefined"
    ? process.env.MAX_CONCURRENCY
    : document.querySelector('meta[name="panel-max-concurrency"]')?.getAttribute("content");
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4;
}

export type PoolControl = {
  rateLimited: () => void;
  currentLimit: () => number;
};

/** Results keep input order; a 429 lowers the limit for subsequent tasks. */
export async function runWithConcurrency<T>(
  tasks: Array<(control: PoolControl) => Promise<T>>,
  limit = getMaxConcurrency(),
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;
  let activeLimit = Math.min(Math.max(1, limit), tasks.length);
  const control: PoolControl = {
    rateLimited: () => { activeLimit = Math.max(1, activeLimit - 1); },
    currentLimit: () => activeLimit,
  };

  async function worker(workerIndex: number) {
    while (next < tasks.length && workerIndex < activeLimit) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i](control) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from({ length: activeLimit }, (_, index) => worker(index));
  await Promise.all(workers);
  return results;
}
