import type { PlanDataStore } from '@/application/ports/plan-data-store';
import type { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';

export class DeletePlan {
  constructor(
    private readonly dataStore: PlanDataStore,
    private readonly ensureDefaultCategories: Pick<
      EnsureDefaultCategories,
      'execute'
    >,
  ) {}

  async execute(): Promise<void> {
    await this.dataStore.deleteAll();
    await this.ensureDefaultCategories.execute();
  }
}
