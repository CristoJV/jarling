export function nextSortOrder(
  items: readonly Readonly<{ sortOrder: number }>[],
): number {
  return (
    items.reduce((maximum, item) => Math.max(maximum, item.sortOrder), -1) + 1
  );
}
