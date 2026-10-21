export class TooManyTransactionTagsError extends Error {
  constructor() {
    super('A transaction cannot have more than 20 tags.');
    this.name = 'TooManyTransactionTagsError';
  }
}
