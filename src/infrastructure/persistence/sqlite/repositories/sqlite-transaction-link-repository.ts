import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  TransactionLink,
  TransactionLinkType,
} from '@/domain/entities/transaction-link';
import type { TransactionLinkRepository } from '@/domain/repositories/transaction-link-repository';

type Row = {
  id: string;
  source_transaction_id: string;
  target_transaction_id: string;
  link_type: TransactionLinkType;
  created_at: string;
};

export class SQLiteTransactionLinkRepository implements TransactionLinkRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findByTransaction(
    transactionId: string,
  ): Promise<readonly TransactionLink[]> {
    const rows = await this.database.getAllAsync<Row>(
      `SELECT id, source_transaction_id, target_transaction_id, link_type, created_at
       FROM transaction_links
       WHERE source_transaction_id = ? OR target_transaction_id = ?
       ORDER BY created_at, id`,
      transactionId,
      transactionId,
    );
    return rows.map((row) => ({
      id: row.id,
      sourceTransactionId: row.source_transaction_id,
      targetTransactionId: row.target_transaction_id,
      type: row.link_type,
      createdAt: row.created_at,
    }));
  }

  async save(link: TransactionLink): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO transaction_links (
         id, source_transaction_id, target_transaction_id, link_type, created_at
       ) VALUES (?, ?, ?, ?, ?)`,
      link.id,
      link.sourceTransactionId,
      link.targetTransactionId,
      link.type,
      link.createdAt,
    );
  }

  async delete(id: string): Promise<void> {
    await this.database.runAsync(
      'DELETE FROM transaction_links WHERE id = ?',
      id,
    );
  }
}
