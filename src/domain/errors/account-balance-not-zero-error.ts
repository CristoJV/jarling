export class AccountBalanceNotZeroError extends Error {
  constructor() {
    super('An account must have a zero balance before it can be closed');
    this.name = 'AccountBalanceNotZeroError';
  }
}
