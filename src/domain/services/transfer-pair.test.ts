import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { parseTransferPair, planTransferLegs } from './transfer-pair';

const source: Account = {
  id: 'cash',
  name: 'Checking',
  type: 'checking',
  onBudget: true,
  closed: false,
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:00:00.000Z',
};
const credit: Account = {
  ...source,
  id: 'credit',
  name: 'Visa',
  type: 'credit_card',
};
const paymentCategory: Category = {
  id: 'credit-payment',
  groupId: 'credit-payments',
  linkedAccountId: credit.id,
  name: 'Visa Payment',
  hidden: false,
  sortOrder: 0,
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:00:00.000Z',
};

function leg(id: string, accountId: string, cents: number) {
  return createTransaction({
    id,
    accountId,
    amount: Money.fromCents(cents),
    date: '2026-08-19',
    status: 'cleared',
    kind: 'transfer',
    transactionGroupId: 'group-1',
    createdAt: '2026-08-19T10:00:00.000Z',
    updatedAt: '2026-08-19T10:00:00.000Z',
  });
}

describe('parseTransferPair', () => {
  it('returns the balanced source and destination legs', () => {
    expect(
      parseTransferPair(
        [leg('out', 'cash', -1_000), leg('in', 'savings', 1_000)],
        'group-1',
      ),
    ).toMatchObject({ source: { id: 'out' }, destination: { id: 'in' } });
  });

  it('rejects an unequal or same-account pair', () => {
    expect(
      parseTransferPair(
        [leg('out', 'cash', -1_000), leg('in', 'savings', 999)],
        'group-1',
      ),
    ).toBeNull();
    expect(
      parseTransferPair(
        [leg('out', 'cash', -1_000), leg('in', 'cash', 1_000)],
        'group-1',
      ),
    ).toBeNull();
  });

  it('rejects missing legs and legs from another group', () => {
    expect(
      parseTransferPair([leg('out', 'cash', -1_000)], 'group-1'),
    ).toBeNull();
    expect(
      parseTransferPair(
        [
          leg('out', 'cash', -1_000),
          { ...leg('in', 'savings', 1_000), transactionGroupId: 'group-2' },
        ],
        'group-1',
      ),
    ).toBeNull();
  });
});

describe('planTransferLegs', () => {
  it('keeps both persisted transfer payees consistent', () => {
    expect(
      planTransferLegs(
        source,
        { ...source, id: 'savings', name: 'Savings' },
        [],
      ),
    ).toEqual({
      sourcePayee: 'Transfer to Savings',
      destinationPayee: 'Transfer from Checking',
    });
  });

  it('assigns only an on-budget payment source to the credit payment category', () => {
    expect(planTransferLegs(source, credit, [paymentCategory])).toEqual({
      sourcePayee: 'Transfer to Visa',
      destinationPayee: 'Transfer from Checking',
      sourceCategoryId: paymentCategory.id,
    });
    expect(
      planTransferLegs({ ...source, onBudget: false }, credit, [
        paymentCategory,
      ]),
    ).toEqual({
      sourcePayee: 'Transfer to Visa',
      destinationPayee: 'Transfer from Checking',
    });
  });

  it('does not use a payment category for a non-credit destination', () => {
    expect(
      planTransferLegs(source, { ...credit, type: 'savings' }, [
        paymentCategory,
      ]),
    ).not.toHaveProperty('sourceCategoryId');
  });
});
