// ABOUTME: Exercises block batch orchestration against real SQLite connections.
// ABOUTME: Verifies ordered inserts, connection persistence, and write failure handling.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { test } from "node:test";
import { createBlockBatch } from "../utils/blockBatch.ts";

test("block batches persist every block and connection on separate SQLite connections", async () => {
  const directory = mkdtempSync(join(tmpdir(), "gather-block-batch-"));
  const path = join(directory, "test.db");
  const database = new Database(path);
  database.exec(`
    CREATE TABLE blocks (id INTEGER PRIMARY KEY, content TEXT NOT NULL);
    CREATE TABLE connections (block_id INTEGER PRIMARY KEY, collection_id INTEGER NOT NULL);
  `);
  try {
    const contents = Array.from({ length: 12 }, (_, index) => `Block ${index}`);
    const results = await createBlockBatch(contents, async (content) => {
      // Expo exclusive transactions use a new connection for every block.
      const transaction = new Database(path);
      try {
        transaction.exec("BEGIN");
        const { id } = transaction
          .prepare("INSERT INTO blocks (content) VALUES (?) RETURNING id")
          .get(content);
        // Native SQLite calls yield before the following statement and commit.
        await new Promise((resolve) => setImmediate(resolve));
        transaction
          .prepare("INSERT INTO connections VALUES (?, ?)")
          .run(id, 7);
        transaction.exec("COMMIT");
        return id;
      } catch (error) {
        transaction.exec("ROLLBACK");
        throw error;
      } finally {
        transaction.close();
      }
    });
    assert.deepEqual(results, contents.map((_, index) => index + 1));
    assert.deepEqual(
      database
        .prepare("SELECT content FROM blocks JOIN connections ON block_id = id WHERE collection_id = 7 ORDER BY id")
        .all()
        .map(({ content }) => content),
      contents,
    );
  } finally {
    // Allow any already-started transaction to settle when testing a failing batch.
    await new Promise((resolve) => setImmediate(resolve));
    database.close();
    rmSync(directory, { recursive: true });
  }
});

test("a rejected block stops the batch without replaying or starting later blocks", async () => {
  const attempted = [];
  const failure = new Error("block rejected");
  await assert.rejects(
    createBlockBatch([1, 2, 3], async (block) => {
      attempted.push(block);
      if (block === 2) throw failure;
      return block;
    }),
    (error) => error === failure,
  );
  assert.deepEqual(attempted, [1, 2]);
  assert.deepEqual(await createBlockBatch([], async () => assert.fail("empty batch wrote a block")), []);
});
