// ABOUTME: Implements Are.na pull storage operations against Gather's SQLite database.
// ABOUTME: Supports the same remote import behavior with or without mounted React providers.
import * as SQLite from "expo-sqlite";
import { DatabaseBlockInsert } from "./dataTypes";
import { ArenaPullCollection, ArenaPullStore } from "./arenaPull";

export function openArenaPullDatabase(): SQLite.SQLiteDatabase {
  return SQLite.openDatabaseSync("db.db");
}

export function createArenaPullStore(
  database: SQLite.SQLiteDatabase,
): ArenaPullStore {
  return {
    async getCollections(): Promise<ArenaPullCollection[]> {
      const rows = await database.getAllAsync<{
        id: number;
        title: string;
        updated_timestamp: string;
        arena_id: string;
      }>(
        `SELECT id, title, updated_timestamp, arena_id
         FROM collections
         WHERE remote_source_type = 'Arena'
           AND remote_source_info IS NOT NULL
           AND arena_id IS NOT NULL;`,
      );
      return rows.map((row) => ({
        id: row.id.toString(),
        title: row.title,
        updatedAt: new Date(row.updated_timestamp),
        channelId: row.arena_id.toString(),
      }));
    },

    async getLastRemoteItem(collectionId) {
      const row = await database.getFirstAsync<{
        arena_id: string;
        remote_created_at: string;
      }>(
        `SELECT blocks.arena_id, connections.remote_created_at
         FROM blocks
         INNER JOIN connections ON connections.block_id = blocks.id
         WHERE connections.collection_id = ?
           AND connections.remote_created_at IS NOT NULL
           AND blocks.deletion_timestamp IS NULL
         ORDER BY connections.remote_created_at DESC
         LIMIT 1;`,
        [collectionId],
      );
      return row
        ? {
            arenaId: row.arena_id.toString(),
            connectedAt: row.remote_created_at,
          }
        : null;
    },

    async updateCollectionTitle(collectionId, title) {
      await database.runAsync(
        `UPDATE collections
         SET title = ?, updated_timestamp = CURRENT_TIMESTAMP
         WHERE id = ?;`,
        [title, collectionId],
      );
    },

    async getExistingArenaIds(arenaIds) {
      if (arenaIds.length === 0) {
        return new Set<string>();
      }
      const placeholders = arenaIds.map(() => "?").join(", ");
      const rows = await database.getAllAsync<{ arena_id: string }>(
        `SELECT arena_id
         FROM blocks
         WHERE arena_id IN (${placeholders})
           AND deletion_timestamp IS NULL;`,
        arenaIds,
      );
      return new Set(rows.map((row) => row.arena_id.toString()));
    },

    async insertBlocks(collectionId, blocks) {
      let itemsAdded = 0;
      await database.withExclusiveTransactionAsync(async (transaction) => {
        for (const block of blocks) {
          const blockId = await insertBlock(transaction, block);
          if (blockId.created) {
            itemsAdded += 1;
          }
          if (!block.remoteConnectedAt) {
            throw new Error(
              `Remote block ${block.remoteSourceInfo?.arenaId} is missing its connection timestamp`,
            );
          }
          if (!block.connectedBy) {
            throw new Error(
              `Remote block ${block.remoteSourceInfo?.arenaId} is missing its connecting user`,
            );
          }
          await transaction.runAsync(
            `INSERT INTO connections (
               block_id,
               collection_id,
               created_by,
               remote_created_at
             ) VALUES (?, ?, ?, ?)
             ON CONFLICT(block_id, collection_id)
             DO UPDATE SET remote_created_at = excluded.remote_created_at;`,
            [
              blockId.id,
              collectionId,
              block.connectedBy,
              block.remoteConnectedAt,
            ],
          );
        }
      });
      return itemsAdded;
    },
  };
}

async function insertBlock(
  transaction: SQLite.SQLiteDatabase,
  block: DatabaseBlockInsert,
): Promise<{ id: number; created: boolean }> {
  const inserted = await transaction.getFirstAsync<{ id: number }>(
    `INSERT INTO blocks (
       title,
       description,
       content,
       type,
       content_type,
       source,
       remote_source_type,
       created_by,
       remote_source_info,
       local_asset_id,
       capture_time,
       location_data
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(arena_id) DO NOTHING
     RETURNING id;`,
    [
      block.title || null,
      block.description || null,
      block.content,
      block.type,
      block.contentType || null,
      block.source || null,
      block.remoteSourceType || null,
      block.createdBy,
      block.remoteSourceInfo
        ? JSON.stringify(block.remoteSourceInfo)
        : null,
      block.localAssetId || null,
      block.captureTime || null,
      block.locationData ? JSON.stringify(block.locationData) : null,
    ],
  );
  if (inserted) {
    return { id: inserted.id, created: true };
  }

  const arenaId = block.remoteSourceInfo?.arenaId;
  if (!arenaId) {
    throw new Error("Failed to create remote block without an Are.na ID");
  }
  const existing = await transaction.getFirstAsync<{ id: number }>(
    `SELECT id FROM blocks WHERE arena_id = ?;`,
    [arenaId.toString()],
  );
  if (!existing) {
    throw new Error(`Failed to find remote block ${arenaId} after conflict`);
  }
  return { id: existing.id, created: false };
}
