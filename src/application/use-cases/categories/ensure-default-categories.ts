import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { createCategoryGroup } from '@/domain/entities/category-group';
import { createCategory } from '@/domain/entities/category';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';

export const DEFAULT_CATEGORY_GROUPS = [
  {
    id: 'default-group-bills',
    name: 'Bills',
    categories: [
      { id: 'default-category-rent-mortgage', name: '🏠 Rent/Mortgage' },
      { id: 'default-category-phone-internet', name: '📱 Phone & Internet' },
      { id: 'default-category-utilities', name: '⚡ Utilities' },
    ],
  },
  {
    id: 'default-group-needs',
    name: 'Needs',
    categories: [
      { id: 'default-category-groceries', name: '🛒 Groceries' },
      { id: 'default-category-transportation', name: '🚗 Transportation' },
    ],
  },
  { id: 'default-group-subscriptions', name: 'Subscriptions', categories: [] },
  { id: 'default-group-wants', name: 'Wants', categories: [] },
] as const;

export class EnsureDefaultCategories {
  constructor(
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<void> {
    await this.unitOfWork.run(() => this.executeInCurrentTransaction());
  }

  /**
   * Recreates missing defaults without opening a transaction. This is used by
   * compound operations that already own the application UnitOfWork.
   */
  async executeInCurrentTransaction(): Promise<void> {
    const existingGroups = await this.groups.findAll();
    const existingCategories = await this.categories.findAll();
    const groupIds = new Set(existingGroups.map(({ id }) => id));
    const categoryIds = new Set(existingCategories.map(({ id }) => id));
    let nextGroupOrder =
      existingGroups.reduce(
        (maximum, group) => Math.max(maximum, group.sortOrder),
        -1,
      ) + 1;
    const { instant } = this.clock.now();

    for (const definition of DEFAULT_CATEGORY_GROUPS) {
      if (!groupIds.has(definition.id)) {
        await this.groups.save(
          createCategoryGroup({
            id: definition.id,
            name: definition.name,
            sortOrder: nextGroupOrder,
            createdAt: instant,
            updatedAt: instant,
          }),
        );
        nextGroupOrder += 1;
      }

      const existingInGroup = existingCategories.filter(
        ({ groupId }) => groupId === definition.id,
      );
      let nextCategoryOrder =
        existingInGroup.reduce(
          (maximum, category) => Math.max(maximum, category.sortOrder),
          -1,
        ) + 1;

      for (const categoryDefinition of definition.categories) {
        if (!categoryIds.has(categoryDefinition.id)) {
          await this.categories.save(
            createCategory({
              id: categoryDefinition.id,
              groupId: definition.id,
              name: categoryDefinition.name,
              hidden: false,
              sortOrder: nextCategoryOrder,
              createdAt: instant,
              updatedAt: instant,
            }),
          );
          nextCategoryOrder += 1;
        }
      }
    }
  }
}
