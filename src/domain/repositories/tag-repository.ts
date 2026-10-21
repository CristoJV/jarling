import type { Tag } from '@/domain/entities/tag';

export interface TagRepository {
  findAll(): Promise<readonly Tag[]>;
  findRecent(limit: number): Promise<readonly Tag[]>;
  findById(id: string): Promise<Tag | null>;
  findByNameKey(nameKey: string): Promise<Tag | null>;
  findByTransaction(transactionId: string): Promise<readonly Tag[]>;
  save(tag: Tag): Promise<void>;
  replaceTransactionTags(
    transactionIds: readonly string[],
    tagIds: readonly string[],
    attachedAt: string,
  ): Promise<void>;
}
