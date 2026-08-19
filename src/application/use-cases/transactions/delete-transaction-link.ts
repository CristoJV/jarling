import type { UnitOfWork } from '@/application/ports/unit-of-work';
import type { TransactionLinkRepository } from '@/domain/repositories/transaction-link-repository';

export class DeleteTransactionLink {
  constructor(
    private readonly links: TransactionLinkRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(id: string): Promise<void> {
    return this.unitOfWork.run(() => this.links.delete(id));
  }
}
