export class CategoryNotAllowedForTrackingAccountError extends Error {
  constructor() {
    super('Tracking account transactions cannot use budget categories.');
    this.name = 'CategoryNotAllowedForTrackingAccountError';
  }
}
