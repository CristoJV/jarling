export type PlanPortabilityErrorCode =
  | 'decryption-failed'
  | 'corrupt-backup'
  | 'unsupported-format'
  | 'unsupported-version'
  | 'invalid-snapshot'
  | 'migration-failed'
  | 'backup-verification-failed'
  | 'restore-failed';

export class PlanPortabilityError extends Error {
  constructor(
    public readonly code: PlanPortabilityErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PlanPortabilityError';
  }
}
