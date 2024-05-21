import { SQLiteDatabase } from "expo-sqlite";
import { storage } from "../mmkv";
import { UserInfo } from "../user";

export const Migrations = [
  // Added 2023-12-18
  `ALTER TABLE blocks ADD COLUMN arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'));`,
  `ALTER TABLE connections ADD COLUMN remote_created_at timestamp;`,
  // Added 2024-04-26
  `ALTER TABLE collections ADD COLUMN arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'));`,
  // Added 2024-06-03
  `ALTER TABLE blocks ADD COLUMN local_asset_id VARCHAR(128);`,
  // Added 2024-05-18
  `ALTER TABLE blocks ADD COLUMN deletion_timestamp timestamp;`,
];

export const Indices = [
  `CREATE UNIQUE INDEX IF NOT EXISTS blocks_unique_arena_id_idx ON blocks (arena_id);`,
];

// TODO: Remove `hasMigratedCreatedBy` after a while (when everyone has migrated)
export const hasMigratedCreatedBy = storage.getBoolean("hasMigratedCreatedBy");

// TODO: Remove `hasMigratedCreatedBy` after a while (when everyone has migrated)
export async function migrateCreatedBy(
  db: SQLiteDatabase,
  currentUser: UserInfo
): Promise<void> {
  if (hasMigratedCreatedBy) {
    return;
  }
  const start = global.performance.now();

  if (!currentUser) {
    console.log("No user found to migrate");
    return;
  }

  console.log("starting createdBy migration");

  await db.transactionAsync(async (tx) => {
    console.log("updating collections");
    tx.executeSqlAsync(
      `UPDATE collections
        SET created_by = ?`,
      [currentUser.id]
    );
    tx.executeSqlAsync(
      `UPDATE blocks
        SET created_by = ?`,
      [currentUser.id]
    );
    console.log("updating connections");
    tx.executeSqlAsync(
      `UPDATE connections
        SET created_by = ?`,
      [currentUser.id]
    );
    storage.set("hasMigratedCreatedBy", true);
  });

  const end = global.performance.now();
  console.log(`Migrated createdBy in ${end - start}ms!`);
}
