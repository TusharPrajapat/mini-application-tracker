/**
 * Hand-written Callback-to-Promise Utility (Part 3.1):
 * Wraps a traditional Node.js error-first callback function `(err, result) => void`
 * into a native JavaScript Promise without relying on `util.promisify` or third-party libraries.
 *
 * @param fn Function that accepts an error-first callback (err, result)
 * @returns A native JavaScript Promise resolving to result or rejecting with err
 */
export function promisifyCallback<T>(
  fn: (cb: (err: Error | null, result?: T) => void) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    fn((err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result as T);
    });
  });
}
