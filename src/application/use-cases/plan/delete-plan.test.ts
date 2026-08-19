import { DeletePlan } from './delete-plan';

describe('DeletePlan', () => {
  it('deletes plan data before recreating default categories', async () => {
    const events: string[] = [];
    const useCase = new DeletePlan(
      { deleteAll: async () => void events.push('delete') },
      {
        executeInCurrentTransaction: async () => void events.push('defaults'),
      },
      {
        run: async (task) => {
          events.push('begin');
          const result = await task();
          events.push('commit');
          return result;
        },
      },
    );

    await useCase.execute();

    expect(events).toEqual(['begin', 'delete', 'defaults', 'commit']);
  });

  it('does not recreate defaults when deletion fails', async () => {
    const ensureDefaults = jest.fn(async () => undefined);
    const useCase = new DeletePlan(
      {
        deleteAll: async () => {
          throw new Error('delete failed');
        },
      },
      { executeInCurrentTransaction: ensureDefaults },
      { run: (task) => task() },
    );

    await expect(useCase.execute()).rejects.toThrow('delete failed');
    expect(ensureDefaults).not.toHaveBeenCalled();
  });
});
