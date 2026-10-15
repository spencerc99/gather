// ABOUTME: Builds the parameterized text filter used by block search.
// ABOUTME: Treats user-entered quotes and SQL wildcards as literal search text.
export function getBlockSearchFilter(search?: string) {
  if (!search) return { clause: "", params: [] as string[] };
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  return {
    clause:
      " AND (blocks.title LIKE ? ESCAPE '\\' OR blocks.description LIKE ? ESCAPE '\\' OR (blocks.type = 'text' AND blocks.content LIKE ? ESCAPE '\\'))",
    params: [pattern, pattern, pattern],
  };
}
