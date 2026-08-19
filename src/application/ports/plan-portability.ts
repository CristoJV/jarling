export interface PlanPortability {
  exportData(preferences?: Readonly<Record<string, unknown>>): Promise<void>;
  createBackup(
    password: string,
    preferences?: Readonly<Record<string, unknown>>,
  ): Promise<void>;
  restoreBackup(password: string): Promise<
    Readonly<{
      restored: boolean;
      preferences?: unknown;
    }>
  >;
}
