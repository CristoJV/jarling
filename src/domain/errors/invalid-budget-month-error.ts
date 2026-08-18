export class InvalidBudgetMonthError extends Error {
  constructor() {
    super('Budget month must be a valid month in YYYY-MM format.');
    this.name = 'InvalidBudgetMonthError';
  }
}
