export const Migrations = [
  // Added 2023-12-18
  //   "ALTER TABLE blocks DROP COLUMN arena_id;",
  `ALTER TABLE blocks ADD COLUMN arena_id VARCHAR(24) AS (json_extract(remote_source_info, '$.arenaId'));`,
];

export const Indices = [
  `CREATE UNIQUE INDEX IF NOT EXISTS blocks_unique_arena_id_idx ON blocks (arena_id);`,
  //   `DROP INDEX blocks_unique_arena_id_idx;`,
];
