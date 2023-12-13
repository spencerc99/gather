export function ensureUnreachable(x: never): never {
  throw new Error(`Didn't expect to get here ${x}`);
}
