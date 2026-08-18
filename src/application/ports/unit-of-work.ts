export interface UnitOfWork {
  run<T>(task: () => Promise<T>): Promise<T>;
}
