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
