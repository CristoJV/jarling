import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import {
  createTag,
  assertTransactionTagLimit,
  tagNameKey,
} from '@/domain/entities/tag';
import { TagNotFoundError } from '@/domain/errors/tag-not-found-error';
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
  assertTransactionTagLimit(requestedIds);

  for (const id of requestedIds) {
    if (!(await tags.findById(id))) throw new TagNotFoundError(id);
  }

  const resolved = [...requestedIds];
  const pending = [];
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
    pending.push(tag);
    resolved.push(tag.id);
  }

  const unique = [...new Set(resolved)];
  assertTransactionTagLimit(unique);
  for (const tag of pending) await tags.save(tag);
  return unique;
}
