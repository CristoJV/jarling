import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import { createAccount } from '@/domain/entities/account';
import { createCategory } from '@/domain/entities/category';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryTagRepository } from '@/infrastructure/persistence/in-memory/in-memory-tag-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';

import { CreateTransaction } from './create-transaction';
import { UpdateTransaction } from './update-transaction';

const clock: Clock = {
  now: () => ({ instant: '2026-10-16T10:00:00.000Z', date: '2026-10-16' }),
};

class SequenceIds implements IdGenerator {
  private value = 0;
  next() {
    this.value += 1;
    return `id-${this.value}`;
  }
}

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const categories = new InMemoryCategoryRepository();
  const transactions = new InMemoryTransactionRepository();
  const tags = new InMemoryTagRepository();
  const ids = new SequenceIds();
  const unit = new ImmediateUnitOfWork();
  transactions.setTagLookup(async (id) => tags.findTagIdsByTransaction(id));
  await accounts.save(
    createAccount({
      id: 'account-1',
      name: 'Checking',
      type: 'checking',
      onBudget: true,
      createdAt: clock.now().instant,
      updatedAt: clock.now().instant,
    }),
  );
  await categories.save(
    createCategory({
      id: 'category-1',
      groupId: 'group-1',
      name: 'Food',
      hidden: false,
      sortOrder: 0,
      createdAt: clock.now().instant,
      updatedAt: clock.now().instant,
    }),
  );
  return {
    transactions,
    tags,
    create: new CreateTransaction(
      accounts,
      categories,
      transactions,
      unit,
      ids,
      clock,
      tags,
    ),
    update: new UpdateTransaction(
      accounts,
      categories,
      transactions,
      unit,
      clock,
      ids,
      tags,
    ),
  };
}

describe('transaction tags', () => {
  it('creates normalized tags and filters by any selected tag', async () => {
    const { create, tags, transactions } = await setup();
    const transaction = await create.execute({
      direction: 'outflow',
      accountId: 'account-1',
      amountCents: 100,
      date: '2026-10-16',
      status: 'uncleared',
      newTagNames: ['  Viaje ', 'VIAJE', 'Trabajo'],
    });
    const assigned = await tags.findByTransaction(transaction.id);

    expect(assigned.map(({ name }) => name)).toEqual(['Trabajo', 'VIAJE']);
    await expect(
      transactions.findAll({ tagIds: [assigned[0]!.id] }),
    ).resolves.toEqual([transaction]);
    await expect(
      transactions.findAll({ tagIds: ['missing', assigned[1]!.id] }),
    ).resolves.toEqual([transaction]);
    await expect(transactions.findAll({ untagged: true })).resolves.toEqual([]);
  });

  it('preserves omitted tags and clears an explicit empty selection', async () => {
    const { create, update, tags } = await setup();
    const transaction = await create.execute({
      direction: 'outflow',
      accountId: 'account-1',
      amountCents: 100,
      date: '2026-10-16',
      status: 'uncleared',
      newTagNames: ['Personal'],
    });
    await update.execute({
      id: transaction.id,
      direction: 'outflow',
      accountId: 'account-1',
      amountCents: 200,
      date: '2026-10-16',
      status: 'uncleared',
    });
    expect(await tags.findByTransaction(transaction.id)).toHaveLength(1);

    await update.execute({
      id: transaction.id,
      direction: 'outflow',
      accountId: 'account-1',
      amountCents: 200,
      date: '2026-10-16',
      status: 'uncleared',
      tagIds: [],
      newTagNames: [],
    });
    expect(await tags.findByTransaction(transaction.id)).toEqual([]);
  });
});
