import {
  buildTransactionQuery,
  upsertTransactionSearch,
} from './transaction-search';

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

  it('builds one repository query from incremental filters', () => {
    expect(
      buildTransactionQuery({
        searches: [
          { field: 'payee', value: 'Market' },
          { field: 'memo', value: 'Weekly' },
        ],
        accountId: 'account-1',
        categoryId: 'category-1',
        status: 'cleared',
        tagIds: ['tag-1', 'tag-2'],
        untagged: false,
        dateFilter: {
          kind: 'custom',
          dateFrom: '2026-08-02',
          dateTo: '2026-08-18',
        },
      }),
    ).toEqual({
      payee: 'Market',
      memo: 'Weekly',
      accountId: 'account-1',
      categoryId: 'category-1',
      status: 'cleared',
      tagIds: ['tag-1', 'tag-2'],
      dateFrom: '2026-08-02',
      dateTo: '2026-08-18',
    });
  });

  it('omits inactive filters instead of emitting empty values', () => {
    expect(buildTransactionQuery({ searches: [] })).toEqual({});
  });
});
