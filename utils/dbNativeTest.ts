// ABOUTME: Exercises Gather's SQLite access patterns against the native Expo module.
// ABOUTME: Verifies reads, writes, conflicts, batches, and transaction rollback on a device.
import * as SQLite from "expo-sqlite";

function ensureTestResult(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runNativeDatabaseTests(): Promise<string[]> {
  const databaseName = `basket-sqlite-test-${Date.now()}.db`;
  const database = SQLite.openDatabaseSync(databaseName);
  const passedTests: string[] = [];

  try {
    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(`CREATE TABLE collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        remote_source_info TEXT,
        arena_id TEXT AS (json_extract(remote_source_info, '$.arenaId'))
      );`);
      await transaction.runAsync(`CREATE TABLE blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        remote_source_info TEXT,
        arena_id TEXT AS (json_extract(remote_source_info, '$.arenaId'))
      );`);
      await transaction.runAsync(`CREATE UNIQUE INDEX blocks_arena_id
        ON blocks (arena_id);`);
      await transaction.runAsync(`CREATE TABLE connections (
        block_id INTEGER NOT NULL,
        collection_id INTEGER NOT NULL,
        remote_created_at TEXT,
        PRIMARY KEY (block_id, collection_id)
      );`);
    });
    passedTests.push("schema transaction");

    const collectionInsert = await database.runAsync(
      `INSERT INTO collections (title, remote_source_info) VALUES (?, ?);`,
      ["Test collection", JSON.stringify({ arenaId: "channel-1" })],
    );
    ensureTestResult(
      collectionInsert.lastInsertRowId > 0,
      "Collection insert did not return an ID",
    );
    const collectionId = collectionInsert.lastInsertRowId;
    passedTests.push("insert result");

    const insertedBlock = await database.getFirstAsync<{ id: number }>(
      `INSERT INTO blocks (content, remote_source_info)
       VALUES (?, ?)
       ON CONFLICT(arena_id) DO NOTHING
       RETURNING id;`,
      ["first", JSON.stringify({ arenaId: "block-1" })],
    );
    ensureTestResult(insertedBlock, "Block insert did not return its row");
    const conflictingBlock = await database.getFirstAsync<{ id: number }>(
      `INSERT INTO blocks (content, remote_source_info)
       VALUES (?, ?)
       ON CONFLICT(arena_id) DO NOTHING
       RETURNING id;`,
      ["duplicate", JSON.stringify({ arenaId: "block-1" })],
    );
    ensureTestResult(
      conflictingBlock === null,
      "Conflicting insert unexpectedly returned a row",
    );
    const existingBlock = await database.getFirstAsync<{ id: number }>(
      `SELECT id FROM blocks WHERE arena_id = ?;`,
      ["block-1"],
    );
    ensureTestResult(
      existingBlock?.id === insertedBlock.id,
      "Conflict lookup returned the wrong block",
    );
    passedTests.push("insert conflict lookup");

    const updatedSource = JSON.stringify({ arenaId: "block-2" });
    await database.runAsync(
      `UPDATE blocks SET content = ?, remote_source_info = ? WHERE id = ?;`,
      ["updated", updatedSource, insertedBlock.id],
    );
    const updatedBlock = await database.getFirstAsync<{
      content: string;
      remote_source_info: string;
      arena_id: string;
    }>(
      `SELECT content, remote_source_info, arena_id FROM blocks WHERE id = ?;`,
      [insertedBlock.id],
    );
    ensureTestResult(
      updatedBlock?.content === "updated" &&
        updatedBlock.remote_source_info === updatedSource &&
        updatedBlock.arena_id === "block-2",
      "Bound update did not preserve text and JSON values",
    );
    passedTests.push("bound update");

    await database.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO connections (block_id, collection_id, remote_created_at)
         VALUES (?, ?, ?);`,
        [insertedBlock.id, collectionId, "2026-08-11T00:00:00Z"],
      );
      await transaction.runAsync(
        `INSERT INTO connections (block_id, collection_id, remote_created_at)
         VALUES (?, ?, NULL)
         ON CONFLICT(block_id, collection_id)
         DO UPDATE SET remote_created_at = excluded.remote_created_at;`,
        [insertedBlock.id, collectionId],
      );
    });
    const pendingConnection = await database.getFirstAsync<{
      remote_created_at: string | null;
    }>(
      `SELECT remote_created_at FROM connections
       WHERE block_id = ? AND collection_id = ?;`,
      [insertedBlock.id, collectionId],
    );
    ensureTestResult(
      pendingConnection?.remote_created_at === null,
      "Connection upsert did not preserve pending state",
    );
    passedTests.push("atomic connection upsert");

    try {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.runAsync(
          `INSERT INTO collections (title) VALUES (?);`,
          ["Rollback collection"],
        );
        throw new Error("rollback test");
      });
    } catch (error) {
      ensureTestResult(
        error instanceof Error && error.message === "rollback test",
        "Rollback surfaced the wrong error",
      );
    }
    const collectionCount = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM collections;`,
    );
    ensureTestResult(
      collectionCount?.count === 1,
      "Failed transaction was not rolled back",
    );
    passedTests.push("transaction rollback");

    const rows = await database.getAllAsync<{ id: number; title: string }>(
      `SELECT id, title FROM collections ORDER BY id;`,
    );
    ensureTestResult(
      rows.length === 1 && rows[0].title === "Test collection",
      "Typed multi-row read returned unexpected data",
    );
    passedTests.push("typed reads");

    await database.runAsync(
      `DELETE FROM connections
       WHERE block_id = ? AND collection_id = ? AND remote_created_at IS NULL;`,
      [insertedBlock.id, collectionId],
    );
    const connectionCount = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM connections;`,
    );
    ensureTestResult(
      connectionCount?.count === 0,
      "Pending connection deletion did not remove its row",
    );
    passedTests.push("conditional delete");

    return passedTests;
  } finally {
    await database.closeAsync();
    await SQLite.deleteDatabaseAsync(databaseName);
  }
}
