import type { TransactionStatus } from '@/domain/entities/transaction';
import { isCreditAccountType } from '@/domain/entities/account';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import { InvalidTransferError } from '@/domain/errors/invalid-transfer-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import { planTransferLegs } from '@/domain/services/transfer-pair';

export type TransferInput = Readonly<{
  kind: 'transfer';
  sourceAccountId: string;
  destinationAccountId: string;
  amountCents: number;
  date: string;
  notes?: string;
  status: Exclude<TransactionStatus, 'reconciled'>;
}>;

export async function prepareTransferInput(
  input: TransferInput,
  accounts: AccountRepository,
  categories: CategoryRepository,
) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new InvalidTransferError('amount must be a positive integer');
  }
  if (input.sourceAccountId === input.destinationAccountId) {
    throw new InvalidTransferError('accounts must be different');
  }
  const [source, destination] = await Promise.all([
    accounts.findById(input.sourceAccountId),
    accounts.findById(input.destinationAccountId),
  ]);
  if (!source) throw new AccountNotFoundError(input.sourceAccountId);
  if (!destination) throw new AccountNotFoundError(input.destinationAccountId);
  if (source.closed) throw new ClosedAccountError(source.id);
  if (destination.closed) throw new ClosedAccountError(destination.id);
  const availableCategories = isCreditAccountType(destination.type)
    ? await categories.findAll()
    : [];
  return {
    source,
    destination,
    plan: planTransferLegs(source, destination, availableCategories),
  };
}
