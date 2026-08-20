export const UNCATEGORIZED_GROUP_ID = 'system-group-uncategorized';
export const UNCATEGORIZED_CATEGORY_ID = 'default-category-uncategorized';

export function isProtectedCategory(categoryId: string): boolean {
  return categoryId === UNCATEGORIZED_CATEGORY_ID;
}

export function isProtectedCategoryGroup(groupId: string): boolean {
  return groupId === UNCATEGORIZED_GROUP_ID;
}
