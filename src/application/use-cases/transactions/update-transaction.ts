import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  updateTransaction as applyChanges,
  type Transaction,
} from '@/domain/entities/transaction';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { InvalidTransactionAmountError } from '@/domain/errors/invalid-transaction-amount-error';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import { TransactionAccountLockedError } from '@/domain/errors/transaction-account-locked-error';
import { ProtectedTransactionError } from '@/domain/errors/protected-transaction-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { transactionAccountLockReason } from '@/domain/services/transaction-edit-policy';
import { Money } from '@/domain/value-objects/money';

import {
  prepareTransactionInput,
  type TransactionInput,
} from './transaction-input';

export type UpdateTransactionInput = TransactionInput &
  Readonly<{ id: string }>;

export class UpdateTransaction {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateTransactionInput): Promise<Transaction> {
    const current = await this.transactions.findById(input.id);

    if (!current) {
      throw new TransactionNotFoundError(input.id);
    }

    if (
      current.kind !== 'standard' &&
      current.kind !== 'opening_balance' &&
      current.kind !== 'reconciliation_adjustment'
    ) {
      throw new ProtectedTransactionError(current.kind);
    }

    const accountLockReason = transactionAccountLockReason(current);
    if (accountLockReason && input.accountId !== current.accountId) {
      throw new TransactionAccountLockedError(accountLockReason);
    }

    const prepared =
      current.kind === 'opening_balance' ||
      current.kind === 'reconciliation_adjustment'
        ? await this.prepareTechnicalTransaction(input, current)
        : await prepareTransactionInput(input, this.accounts, this.categories);
    const updated = applyChanges(current, {
      ...prepared,
      status: current.status === 'reconciled' ? 'reconciled' : prepared.status,
      updatedAt: this.clock.now().instant,
    });

    return this.unitOfWork.run(async () => {
      await this.transactions.save(updated);
      return updated;
    });
  }

  private async prepareTechnicalTransaction(
    input: UpdateTransactionInput,
    current: Transaction,
  ) {
    if (
      !Number.isSafeInteger(input.amountCents) ||
      input.amountCents < 0 ||
      (input.amountCents === 0 && current.kind !== 'opening_balance')
    ) {
      throw new InvalidTransactionAmountError();
    }
    const account = await this.accounts.findById(current.accountId);
    if (!account) throw new AccountNotFoundError(current.accountId);

    return {
      accountId: current.accountId,
      payee: input.payee,
      amount: Money.fromCents(
        input.direction === 'outflow' ? -input.amountCents : input.amountCents,
      ),
      date: input.date,
      notes: input.notes,
      status: current.status,
    } as const;
  }
}
