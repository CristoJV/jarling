import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { parseTransferPair } from './transfer-pair';

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
});
