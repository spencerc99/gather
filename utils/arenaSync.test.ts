// ABOUTME: Verifies only local collection connections schedule an Are.na push.
// ABOUTME: Covers local, imported, and mixed batches of connection records.
import { describe, expect, it } from "@jest/globals";
import { hasPendingArenaConnections } from "./arenaSync";

describe("Are.na sync scheduling", () => {
  it("does not schedule imported remote connections", () => {
    expect(
      hasPendingArenaConnections([
        { remoteCreatedAt: new Date("2026-08-10T00:00:00Z") },
      ]),
    ).toBe(false);
  });

  it("schedules local and mixed connection batches", () => {
    expect(hasPendingArenaConnections([{}])).toBe(true);
    expect(
      hasPendingArenaConnections([
        { remoteCreatedAt: new Date("2026-08-10T00:00:00Z") },
        { remoteCreatedAt: null },
      ]),
    ).toBe(true);
  });
});
