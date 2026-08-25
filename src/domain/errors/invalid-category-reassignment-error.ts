export class InvalidCategoryReassignmentError extends Error {
  constructor() {
    super('Choose a different valid destination category.');
    this.name = 'InvalidCategoryReassignmentError';
  }
}
