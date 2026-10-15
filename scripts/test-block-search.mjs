// ABOUTME: Exercises production search predicates against real SQLite rows.
// ABOUTME: Guards literal input, searchable fields, and deleted or media exclusions.
import { Database } from "bun:sqlite";
import { test } from "node:test";
import assert from "node:assert/strict";
import { getBlockSearchFilter } from "../utils/blockSearch.ts";

test("block search binds literal input and searches only eligible fields", () => {
  const db = new Database(":memory:");
  try {
    db.exec(
      "CREATE TABLE blocks (id INTEGER, title TEXT, description TEXT, content TEXT, type TEXT, deletion_timestamp INTEGER)",
    );
    const insert = db.prepare("INSERT INTO blocks VALUES (?, ?, ?, ?, ?, ?)");
    insert.run(1, "Spencer's 100%_\\ notes", null, "", "image", null);
    insert.run(2, "", "ocean description", "", "image", null);
    insert.run(3, "", null, "ocean body", "text", null);
    insert.run(4, "", null, "/ocean.jpg", "image", null);
    insert.run(5, "ocean deleted", null, "", "text", 1);
    const search = (input) => {
      const { clause, params } = getBlockSearchFilter(input);
      return db
        .query(
          `SELECT id FROM blocks WHERE deletion_timestamp IS NULL${clause} ORDER BY id`,
        )
        .all(...params)
        .map((row) => row.id);
    };
    assert.deepEqual(search("ocean"), [2, 3]);
    assert.deepEqual(search("Spencer's"), [1]);
    for (const literal of ["%", "_", "\\", "100%_\\"])
      assert.deepEqual(search(literal), [1]);
    assert.deepEqual(search("' OR 1=1 --"), []);
    assert.deepEqual(search("OCEAN"), [2, 3]);
    assert.deepEqual(search(""), [1, 2, 3, 4]);
  } finally {
    db.close();
  }
});
