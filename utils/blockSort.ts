// ABOUTME: Builds the SQL ordering clauses used by Basket's block feeds.
// ABOUTME: Keeps added-time, connection-time, and remote-time ordering consistent.
import { SortType } from "./dataTypes";
import { ensure, ensureUnreachable } from "./react";

interface BlockSortColumns {
  remoteConnectedAt: string;
  connectedAt: string;
  lastConnectedAt: string;
}

export function getBlockSortClause(
  sortType: SortType,
  { remoteConnectedAt, connectedAt, lastConnectedAt }: BlockSortColumns,
  { seed }: { seed?: number } = {},
) {
  ensure(
    sortType !== SortType.Random || seed !== undefined,
    "Random sort requires a seed",
  );

  switch (sortType) {
    case SortType.Created:
      return `ORDER BY  MIN(COALESCE(${remoteConnectedAt}, blocks.created_timestamp), blocks.created_timestamp) DESC`;
    case SortType.Added:
      return "ORDER BY blocks.created_timestamp DESC, blocks.id DESC";
    case SortType.RecentlyConnected:
      return `ORDER BY ${lastConnectedAt} DESC, blocks.created_timestamp DESC, blocks.id DESC`;
    case SortType.RemoteCreated:
      // NOTE: local timestamp are stored as HH:MM:SS and remote_created_at is ISO timestamp, so we convert it to local to compare.
      return `ORDER BY  CASE WHEN ${remoteConnectedAt} IS NOT NULL THEN ${remoteConnectedAt} ELSE COALESCE(${connectedAt}, blocks.created_timestamp) END DESC`;
    case SortType.Random:
      // TODO: lol this doesn't work bc sin isn't supported on ios..need to wait until expo supports custom sqlite extensions
      // return `ORDER BY  SIN(blocks.id + ${seed})`;
      return "";
    default:
      return ensureUnreachable(sortType);
  }
}
