export class InvalidMoneyError extends Error {
  constructor() {
    super('Money must be represented as a safe integer number of cents.');
    this.name = 'InvalidMoneyError';
  }
}
