export class InvalidTagNameError extends Error {
  constructor() {
    super('Tag names must contain between 1 and 60 characters.');
    this.name = 'InvalidTagNameError';
  }
}
