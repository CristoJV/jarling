import { InvalidTagNameError } from '@/domain/errors/invalid-tag-name-error';

export const TAG_NAME_MAX_LENGTH = 60;
export const TRANSACTION_TAG_LIMIT = 20;

export type Tag = Readonly<{
  id: string;
  name: string;
  nameKey: string;
  createdAt: string;
  updatedAt: string;
}>;

export function normalizeTagName(value: string): string {
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const length = Array.from(normalized).length;
  if (length === 0 || length > TAG_NAME_MAX_LENGTH) {
    throw new InvalidTagNameError();
  }
  return normalized;
}

export function tagNameKey(value: string): string {
  return normalizeTagName(value).toLowerCase();
}

export function createTag(
  properties: Omit<Tag, 'name' | 'nameKey'> & { name: string },
): Tag {
  const name = normalizeTagName(properties.name);
  return {
    ...properties,
    name,
    nameKey: tagNameKey(name),
  };
}
