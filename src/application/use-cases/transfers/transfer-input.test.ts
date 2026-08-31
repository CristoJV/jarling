import { createAccount } from '@/domain/entities/account';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import { InvalidTransferError } from '@/domain/errors/invalid-transfer-error';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';

import { prepareTransferInput, type TransferInput } from './transfer-input';

const now = '2026-08-18T10:00:00.000Z';
const validInput: TransferInput = {
  kind: 'transfer',
  sourceAccountId: 'source',
  destinationAccountId: 'destination',
  amountCents: 1_000,
  date: '2026-08-18',
  status: 'cleared',
};

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const categories = new InMemoryCategoryRepository();
  for (const values of [
    { id: 'source', name: 'Checking' },
    { id: 'destination', name: 'Savings' },
  ]) {
    await accounts.save(
      createAccount({
        ...values,
        type: 'checking',
        onBudget: true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }
  return { accounts, categories };
}

describe('prepareTransferInput', () => {
  it.each([0, -1, 1.5])(
    'rejects the invalid amount %s',
    async (amountCents) => {
      const { accounts, categories } = await setup();
      await expect(
        prepareTransferInput(
          { ...validInput, amountCents },
          accounts,
          categories,
        ),
      ).rejects.toThrow(InvalidTransferError);
    },
  );

  it('requires two different existing accounts', async () => {
    const { accounts, categories } = await setup();
    await expect(
      prepareTransferInput(
        { ...validInput, destinationAccountId: validInput.sourceAccountId },
        accounts,
        categories,
      ),
    ).rejects.toThrow(InvalidTransferError);
    await expect(
      prepareTransferInput(
        { ...validInput, sourceAccountId: 'missing' },
        accounts,
        categories,
      ),
    ).rejects.toThrow(AccountNotFoundError);
    await expect(
      prepareTransferInput(
        { ...validInput, destinationAccountId: 'missing' },
        accounts,
        categories,
      ),
    ).rejects.toThrow(AccountNotFoundError);
  });

  it.each(['source', 'destination'] as const)(
    'rejects a closed %s account',
    async (side) => {
      const { accounts, categories } = await setup();
      const account = await accounts.findById(side);
      await accounts.save({ ...account!, closed: true });

      await expect(
        prepareTransferInput(validInput, accounts, categories),
      ).rejects.toThrow(ClosedAccountError);
    },
  );
});
