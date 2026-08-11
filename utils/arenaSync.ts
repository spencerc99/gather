// ABOUTME: Identifies local collection connections that still need an Are.na push.
// ABOUTME: Prevents remote imports from scheduling redundant outbound sync work.
export function hasPendingArenaConnections(
  connections: Array<{ remoteCreatedAt?: Date | null }>,
): boolean {
  return connections.some((connection) => !connection.remoteCreatedAt);
}
