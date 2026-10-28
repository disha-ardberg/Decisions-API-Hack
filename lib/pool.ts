/**
 * Runs task factories with at most `limit` in flight. Results keep input order and
 * one rejection never cancels the others. Isomorphic: used by the server pipeline and the browser.
 */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit = 5,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await tasks[i]() };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(Math.max(1, limit), tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}
