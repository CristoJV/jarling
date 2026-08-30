import { supportsCategoryInflows } from './account';

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
    { type: 'tracking', onBudget: false },
    { type: 'loan', onBudget: false },
  ] as const)('keeps off-budget $type outside category inflows', (account) => {
    expect(supportsCategoryInflows(account)).toBe(false);
  });
});
