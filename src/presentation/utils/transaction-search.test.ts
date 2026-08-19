import { upsertTransactionSearch } from './transaction-search';

describe('transaction search', () => {
  it('keeps independent refinements', () => {
    expect(
      upsertTransactionSearch([{ field: 'payee', value: 'Market' }], {
        field: 'memo',
        value: 'Weekly',
      }),
    ).toEqual([
      { field: 'payee', value: 'Market' },
      { field: 'memo', value: 'Weekly' },
    ]);
  });

  it('replaces only a refinement for the same field', () => {
    expect(
      upsertTransactionSearch(
        [
          { field: 'search', value: 'Old' },
          { field: 'memo', value: 'Weekly' },
        ],
        { field: 'search', value: 'New' },
      ),
    ).toEqual([
      { field: 'memo', value: 'Weekly' },
      { field: 'search', value: 'New' },
    ]);
  });
});
