export const isPromise = <T = unknown>(value: unknown): value is Promise<T> =>
  value !== null &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as any).then === 'function'
