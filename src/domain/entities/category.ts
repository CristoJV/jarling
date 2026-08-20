import { InvalidCategoryNameError } from '@/domain/errors/invalid-category-name-error';
import { InvalidCategoryNotesError } from '@/domain/errors/invalid-category-notes-error';

export const CATEGORY_NOTES_MAX_LENGTH = 4_000;

export type Category = Readonly<{
  id: string;
  groupId: string;
  name: string;
  notes?: string;
  linkedAccountId?: string;
  hidden: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}>;

function categoryName(name: string): string {
  const normalized = name.trim();

  if (normalized.length === 0) {
    throw new InvalidCategoryNameError('category');
  }

  return normalized;
}

function categoryNotes(notes: string | undefined): string | undefined {
  const normalized = notes?.trim();
  if (!normalized) return undefined;
  if (normalized.length > CATEGORY_NOTES_MAX_LENGTH) {
    throw new InvalidCategoryNotesError();
  }
  return normalized;
}

export function createCategory(properties: Category): Category {
  return {
    ...properties,
    name: categoryName(properties.name),
    notes: categoryNotes(properties.notes),
  };
}

export function setCategoryNotes(
  category: Category,
  notes: string,
  updatedAt: string,
): Category {
  const normalized = categoryNotes(notes);
  const { notes: _currentNotes, ...withoutNotes } = category;
  return {
    ...withoutNotes,
    ...(normalized ? { notes: normalized } : {}),
    updatedAt,
  };
}

export function renameCategory(
  category: Category,
  name: string,
  updatedAt: string,
): Category {
  return {
    ...category,
    name: categoryName(name),
    updatedAt,
  };
}

export function setCategoryHidden(
  category: Category,
  hidden: boolean,
  updatedAt: string,
): Category {
  return {
    ...category,
    hidden,
    updatedAt,
  };
}
