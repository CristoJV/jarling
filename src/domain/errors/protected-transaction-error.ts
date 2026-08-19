export class ProtectedTransactionError extends Error {
  constructor(kind: string) {
    super(
      `${kind} transactions must be changed through their dedicated workflow`,
    );
    this.name = 'ProtectedTransactionError';
  }
}
