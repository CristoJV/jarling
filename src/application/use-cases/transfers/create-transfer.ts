import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createTransaction,
  type Transaction,
} from '@/domain/entities/transaction';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { Money } from '@/domain/value-objects/money';

import { prepareTransferInput, type TransferInput } from './transfer-input';

export type TransferPair = Readonly<{
  source: Transaction;
  destination: Transaction;
}>;

export class CreateTransfer {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: TransferInput): Promise<TransferPair> {
    const {
      source: sourceAccount,
      destination: destinationAccount,
      plan,
    } = await prepareTransferInput(input, this.accounts, this.categories);
    const groupId = this.ids.next();
    const { instant } = this.clock.now();
    const common = {
      date: input.date,
      notes: input.notes,
      status: input.status,
      kind: 'transfer',
      transactionGroupId: groupId,
      createdAt: instant,
      updatedAt: instant,
    } as const;
    const source = createTransaction({
      ...common,
      id: this.ids.next(),
      accountId: sourceAccount.id,
      ...(plan.sourceCategoryId ? { categoryId: plan.sourceCategoryId } : {}),
      payee: plan.sourcePayee,
      amount: Money.fromCents(-input.amountCents),
    });
    const destination = createTransaction({
      ...common,
      id: this.ids.next(),
      accountId: destinationAccount.id,
      payee: plan.destinationPayee,
      amount: Money.fromCents(input.amountCents),
    });
    return this.unitOfWork.run(async () => {
      await this.transactions.save(source);
      await this.transactions.save(destination);
      return { source, destination };
    });
  }
}
