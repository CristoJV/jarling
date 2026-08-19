import type { PlanDataStore } from '@/application/ports/plan-data-store';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import type { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';

export class DeletePlan {
  constructor(
    private readonly dataStore: PlanDataStore,
    private readonly ensureDefaultCategories: Pick<
      EnsureDefaultCategories,
      'executeInCurrentTransaction'
    >,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(): Promise<void> {
    await this.unitOfWork.run(async () => {
      await this.dataStore.deleteAll();
      await this.ensureDefaultCategories.executeInCurrentTransaction();
    });
  }
}
