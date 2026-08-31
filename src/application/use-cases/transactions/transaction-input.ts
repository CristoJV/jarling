import type { TransactionStatus } from '@/domain/entities/transaction';
import {
  supportsBudgetCategories,
  supportsCategoryInflows,
} from '@/domain/entities/account';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { CategoryNotAllowedForTrackingAccountError } from '@/domain/errors/category-not-allowed-for-tracking-account-error';
import { CategoryInflowNotSupportedForAccountError } from '@/domain/errors/category-inflow-not-supported-for-account-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import { InvalidTransactionAmountError } from '@/domain/errors/invalid-transaction-amount-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
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
  | (TransactionInputBase &
      Readonly<{ direction: 'outflow'; categoryId?: string }>)
  | (TransactionInputBase &
      Readonly<{ direction: 'inflow'; categoryId?: string }>);

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

  if (input.direction === 'outflow') {
    if (!supportsBudgetCategories(account)) {
      throw new CategoryNotAllowedForTrackingAccountError();
    }
    const category = input.categoryId
      ? await requireNormalCategory(input.categoryId, categories)
      : undefined;

    return {
      accountId: input.accountId,
      ...(category ? { categoryId: category.id } : {}),
      payee: input.payee,
      amount: Money.fromCents(-input.amountCents),
      date: input.date,
      notes: input.notes,
      status: input.status,
    };
  }

  const category = input.categoryId
    ? await requireNormalCategory(input.categoryId, categories)
    : undefined;
  if (category && !supportsBudgetCategories(account)) {
    throw new CategoryNotAllowedForTrackingAccountError();
  }
  if (category && !supportsCategoryInflows(account)) {
    throw new CategoryInflowNotSupportedForAccountError();
  }

  return {
    accountId: input.accountId,
    ...(category ? { categoryId: category.id } : {}),
    payee: input.payee,
    amount: Money.fromCents(input.amountCents),
    date: input.date,
    notes: input.notes,
    status: input.status,
  };
}

async function requireNormalCategory(
  categoryId: string,
  categories: CategoryRepository,
) {
  const category = await categories.findById(categoryId);
  if (!category) throw new CategoryNotFoundError(categoryId);
  if (category.linkedAccountId) throw new ProtectedCategoryError();
  return category;
}
