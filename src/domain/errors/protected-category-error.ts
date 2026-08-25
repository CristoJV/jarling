export class ProtectedCategoryError extends Error {
  constructor() {
    super('This category is managed by Jarling and cannot be changed.');
    this.name = 'ProtectedCategoryError';
  }
}
