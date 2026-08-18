export class InvalidBudgetMoveError extends Error {
  constructor(message = 'Budget movement is invalid.') {
    super(message);
    this.name = 'InvalidBudgetMoveError';
  }
}
