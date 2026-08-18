export class InsufficientReadyToAssignError extends Error {
  constructor() {
    super('The assignment would make Ready to Assign negative.');
    this.name = 'InsufficientReadyToAssignError';
  }
}
