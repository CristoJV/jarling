import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import {
  createTransactionLink,
  type TransactionLink,
  type TransactionLinkType,
} from '@/domain/entities/transaction-link';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import type { TransactionLinkRepository } from '@/domain/repositories/transaction-link-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

export class CreateTransactionLink {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly links: TransactionLinkRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    sourceTransactionId: string;
    targetTransactionId: string;
    type: TransactionLinkType;
  }): Promise<TransactionLink> {
    if (input.sourceTransactionId === input.targetTransactionId) {
      throw new TypeError('A transaction cannot be linked to itself.');
    }
    const [source, target] = await Promise.all([
      this.transactions.findById(input.sourceTransactionId),
      this.transactions.findById(input.targetTransactionId),
    ]);
    if (!source) throw new TransactionNotFoundError(input.sourceTransactionId);
    if (!target) throw new TransactionNotFoundError(input.targetTransactionId);
    const link = createTransactionLink({
      id: this.ids.next(),
      ...input,
      createdAt: this.clock.now().instant,
    });
    return this.unitOfWork.run(async () => {
      await this.links.save(link);
      return link;
    });
  }
}
