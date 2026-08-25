export function normalizeSelectionSearch(value: string, language: string) {
  return value.trim().toLocaleLowerCase(language);
}

export function filterSearchableItems<Item>(
  items: readonly Item[],
  query: string,
  language: string,
  getLabel: (item: Item) => string,
): readonly Item[] {
  const normalized = normalizeSelectionSearch(query, language);
  if (!normalized) return items;
  return items.filter((item) =>
    getLabel(item).toLocaleLowerCase(language).includes(normalized),
  );
}

export function hasExactSelectionMatch<Item>(
  items: readonly Item[],
  query: string,
  language: string,
  getLabel: (item: Item) => string,
): boolean {
  const normalized = normalizeSelectionSearch(query, language);
  return (
    normalized.length > 0 &&
    items.some((item) => {
      const label = getLabel(item);
      const withoutDecoration = label.replace(/^[^\p{L}\p{N}]+/u, '');
      return [label, withoutDecoration].some(
        (candidate) =>
          candidate.toLocaleLowerCase(language).trim() === normalized,
      );
    })
  );
}
