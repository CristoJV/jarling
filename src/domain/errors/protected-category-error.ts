export class ProtectedCategoryError extends Error {
  constructor() {
    super('Uncategorized is managed by Jarling and cannot be changed.');
    this.name = 'ProtectedCategoryError';
  }
}
