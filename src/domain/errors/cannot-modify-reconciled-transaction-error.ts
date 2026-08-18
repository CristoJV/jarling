export class CannotModifyReconciledTransactionError extends Error {
  constructor() {
    super('A reconciled transaction cannot be modified or deleted.');
    this.name = 'CannotModifyReconciledTransactionError';
  }
}
