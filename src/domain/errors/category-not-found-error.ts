export class CategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Category ${categoryId} was not found.`);
    this.name = 'CategoryNotFoundError';
  }
}
