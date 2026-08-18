export class InvalidReconciliationError extends Error {
  constructor(reason: string) {
    super(`Invalid reconciliation: ${reason}.`);
    this.name = 'InvalidReconciliationError';
  }
}
