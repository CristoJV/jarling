import { nextSortOrder } from './sort-order';

describe('nextSortOrder', () => {
  it('starts an empty collection at zero', () => {
    expect(nextSortOrder([])).toBe(0);
  });

  it('appends after the greatest order even when positions contain gaps', () => {
    expect(nextSortOrder([{ sortOrder: 8 }, { sortOrder: 2 }])).toBe(9);
  });
});
