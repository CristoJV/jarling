export class InvalidCategoryNotesError extends Error {
  constructor() {
    super('Category notes are too long.');
    this.name = 'InvalidCategoryNotesError';
  }
}
