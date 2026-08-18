import { DEFAULT_PREFERENCES, parsePreferences } from './preferences';

describe('preferences', () => {
  it('restores valid persisted choices', () => {
    expect(
      parsePreferences(
        JSON.stringify({
          budgetName: 'Family',
          currency: 'GBP',
          numberFormat: 'decimal-point',
          currencyPlacement: 'before',
          dateFormat: 'mm/dd/yyyy',
          theme: 'dark',
          lockEnabled: true,
        }),
      ),
    ).toEqual({
      budgetName: 'Family',
      currency: 'GBP',
      numberFormat: 'decimal-point',
      currencyPlacement: 'before',
      dateFormat: 'mm/dd/yyyy',
      theme: 'dark',
      lockEnabled: true,
    });
  });

  it('falls back safely for corrupt or unsupported values', () => {
    expect(parsePreferences('{invalid')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(JSON.stringify({ currency: 'BTC' }))).toEqual(
      DEFAULT_PREFERENCES,
    );
  });
});
