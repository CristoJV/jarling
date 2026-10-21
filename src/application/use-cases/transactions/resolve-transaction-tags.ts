import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import {
  createTag,
  tagNameKey,
  TRANSACTION_TAG_LIMIT,
} from '@/domain/entities/tag';
import { TagNotFoundError } from '@/domain/errors/tag-not-found-error';
import { TooManyTransactionTagsError } from '@/domain/errors/too-many-transaction-tags-error';
import type { TagRepository } from '@/domain/repositories/tag-repository';

export type TransactionTagsInput = Readonly<{
  tagIds?: readonly string[];
  newTagNames?: readonly string[];
}>;

export function hasTransactionTagChanges(input: TransactionTagsInput): boolean {
  return input.tagIds !== undefined || input.newTagNames !== undefined;
}

export async function resolveTransactionTagIds(
  input: TransactionTagsInput,
  tags: TagRepository,
  ids: IdGenerator,
  clock: Clock,
): Promise<readonly string[]> {
  const requestedIds = [...new Set(input.tagIds ?? [])];
  const namesByKey = new Map(
    (input.newTagNames ?? []).map((name) => [tagNameKey(name), name]),
  );
  if (requestedIds.length + namesByKey.size > TRANSACTION_TAG_LIMIT) {
    throw new TooManyTransactionTagsError();
  }

  for (const id of requestedIds) {
    if (!(await tags.findById(id))) throw new TagNotFoundError(id);
  }

  const resolved = [...requestedIds];
  for (const [nameKey, name] of namesByKey) {
    const existing = await tags.findByNameKey(nameKey);
    if (existing) {
      resolved.push(existing.id);
      continue;
    }
    const instant = clock.now().instant;
    const tag = createTag({
      id: ids.next(),
      name,
      createdAt: instant,
      updatedAt: instant,
    });
    await tags.save(tag);
    resolved.push(tag.id);
  }

  const unique = [...new Set(resolved)];
  if (unique.length > TRANSACTION_TAG_LIMIT) {
    throw new TooManyTransactionTagsError();
  }
  return unique;
}
