import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createTransaction,
  type Transaction,
} from '@/domain/entities/transaction';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { ClosedAccountError } from '@/domain/errors/closed-account-error';
import { InvalidReconciliationError } from '@/domain/errors/invalid-reconciliation-error';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { calculateAccountBalanceState } from '@/domain/services/calculate-account-balance';
import { Money } from '@/domain/value-objects/money';

export type ReconcileAccountInput = Readonly<{
  accountId: string;
  actualBalanceCents: number;
  createAdjustment: boolean;
}>;

export type ReconciliationResult = Readonly<{
  reconciledCount: number;
  adjustment?: Transaction;
}>;

export class ReconcileAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: ReconcileAccountInput): Promise<ReconciliationResult> {
    if (!Number.isSafeInteger(input.actualBalanceCents)) {
      throw new InvalidReconciliationError('actual balance must use cents');
    }
    const now = this.clock.now();
    return this.unitOfWork.run(async () => {
      const account = await this.accounts.findById(input.accountId);
      if (!account) throw new AccountNotFoundError(input.accountId);
      if (account.closed) throw new ClosedAccountError(input.accountId);

      const current = await this.transactions.findAll({
        accountId: input.accountId,
        dateTo: now.date,
      });
      const balances = calculateAccountBalanceState(current);
      const differenceCents = input.actualBalanceCents - balances.cleared.cents;
      if (differenceCents !== 0 && !input.createAdjustment) {
        throw new InvalidReconciliationError(
          'the confirmed balance does not match the cleared balance',
        );
      }

      const reconcilable = current.filter(({ status }) => status === 'cleared');
      for (const transaction of reconcilable) {
        await this.transactions.save({
          ...transaction,
          status: 'reconciled',
          updatedAt: now.instant,
        });
      }

      const adjustment =
        differenceCents === 0
          ? undefined
          : createTransaction({
              id: this.ids.next(),
              accountId: input.accountId,
              payee: 'Reconciliation Balance Adjustment',
              amount: Money.fromCents(differenceCents),
              date: now.date,
              notes: 'Created to match the confirmed bank balance.',
              status: 'reconciled',
              kind: 'reconciliation_adjustment',
              createdAt: now.instant,
              updatedAt: now.instant,
            });
      if (adjustment) await this.transactions.save(adjustment);

      return {
        reconciledCount: reconcilable.length + (adjustment ? 1 : 0),
        ...(adjustment ? { adjustment } : {}),
      };
    });
  }
}
