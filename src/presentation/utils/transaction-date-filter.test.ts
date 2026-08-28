import {
  createTransactionDatePreset,
  setCustomTransactionDate,
} from './transaction-date-filter';

describe('transaction date filter', () => {
  it.each([
    [
      'this-week',
      { kind: 'this-week', dateFrom: '2026-08-17', dateTo: '2026-08-20' },
    ],
    [
      'previous-week',
      {
        kind: 'previous-week',
        dateFrom: '2026-08-10',
        dateTo: '2026-08-16',
      },
    ],
    [
      'this-month',
      { kind: 'this-month', dateFrom: '2026-08-01', dateTo: '2026-08-20' },
    ],
    [
      'previous-month',
      {
        kind: 'previous-month',
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
      },
    ],
  ] as const)('builds the inclusive %s range', (preset, expected) => {
    expect(createTransactionDatePreset(preset, '2026-08-20')).toEqual(expected);
  });

  it('clears To when a new From would make the range invalid', () => {
    expect(
      setCustomTransactionDate(
        { kind: 'custom', dateFrom: '2026-08-01', dateTo: '2026-08-10' },
        'from',
        '2026-08-11',
      ),
    ).toEqual({ kind: 'custom', dateFrom: '2026-08-11' });
  });

  it('preserves a compatible boundary and converts presets to custom ranges', () => {
    expect(
      setCustomTransactionDate(
        { kind: 'this-month', dateFrom: '2026-08-01', dateTo: '2026-08-20' },
        'from',
        '2026-08-02',
      ),
    ).toEqual({
      kind: 'custom',
      dateFrom: '2026-08-02',
      dateTo: '2026-08-20',
    });
  });

  it('does not create a To boundary before From', () => {
    expect(
      setCustomTransactionDate(
        { kind: 'custom', dateFrom: '2026-08-10' },
        'to',
        '2026-08-09',
      ),
    ).toEqual({ kind: 'custom', dateFrom: '2026-08-10' });
  });
});
