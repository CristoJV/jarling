export class InvalidTransactionDateError extends Error {
  constructor() {
    super(
      'Transaction date must be a valid calendar date in YYYY-MM-DD format.',
    );
    this.name = 'InvalidTransactionDateError';
  }
}
