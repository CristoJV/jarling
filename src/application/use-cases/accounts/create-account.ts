import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createAccount,
  type Account,
  type AccountType,
} from '@/domain/entities/account';
import type { Transaction } from '@/domain/entities/transaction';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { Money } from '@/domain/value-objects/money';

export type CreateAccountInput = Readonly<{
  name: string;
  type: AccountType;
  onBudget: boolean;
  openingBalanceCents: number;
}>;

export class CreateAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateAccountInput): Promise<Account> {
    const { instant, date } = this.clock.now();
    const account = createAccount({
      id: this.ids.next(),
      name: input.name,
      type: input.type,
      onBudget: input.onBudget,
      createdAt: instant,
      updatedAt: instant,
    });
    const openingBalance: Transaction = {
      id: this.ids.next(),
      accountId: account.id,
      payee: 'Opening Balance',
      amount: Money.fromCents(input.openingBalanceCents),
      date,
      status: 'cleared',
      createdAt: instant,
      updatedAt: instant,
    };

    return this.unitOfWork.run(async () => {
      await this.accounts.save(account);
      await this.transactions.save(openingBalance);
      return account;
    });
  }
}
