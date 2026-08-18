export class InvalidTransactionAmountError extends Error {
  constructor() {
    super('Transaction amount must be a positive integer number of cents.');
    this.name = 'InvalidTransactionAmountError';
  }
}
