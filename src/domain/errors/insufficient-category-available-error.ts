export class InsufficientCategoryAvailableError extends Error {
  constructor() {
    super('The source category does not have enough Available.');
    this.name = 'InsufficientCategoryAvailableError';
  }
}
