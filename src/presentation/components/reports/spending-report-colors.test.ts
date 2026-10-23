import type { SpendingGroupReport } from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';

import {
  createSpendingReportColors,
  mutedSpendingColor,
} from './spending-report-colors';

const group = {
  groupId: 'needs',
  groupName: 'Needs',
  total: Money.zero(),
  average: Money.zero(),
  spendingByInterval: [Money.zero()],
  percentageOfTotal: 0,
  categories: [{ categoryId: 'food' }, { categoryId: 'transport' }],
} as unknown as SpendingGroupReport;

describe('spending report colors', () => {
  it('keeps group and category colors stable when report order changes', () => {
    const wants = {
      ...group,
      groupId: 'wants',
      groupName: 'Wants',
      categories: [],
    };
    const first = createSpendingReportColors([group, wants], false);
    const reordered = createSpendingReportColors([wants, group], false);

    expect(first.groups.needs).toBe(reordered.groups.needs);
    expect(first.groups.wants).toBe(reordered.groups.wants);
    expect(first.categories.food).toBe(reordered.categories.food);
    expect(first.categories.transport).not.toBe(first.categories.food);
  });

  it('assigns categories stable shades from dark to light', () => {
    const colors = createSpendingReportColors(
      [
        {
          ...group,
          categories: [
            { categoryId: 'z-last' },
            { categoryId: 'a-first' },
            { categoryId: 'm-middle' },
          ],
        } as unknown as SpendingGroupReport,
      ],
      false,
    );
    const luminance = (color: string) => {
      const value = Number.parseInt(color.slice(1), 16);
      return (
        ((value >> 16) & 0xff) * 0.2126 +
        ((value >> 8) & 0xff) * 0.7152 +
        (value & 0xff) * 0.0722
      );
    };

    expect(luminance(colors.categories['a-first']!)).toBeLessThan(
      luminance(colors.categories['m-middle']!),
    );
    expect(luminance(colors.categories['m-middle']!)).toBeLessThan(
      luminance(colors.categories['z-last']!),
    );
  });

  it('mutes selections with an opaque grey color for each theme', () => {
    expect(mutedSpendingColor('#ff0000', false)).toMatch(/^#[0-9a-f]{6}$/);
    expect(mutedSpendingColor('#ff0000', true)).not.toBe(
      mutedSpendingColor('#ff0000', false),
    );
    expect(mutedSpendingColor('#ff0000', false, 0.5)).not.toBe(
      mutedSpendingColor('#ff0000', false, 0.82),
    );
  });
});
