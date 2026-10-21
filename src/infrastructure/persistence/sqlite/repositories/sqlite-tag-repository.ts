import type { SQLiteDatabase } from 'expo-sqlite';

import type { Tag } from '@/domain/entities/tag';
import type { TagRepository } from '@/domain/repositories/tag-repository';

type TagRow = Readonly<{
  id: string;
  name: string;
  name_key: string;
  created_at: string;
  updated_at: string;
}>;

function tagFromRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    nameKey: row.name_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TAG_COLUMNS = 'id, name, name_key, created_at, updated_at';

export class SQLiteTagRepository implements TagRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async findAll(): Promise<readonly Tag[]> {
    const rows = await this.database.getAllAsync<TagRow>(
      `SELECT ${TAG_COLUMNS} FROM tags ORDER BY name COLLATE NOCASE ASC, id ASC`,
    );
    return rows.map(tagFromRow);
  }

  async findRecent(limit: number): Promise<readonly Tag[]> {
    const safeLimit = Math.min(20, Math.max(1, Math.trunc(limit)));
    const rows = await this.database.getAllAsync<TagRow>(
      `SELECT t.id, t.name, t.name_key, t.created_at, t.updated_at
       FROM tags t
       LEFT JOIN transaction_tags tt ON tt.tag_id = t.id
       GROUP BY t.id, t.name, t.name_key, t.created_at, t.updated_at
       ORDER BY coalesce(max(tt.attached_at), t.created_at) DESC,
                t.name COLLATE NOCASE ASC, t.id ASC
       LIMIT ?`,
      safeLimit,
    );
    return rows.map(tagFromRow);
  }

  async findById(id: string): Promise<Tag | null> {
    const row = await this.database.getFirstAsync<TagRow>(
      `SELECT ${TAG_COLUMNS} FROM tags WHERE id = ?`,
      id,
    );
    return row ? tagFromRow(row) : null;
  }

  async findByNameKey(nameKey: string): Promise<Tag | null> {
    const row = await this.database.getFirstAsync<TagRow>(
      `SELECT ${TAG_COLUMNS} FROM tags WHERE name_key = ?`,
      nameKey,
    );
    return row ? tagFromRow(row) : null;
  }

  async findByTransaction(transactionId: string): Promise<readonly Tag[]> {
    const rows = await this.database.getAllAsync<TagRow>(
      `SELECT t.id, t.name, t.name_key, t.created_at, t.updated_at
       FROM tags t
       JOIN transaction_tags tt ON tt.tag_id = t.id
       WHERE tt.transaction_id = ?
       ORDER BY t.name COLLATE NOCASE ASC, t.id ASC`,
      transactionId,
    );
    return rows.map(tagFromRow);
  }

  async save(tag: Tag): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO tags (id, name, name_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         name_key = excluded.name_key,
         updated_at = excluded.updated_at`,
      tag.id,
      tag.name,
      tag.nameKey,
      tag.createdAt,
      tag.updatedAt,
    );
  }

  async replaceTransactionTags(
    transactionIds: readonly string[],
    tagIds: readonly string[],
    attachedAt: string,
  ): Promise<void> {
    const desired = new Set(tagIds);
    for (const transactionId of new Set(transactionIds)) {
      const rows = await this.database.getAllAsync<{ tag_id: string }>(
        'SELECT tag_id FROM transaction_tags WHERE transaction_id = ?',
        transactionId,
      );
      const current = new Set(rows.map(({ tag_id }) => tag_id));
      for (const tagId of current) {
        if (!desired.has(tagId)) {
          await this.database.runAsync(
            'DELETE FROM transaction_tags WHERE transaction_id = ? AND tag_id = ?',
            transactionId,
            tagId,
          );
        }
      }
      for (const tagId of desired) {
        if (!current.has(tagId)) {
          await this.database.runAsync(
            `INSERT INTO transaction_tags (transaction_id, tag_id, attached_at)
             VALUES (?, ?, ?)`,
            transactionId,
            tagId,
            attachedAt,
          );
        }
      }
    }
  }
}
