export class CategoryRequiredForExpenseError extends Error {
  constructor() {
    super('Expenses require a category.');
    this.name = 'CategoryRequiredForExpenseError';
  }
}
