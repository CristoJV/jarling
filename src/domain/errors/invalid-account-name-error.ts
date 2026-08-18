export class InvalidAccountNameError extends Error {
  constructor() {
    super('Account name cannot be empty.');
    this.name = 'InvalidAccountNameError';
  }
}
