import {
  resolveAccountOnBudget,
  supportsBudgetCategories,
  supportsCategoryInflows,
} from './account';

describe('account budget policy', () => {
  it.each([
    ['checking', true, true],
    ['checking', false, false],
    ['savings', false, false],
    ['cash', true, true],
    ['credit_card', false, true],
    ['line_of_credit', false, true],
    ['tracking', true, false],
    ['loan', true, false],
  ] as const)(
    'resolves %s with requested on-budget=%s to %s',
    (type, requested, expected) => {
      expect(resolveAccountOnBudget(type, requested)).toBe(expected);
    },
  );

  it('uses the same account boundary for every budget category', () => {
    expect(
      supportsBudgetCategories({ type: 'credit_card', onBudget: true }),
    ).toBe(true);
    expect(supportsBudgetCategories({ type: 'tracking', onBudget: true })).toBe(
      false,
    );
  });
});

describe('account category inflow support', () => {
  it.each([
    'checking',
    'savings',
    'cash',
    'credit_card',
    'line_of_credit',
  ] as const)('supports on-budget %s accounts', (type) => {
    expect(supportsCategoryInflows({ type, onBudget: true })).toBe(true);
  });

  it.each([
    { type: 'checking', onBudget: false },
    { type: 'tracking', onBudget: true },
    { type: 'tracking', onBudget: false },
    { type: 'loan', onBudget: false },
  ] as const)('keeps off-budget $type outside category inflows', (account) => {
    expect(supportsCategoryInflows(account)).toBe(false);
  });
});
