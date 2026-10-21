import type { TagRepository } from '@/domain/repositories/tag-repository';

export class GetTags {
  constructor(private readonly tags: TagRepository) {}

  async execute() {
    const [all, recent] = await Promise.all([
      this.tags.findAll(),
      this.tags.findRecent(3),
    ]);
    return { all, recent } as const;
  }
}
