export class CategoryReassignmentRequiredError extends Error {
  constructor(readonly transactionCount: number) {
    super('Category activity must be reassigned before deletion.');
    this.name = 'CategoryReassignmentRequiredError';
  }
}
