export function filterItemsBySearchValue<T extends any>(
  items: T[],
  searchValue: string,
  properties: (keyof T)[]
) {
  if (!properties || properties.length < 1) {
    throw new Error("properties must be defined");
  }

  return items.filter((item) => {
    const itemString = properties
      .map((property) => {
        const value = item[property];
        if (typeof value === "string") {
          return value;
        }
        if (typeof value === "number") {
          return value.toString();
        }
        return "";
      })
      .join("\n")
      .toLocaleLowerCase();
    return itemString.includes(searchValue.toLowerCase());
  });
}
