export class CategoryInflowNotSupportedForAccountError extends Error {
  constructor() {
    super(
      'Category inflows are supported only for accounts included in the budget.',
    );
    this.name = 'CategoryInflowNotSupportedForAccountError';
  }
}
