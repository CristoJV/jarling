import type { SpendingGroupReport } from '@/domain/services/calculate-spending-report';

const LIGHT_GROUP_COLORS = [
  '#397BC5',
  '#25866A',
  '#D17A22',
  '#C4506D',
  '#7B5FA8',
  '#7A7830',
  '#2C8D9B',
  '#A45A35',
] as const;

const DARK_GROUP_COLORS = [
  '#78ADE7',
  '#62C5A2',
  '#F0A85D',
  '#EA8298',
  '#BE8DE0',
  '#C5C168',
  '#68C5D1',
  '#E1926C',
] as const;

export type SpendingReportColors = Readonly<{
  groups: Readonly<Record<string, string>>;
  categories: Readonly<Record<string, string>>;
}>;

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function mixColor(color: string, target: string, ratio: number): string {
  const sourceValue = Number.parseInt(color.slice(1), 16);
  const targetValue = Number.parseInt(target.slice(1), 16);
  const channel = (shift: number) => {
    const source = (sourceValue >> shift) & 0xff;
    const destination = (targetValue >> shift) & 0xff;
    return Math.round(source + (destination - source) * ratio);
  };
  const value = (channel(16) << 16) | (channel(8) << 8) | channel(0);
  return `#${value.toString(16).padStart(6, '0')}`;
}

export function mutedSpendingColor(
  color: string,
  dark: boolean,
  strength = dark ? 0.76 : 0.72,
): string {
  return mixColor(color, dark ? '#24272c' : '#a9adb2', strength);
}

export function createSpendingReportColors(
  groups: readonly SpendingGroupReport[],
  dark: boolean,
): SpendingReportColors {
  const palette = dark ? DARK_GROUP_COLORS : LIGHT_GROUP_COLORS;
  const groupColors: Record<string, string> = {};
  const categoryColors: Record<string, string> = {};

  for (const group of groups) {
    const groupColor = palette[hash(group.groupId) % palette.length]!;
    groupColors[group.groupId] = groupColor;
    const orderedCategories = [...group.categories].sort((left, right) =>
      left.categoryId.localeCompare(right.categoryId),
    );
    orderedCategories.forEach((category, index) => {
      if (orderedCategories.length === 1) {
        categoryColors[category.categoryId] = groupColor;
        return;
      }
      const darkest = mixColor(groupColor, '#000000', dark ? 0.2 : 0.32);
      const lightest = mixColor(groupColor, '#ffffff', dark ? 0.36 : 0.46);
      categoryColors[category.categoryId] = mixColor(
        darkest,
        lightest,
        index / (orderedCategories.length - 1),
      );
    });
  }

  return { groups: groupColors, categories: categoryColors };
}
