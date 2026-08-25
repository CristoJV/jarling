import type { TransactionStatus } from '@/domain/entities/transaction';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { CategoryNotAllowedForTrackingAccountError } from '@/domain/errors/category-not-allowed-for-tracking-account-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import { InvalidTransactionAmountError } from '@/domain/errors/invalid-transaction-amount-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import { Money } from '@/domain/value-objects/money';

export type EditableTransactionStatus = Exclude<
  TransactionStatus,
  'reconciled'
>;

type TransactionInputBase = Readonly<{
  accountId: string;
  amountCents: number;
  payee?: string;
  date: string;
  notes?: string;
  status: EditableTransactionStatus;
}>;

export type TransactionInput =
  | (TransactionInputBase & Readonly<{ kind: 'expense'; categoryId?: string }>)
  | (TransactionInputBase & Readonly<{ kind: 'income'; categoryId?: never }>);

export type PreparedTransactionInput = Readonly<{
  accountId: string;
  categoryId?: string;
  payee?: string;
  amount: Money;
  date: string;
  notes?: string;
  status: EditableTransactionStatus;
}>;

export async function prepareTransactionInput(
  input: TransactionInput,
  accounts: AccountRepository,
  categories: CategoryRepository,
): Promise<PreparedTransactionInput> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new InvalidTransactionAmountError();
  }

  const account = await accounts.findById(input.accountId);
  if (!account) {
    throw new AccountNotFoundError(input.accountId);
  }

  if (account.closed) {
    throw new ClosedAccountError(account.id);
  }

  if (input.kind === 'expense') {
    if (!account.onBudget) {
      throw new CategoryNotAllowedForTrackingAccountError();
    }
    if (input.categoryId && !(await categories.findById(input.categoryId))) {
      throw new CategoryNotFoundError(input.categoryId);
    }

    return {
      accountId: input.accountId,
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      payee: input.payee,
      amount: Money.fromCents(-input.amountCents),
      date: input.date,
      notes: input.notes,
      status: input.status,
    };
  }

  return {
    accountId: input.accountId,
    payee: input.payee,
    amount: Money.fromCents(input.amountCents),
    date: input.date,
    notes: input.notes,
    status: input.status,
  };
}
