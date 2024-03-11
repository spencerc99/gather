export function ensureUnreachable(x: never): never {
  throw new Error(`Didn't expect to get here ${x}`);
}

export function ensureExists(x: string | null | undefined): string {
  if (x === null || x === undefined) {
    throw new Error(`Expected ${x} to exist`);
  }
  return x;
}

export function ensure(x: unknown, message: string): void {
  if (!x) {
    throw new Error(message);
  }
}
