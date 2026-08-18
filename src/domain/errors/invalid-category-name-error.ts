export class InvalidCategoryNameError extends Error {
  constructor(kind: 'group' | 'category') {
    super(
      `${kind === 'group' ? 'Category group' : 'Category'} name cannot be empty.`,
    );
    this.name = 'InvalidCategoryNameError';
  }
}
