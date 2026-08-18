export class InvalidCategoryTargetError extends Error {
  constructor(reason: string) {
    super(`Invalid category target: ${reason}.`);
    this.name = 'InvalidCategoryTargetError';
  }
}
