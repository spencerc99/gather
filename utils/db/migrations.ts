import { SQLiteDatabase } from "expo-sqlite";
import { storage } from "../mmkv";
import { UserInfo } from "../user";
import { mapDbBlockToBlock } from "../db";
import { BlockType } from "../mimeTypes";
import { logError } from "../errors";

export const Migrations = [
  // // Added 2023-12-18
  // `ALTER TABLE blocks ADD COLUMN arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'));`,
  // `ALTER TABLE connections ADD COLUMN remote_created_at timestamp;`,
  // // Added 2024-04-26
  // `ALTER TABLE collections ADD COLUMN arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'));`,
  // Added 2024-05-18
  // `ALTER TABLE blocks ADD COLUMN deletion_timestamp timestamp;`,
  // Added 2024-05-18
  // `ALTER TABLE connections ADD COLUMN remote_connected_at_datetime AS (datetime(remote_created_at));`,
  // Added 2024-06-03
  // `ALTER TABLE blocks ADD COLUMN local_asset_id VARCHAR(128);`,
];

export const Indices = [
  `CREATE UNIQUE INDEX IF NOT EXISTS blocks_unique_arena_id_idx ON blocks (arena_id);`,
];

// TODO: Remove `hasMigratedAmpersandEscape` after a while (when everyone has migrated)
export const hasMigratedAmpersandEscape = storage.getBoolean(
  "hasMigratedAmpersandEscape"
);

export async function migrateAmpersandEscape(db: SQLiteDatabase) {
  if (hasMigratedAmpersandEscape) {
    return;
  }

  const start = global.performance.now();

  console.log("starting ampersand escape migration");

  try {
    await db.transactionAsync(async (tx) => {
      const { rows } = await tx.executeSqlAsync(`
        SELECT id, description, title, content, type
        FROM blocks
        WHERE description LIKE '%&amp;%' OR title LIKE '%&amp;%' OR (type = 'text' AND content LIKE '%&amp;%');
      `);
      const blocks = rows.map(mapDbBlockToBlock);
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const { id, description, title, content, type } = block;
        const updatedTitle = title?.replaceAll("&amp;", "&");
        const updatedDescription = description?.replaceAll("&amp;", "&");
        const updatedContent =
          type === BlockType.Text ? content?.replaceAll("&amp;", "&") : content;

        tx.executeSqlAsync(
          `UPDATE blocks
            SET   title = ?,
                  description = ?,
                  content = ?
            WHERE id = ?`,
          [updatedTitle || null, updatedDescription || null, updatedContent, id]
        );
      }
    });
    storage.set("hasMigratedAmpersandEscape", true);

    const end = global.performance.now();
    console.log(`Migrated ampersand escape in ${end - start}ms!`);
  } catch (err) {
    logError("Error migrating ampersand escape", JSON.stringify(err, null, 2));
  }
}
