import { InvalidCategoryNameError } from '@/domain/errors/invalid-category-name-error';

export type Category = Readonly<{
  id: string;
  groupId: string;
  name: string;
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

export function createCategory(properties: Category): Category {
  return {
    ...properties,
    name: categoryName(properties.name),
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
