export class CategoryGroupNotFoundError extends Error {
  constructor(groupId: string) {
    super(`Category group ${groupId} was not found.`);
    this.name = 'CategoryGroupNotFoundError';
  }
}
