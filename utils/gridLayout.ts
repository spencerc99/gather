// ABOUTME: Calculates fixed-size grid item positions for virtualized lists.
// ABOUTME: Maps item indexes to their shared row offsets.
export function getGridRowLayout(
  cellSize: number,
  gap: number,
  rowIndex: number,
) {
  const rowHeight = cellSize + gap * 2;
  return {
    length: rowHeight,
    offset: rowHeight * rowIndex,
    index: rowIndex,
  };
}
