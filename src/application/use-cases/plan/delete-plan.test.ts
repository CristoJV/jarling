import { DeletePlan } from './delete-plan';

describe('DeletePlan', () => {
  it('deletes plan data before recreating default categories', async () => {
    const events: string[] = [];
    const useCase = new DeletePlan(
      { deleteAll: async () => void events.push('delete') },
      { execute: async () => void events.push('defaults') },
    );

    await useCase.execute();

    expect(events).toEqual(['delete', 'defaults']);
  });

  it('does not recreate defaults when deletion fails', async () => {
    const ensureDefaults = jest.fn(async () => undefined);
    const useCase = new DeletePlan(
      {
        deleteAll: async () => {
          throw new Error('delete failed');
        },
      },
      { execute: ensureDefaults },
    );

    await expect(useCase.execute()).rejects.toThrow('delete failed');
    expect(ensureDefaults).not.toHaveBeenCalled();
  });
});
