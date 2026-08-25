export type BackupProgressPhase =
  'preparing' | 'snapshot' | 'encrypting' | 'saving';

export type RestoreResult = Readonly<{
  restored: boolean;
  preferences?: unknown;
}>;

export interface PlanRestoreSource {
  readonly encrypted: boolean;
  restore(password?: string): Promise<RestoreResult>;
}

export interface PlanPortability {
  exportData(preferences?: Readonly<Record<string, unknown>>): Promise<void>;
  createBackup(
    password: string,
    preferences?: Readonly<Record<string, unknown>>,
    onProgress?: (phase: BackupProgressPhase) => void,
  ): Promise<void>;
  selectRestoreSource(): Promise<PlanRestoreSource | null>;
}
