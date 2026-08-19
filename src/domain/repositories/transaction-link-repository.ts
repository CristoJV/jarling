import type { TransactionLink } from '@/domain/entities/transaction-link';

export interface TransactionLinkRepository {
  findByTransaction(transactionId: string): Promise<readonly TransactionLink[]>;
  save(link: TransactionLink): Promise<void>;
  delete(id: string): Promise<void>;
}
