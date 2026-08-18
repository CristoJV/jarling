import type { UnitOfWork } from '@/application/ports/unit-of-work';

export class ImmediateUnitOfWork implements UnitOfWork {
  run<T>(task: () => Promise<T>): Promise<T> {
    return task();
  }
}
