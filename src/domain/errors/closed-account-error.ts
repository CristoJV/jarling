export class ClosedAccountError extends Error {
  constructor(accountId: string) {
    super(`Account ${accountId} is closed.`);
    this.name = 'ClosedAccountError';
  }
}
