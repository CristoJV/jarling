import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createAccount,
  isCreditAccountType,
  type Account,
  type AccountType,
} from '@/domain/entities/account';
import { createCategory } from '@/domain/entities/category';
import { createCategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import {
  CREDIT_CARD_PAYMENT_GROUP_ID,
  CREDIT_CARD_PAYMENT_GROUP_NAME,
  creditCardPaymentCategoryId,
} from '@/domain/services/credit-card-payment';
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
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
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
      kind: 'opening_balance',
      createdAt: instant,
      updatedAt: instant,
    };
    const groups = isCreditAccountType(account.type)
      ? await this.groups.findAll()
      : [];
    const paymentGroup = groups.find(
      ({ id }) => id === CREDIT_CARD_PAYMENT_GROUP_ID,
    );
    const paymentCategory = isCreditAccountType(account.type)
      ? createCategory({
          id: creditCardPaymentCategoryId(account.id),
          groupId: CREDIT_CARD_PAYMENT_GROUP_ID,
          name: `💳 ${account.name}`,
          linkedAccountId: account.id,
          hidden: false,
          sortOrder: (
            await this.categories.findByGroup(CREDIT_CARD_PAYMENT_GROUP_ID)
          ).length,
          createdAt: instant,
          updatedAt: instant,
        })
      : undefined;

    return this.unitOfWork.run(async () => {
      await this.accounts.save(account);
      if (paymentCategory && !paymentGroup) {
        await this.groups.save(
          createCategoryGroup({
            id: CREDIT_CARD_PAYMENT_GROUP_ID,
            name: CREDIT_CARD_PAYMENT_GROUP_NAME,
            sortOrder:
              groups.reduce(
                (maximum, group) => Math.max(maximum, group.sortOrder),
                -1,
              ) + 1,
            createdAt: instant,
            updatedAt: instant,
          }),
        );
      }
      if (paymentCategory) await this.categories.save(paymentCategory);
      await this.transactions.save(openingBalance);
      return account;
    });
  }
}
