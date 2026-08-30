export class CategoryInflowNotSupportedForAccountError extends Error {
  constructor() {
    super('Category inflows are currently supported only for cash accounts.');
    this.name = 'CategoryInflowNotSupportedForAccountError';
  }
}
