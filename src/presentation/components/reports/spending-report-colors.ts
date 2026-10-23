import type { SpendingGroupReport } from '@/domain/services/calculate-spending-report';

const LIGHT_GROUP_COLORS = [
  '#5B54E8',
  '#3478C7',
  '#23846B',
  '#C27627',
  '#B84E72',
  '#7657A8',
  '#2E8392',
  '#8B6B3F',
] as const;

const DARK_GROUP_COLORS = [
  '#9B96FF',
  '#78AFE8',
  '#62C5A2',
  '#E2A15A',
  '#E384A4',
  '#BD94DE',
  '#70C0CC',
  '#C6A06F',
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
