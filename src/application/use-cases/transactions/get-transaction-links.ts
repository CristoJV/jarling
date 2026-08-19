import type { TransactionLinkRepository } from '@/domain/repositories/transaction-link-repository';

export class GetTransactionLinks {
  constructor(private readonly links: TransactionLinkRepository) {}

  execute(transactionId: string) {
    return this.links.findByTransaction(transactionId);
  }
}
