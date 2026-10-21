export class TagNotFoundError extends Error {
  constructor(tagId: string) {
    super(`Tag ${tagId} was not found.`);
    this.name = 'TagNotFoundError';
  }
}
