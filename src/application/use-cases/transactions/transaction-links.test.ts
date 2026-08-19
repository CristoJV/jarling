import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import { createTransaction } from '@/domain/entities/transaction';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import { Money } from '@/domain/value-objects/money';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryTransactionLinkRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-link-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { CreateTransactionLink } from './create-transaction-link';
import { DeleteTransactionLink } from './delete-transaction-link';
import { GetTransactionLinks } from './get-transaction-links';

const clock: Clock = {
  now: () => ({
    instant: '2026-08-19T10:00:00.000Z',
    date: '2026-08-19',
  }),
};
const ids: IdGenerator = { next: () => 'link-1' };

describe('generic transaction links', () => {
  it('links existing transactions canonically without changing ownership', async () => {
    const transactions = new InMemoryTransactionRepository();
    const links = new InMemoryTransactionLinkRepository();
    for (const id of ['transaction-b', 'transaction-a']) {
      await transactions.save(
        createTransaction({
          id,
          accountId: 'account-1',
          amount: Money.fromCents(100),
          date: '2026-08-19',
          status: 'cleared',
          createdAt: clock.now().instant,
          updatedAt: clock.now().instant,
        }),
      );
    }
    const useCase = new CreateTransactionLink(
      transactions,
      links,
      new ImmediateUnitOfWork(),
      ids,
      clock,
    );

    const link = await useCase.execute({
      sourceTransactionId: 'transaction-b',
      targetTransactionId: 'transaction-a',
      type: 'bizum',
    });

    expect(link).toMatchObject({
      sourceTransactionId: 'transaction-a',
      targetTransactionId: 'transaction-b',
      type: 'bizum',
    });
    await expect(
      new GetTransactionLinks(links).execute('transaction-b'),
    ).resolves.toEqual([link]);
    await new DeleteTransactionLink(links, new ImmediateUnitOfWork()).execute(
      link.id,
    );
    await expect(
      new GetTransactionLinks(links).execute('transaction-b'),
    ).resolves.toEqual([]);
  });

  it('rejects links to missing transactions', async () => {
    await expect(
      new CreateTransactionLink(
        new InMemoryTransactionRepository(),
        new InMemoryTransactionLinkRepository(),
        new ImmediateUnitOfWork(),
        ids,
        clock,
      ).execute({
        sourceTransactionId: 'missing-a',
        targetTransactionId: 'missing-b',
        type: 'related',
      }),
    ).rejects.toThrow(TransactionNotFoundError);
  });
});
