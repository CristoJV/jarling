export class TransactionNotFoundError extends Error {
  constructor(transactionId: string) {
    super(`Transaction ${transactionId} was not found.`);
    this.name = 'TransactionNotFoundError';
  }
}
