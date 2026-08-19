import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  updateTransaction,
  type Transaction,
} from '@/domain/entities/transaction';
import { CannotModifyReconciledTransactionError } from '@/domain/errors/cannot-modify-reconciled-transaction-error';
import { InvalidTransferError } from '@/domain/errors/invalid-transfer-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import { isCreditAccountType } from '@/domain/entities/account';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { paymentCategoryForAccount } from '@/domain/services/credit-card-payment';
import { Money } from '@/domain/value-objects/money';
import { parseTransferPair } from '@/domain/services/transfer-pair';

import { prepareTransferAccounts, type TransferInput } from './transfer-input';
import type { TransferPair } from './create-transfer';

export type UpdateTransferInput = TransferInput &
  Readonly<{ transactionGroupId: string }>;

export class UpdateTransfer {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateTransferInput): Promise<TransferPair> {
    const current = await this.transactions.findByGroup(
      input.transactionGroupId,
    );
    const pair = parseTransferPair(current, input.transactionGroupId);
    if (!pair) throw new InvalidTransferError('linked pair not found');
    if (current.some(({ status }) => status === 'reconciled')) {
      throw new CannotModifyReconciledTransactionError();
    }
    const { source: sourceAccount, destination: destinationAccount } =
      await prepareTransferAccounts(input, this.accounts);
    const updatedAt = this.clock.now().instant;
    const paymentCategory = isCreditAccountType(destinationAccount.type)
      ? paymentCategoryForAccount(
          await this.categories.findAll(),
          destinationAccount.id,
        )
      : undefined;
    const source = updateLeg(pair.source, {
      accountId: sourceAccount.id,
      categoryId:
        sourceAccount.onBudget && paymentCategory
          ? paymentCategory.id
          : undefined,
      payee: `Transfer to ${destinationAccount.name}`,
      amountCents: -input.amountCents,
      input,
      updatedAt,
    });
    const destination = updateLeg(pair.destination, {
      accountId: destinationAccount.id,
      payee: `Transfer from ${sourceAccount.name}`,
      amountCents: input.amountCents,
      input,
      updatedAt,
    });
    return this.unitOfWork.run(async () => {
      await this.transactions.save(source);
      await this.transactions.save(destination);
      return { source, destination };
    });
  }
}

function updateLeg(
  current: Transaction,
  values: Readonly<{
    accountId: string;
    categoryId?: string;
    payee: string;
    amountCents: number;
    input: UpdateTransferInput;
    updatedAt: string;
  }>,
): Transaction {
  return updateTransaction(current, {
    accountId: values.accountId,
    categoryId: values.categoryId,
    payee: values.payee,
    amount: Money.fromCents(values.amountCents),
    date: values.input.date,
    notes: values.input.notes,
    status: values.input.status,
    transactionGroupId: values.input.transactionGroupId,
    updatedAt: values.updatedAt,
  });
}
