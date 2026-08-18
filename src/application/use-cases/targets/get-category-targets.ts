import type { CategoryTarget } from '@/domain/entities/category-target';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';

export class GetCategoryTargets {
  constructor(private readonly targets: CategoryTargetRepository) {}

  execute(): Promise<readonly CategoryTarget[]> {
    return this.targets.findAll();
  }
}
