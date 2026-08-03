// ABOUTME: Verifies the database ordering clauses used by Basket's text feeds.
// ABOUTME: Covers each supported block sort and its required ordering timestamp.
import { describe, expect, it } from "@jest/globals";
import { SortType } from "./dataTypes";
import { getBlockSortClause } from "./blockSort";

const columns = {
  remoteConnectedAt: "connection.remote_connected_at",
  connectedAt: "connection.created_timestamp",
  lastConnectedAt: "connections.last_connected_at",
};

describe("getBlockSortClause", () => {
  it("preserves the established created ordering", () => {
    expect(getBlockSortClause(SortType.Created, columns)).toBe(
      "ORDER BY  MIN(COALESCE(connection.remote_connected_at, blocks.created_timestamp), blocks.created_timestamp) DESC",
    );
  });

  it("orders Added time by the time each block was added", () => {
    expect(getBlockSortClause(SortType.Added, columns)).toBe(
      "ORDER BY blocks.created_timestamp DESC, blocks.id DESC",
    );
  });

  it("orders Recently connected by the latest connection across channels", () => {
    expect(getBlockSortClause(SortType.RecentlyConnected, columns)).toBe(
      "ORDER BY connections.last_connected_at DESC, blocks.created_timestamp DESC, blocks.id DESC",
    );
  });

  it("preserves remote collection ordering", () => {
    expect(getBlockSortClause(SortType.RemoteCreated, columns)).toBe(
      "ORDER BY  CASE WHEN connection.remote_connected_at IS NOT NULL THEN connection.remote_connected_at ELSE COALESCE(connection.created_timestamp, blocks.created_timestamp) END DESC",
    );
  });

  it("requires a seed when random ordering is requested", () => {
    expect(() => getBlockSortClause(SortType.Random, columns)).toThrow(
      "Random sort requires a seed",
    );
  });

  it("leaves randomized ordering to the caller once a seed is supplied", () => {
    expect(getBlockSortClause(SortType.Random, columns, { seed: 1 })).toBe("");
  });
});
