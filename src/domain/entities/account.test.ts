import { supportsCategoryInflows } from './account';

describe('account category inflow support', () => {
  it.each(['checking', 'savings', 'cash'] as const)(
    'supports on-budget %s accounts',
    (type) => {
      expect(supportsCategoryInflows({ type, onBudget: true })).toBe(true);
    },
  );

  it.each([
    { type: 'checking', onBudget: false },
    { type: 'credit_card', onBudget: true },
    { type: 'line_of_credit', onBudget: true },
    { type: 'tracking', onBudget: false },
    { type: 'loan', onBudget: false },
  ] as const)('keeps $type outside P0', (account) => {
    expect(supportsCategoryInflows(account)).toBe(false);
  });
});
