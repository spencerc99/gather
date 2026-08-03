// ABOUTME: Calculates fixed-size grid item positions for virtualized lists.
// ABOUTME: Maps item indexes to their shared row offsets.
export function getGridItemLayout(
  cellSize: number,
  gap: number,
  columnCount: number,
  index: number,
) {
  const rowHeight = cellSize + gap * 2;
  return {
    length: rowHeight,
    offset: rowHeight * Math.floor(index / columnCount),
    index,
  };
}
