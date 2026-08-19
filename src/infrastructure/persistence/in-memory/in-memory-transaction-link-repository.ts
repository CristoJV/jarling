import type { TransactionLink } from '@/domain/entities/transaction-link';
import type { TransactionLinkRepository } from '@/domain/repositories/transaction-link-repository';

export class InMemoryTransactionLinkRepository implements TransactionLinkRepository {
  private readonly links = new Map<string, TransactionLink>();

  async findByTransaction(
    transactionId: string,
  ): Promise<readonly TransactionLink[]> {
    return [...this.links.values()].filter(
      (link) =>
        link.sourceTransactionId === transactionId ||
        link.targetTransactionId === transactionId,
    );
  }

  async save(link: TransactionLink): Promise<void> {
    const duplicate = [...this.links.values()].some(
      (current) =>
        current.sourceTransactionId === link.sourceTransactionId &&
        current.targetTransactionId === link.targetTransactionId &&
        current.type === link.type &&
        current.id !== link.id,
    );
    if (duplicate) throw new Error('This transaction link already exists.');
    this.links.set(link.id, link);
  }

  async delete(id: string): Promise<void> {
    this.links.delete(id);
  }
}
