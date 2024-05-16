import { SQLTransactionAsync } from "expo-sqlite";
import { storage } from "../mmkv";
import { UserContext, UserInfo } from "../user";
import { useContext } from "react";

export const Migrations = [
  // Added 2023-12-18
  `ALTER TABLE blocks ADD COLUMN arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'));`,
  `ALTER TABLE connections ADD COLUMN remote_created_at timestamp;`,
  // Added 2024-04-26
  `ALTER TABLE collections ADD COLUMN arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'));`,
];

export const Indices = [
  `CREATE UNIQUE INDEX IF NOT EXISTS blocks_unique_arena_id_idx ON blocks (arena_id);`,
];

// TODO: Remove `hasMigratedCreatedBy` after a while (when everyone has migrated)
export const hasMigratedCreatedBy = storage.getBoolean("hasMigratedCreatedBy");

// TODO: Remove `hasMigratedCreatedBy` after a while (when everyone has migrated)
export async function migrateCreatedBy(
  tx: SQLTransactionAsync,
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

  tx.executeSqlAsync(
    `UPDATE blocks
      SET created_by = ?`,
    [currentUser.id]
  );
  tx.executeSqlAsync(
    `UPDATE collections
      SET created_by = ?`,
    [currentUser.id]
  );
  // TODO: need to go through each and fetch from arena
  // tx.executeSqlAsync(
  //   `UPDATE connections
  //     SET created_by = ?`,
  //   [currentUser.id]
  // );

  storage.set("hasMigratedCreatedBy", true);
  const end = global.performance.now();
  console.log(`Migrated from AsyncStorage -> MMKV in ${end - start}ms!`);
}
