import { InvalidCategoryNameError } from '@/domain/errors/invalid-category-name-error';

export type CategoryGroup = Readonly<{
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}>;

function categoryGroupName(name: string): string {
  const normalized = name.trim();

  if (normalized.length === 0) {
    throw new InvalidCategoryNameError('group');
  }

  return normalized;
}

export function createCategoryGroup(properties: CategoryGroup): CategoryGroup {
  return {
    ...properties,
    name: categoryGroupName(properties.name),
  };
}

export function renameCategoryGroup(
  group: CategoryGroup,
  name: string,
  updatedAt: string,
): CategoryGroup {
  return {
    ...group,
    name: categoryGroupName(name),
    updatedAt,
  };
}
