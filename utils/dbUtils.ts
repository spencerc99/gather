// escapes % and _ characters in the search string
export function getEscapedSearchString(searchString: string): string {
  return `'%${searchString.replace(/%/g, "\\%").replace(/_/g, "\\_")}%'`;
}
