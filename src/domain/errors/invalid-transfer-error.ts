export class InvalidTransferError extends Error {
  constructor(reason: string) {
    super(`Invalid transfer: ${reason}.`);
    this.name = 'InvalidTransferError';
  }
}
