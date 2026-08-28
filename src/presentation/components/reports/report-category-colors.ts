const LIGHT_CATEGORY_COLORS = [
  '#25866A',
  '#D17A22',
  '#C4506D',
  '#397BC5',
  '#7A7830',
  '#7B5FA8',
] as const;

const DARK_CATEGORY_COLORS = [
  '#62C5A2',
  '#F0A85D',
  '#EA8298',
  '#78ADE7',
  '#C5C168',
  '#BE8DE0',
] as const;

export type ReportCategoryColors = Readonly<Record<string, string>>;

export function createReportCategoryColors(
  categoryIds: readonly string[],
  dark: boolean,
): ReportCategoryColors {
  const palette = dark ? DARK_CATEGORY_COLORS : LIGHT_CATEGORY_COLORS;
  return Object.fromEntries(
    categoryIds.map((categoryId, index) => [
      categoryId,
      palette[index % palette.length]!,
    ]),
  );
}
