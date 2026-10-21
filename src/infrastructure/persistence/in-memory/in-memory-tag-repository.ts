import type { Tag } from '@/domain/entities/tag';
import type { TagRepository } from '@/domain/repositories/tag-repository';

export class InMemoryTagRepository implements TagRepository {
  private readonly tags = new Map<string, Tag>();
  private readonly associations = new Map<string, Map<string, string>>();

  findTagIdsByTransaction(transactionId: string): readonly string[] {
    return [...(this.associations.get(transactionId)?.keys() ?? [])];
  }

  async findAll(): Promise<readonly Tag[]> {
    return [...this.tags.values()].sort((left, right) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
    );
  }

  async findRecent(limit: number): Promise<readonly Tag[]> {
    const lastUsed = new Map<string, string>();
    for (const associations of this.associations.values()) {
      for (const [tagId, attachedAt] of associations) {
        if ((lastUsed.get(tagId) ?? '') < attachedAt) {
          lastUsed.set(tagId, attachedAt);
        }
      }
    }
    return [...this.tags.values()]
      .sort(
        (left, right) =>
          (lastUsed.get(right.id) ?? right.createdAt).localeCompare(
            lastUsed.get(left.id) ?? left.createdAt,
          ) || left.name.localeCompare(right.name),
      )
      .slice(0, Math.max(1, Math.trunc(limit)));
  }

  async findById(id: string): Promise<Tag | null> {
    return this.tags.get(id) ?? null;
  }

  async findByNameKey(nameKey: string): Promise<Tag | null> {
    return (
      [...this.tags.values()].find((tag) => tag.nameKey === nameKey) ?? null
    );
  }

  async findByTransaction(transactionId: string): Promise<readonly Tag[]> {
    const ids = this.associations.get(transactionId)?.keys() ?? [];
    return [...ids]
      .map((id) => this.tags.get(id))
      .filter((tag): tag is Tag => tag !== undefined)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async save(tag: Tag): Promise<void> {
    const duplicate = await this.findByNameKey(tag.nameKey);
    if (duplicate && duplicate.id !== tag.id) {
      throw new Error('A tag with this normalized name already exists.');
    }
    this.tags.set(tag.id, tag);
  }

  async replaceTransactionTags(
    transactionIds: readonly string[],
    tagIds: readonly string[],
    attachedAt: string,
  ): Promise<void> {
    for (const transactionId of transactionIds) {
      const current = this.associations.get(transactionId) ?? new Map();
      const desired = new Set(tagIds);
      for (const tagId of current.keys()) {
        if (!desired.has(tagId)) current.delete(tagId);
      }
      for (const tagId of desired) {
        if (!this.tags.has(tagId)) throw new Error('Unknown tag.');
        if (!current.has(tagId)) current.set(tagId, attachedAt);
      }
      this.associations.set(transactionId, current);
    }
  }
}
