export class AccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Account ${accountId} was not found.`);
    this.name = 'AccountNotFoundError';
  }
}
