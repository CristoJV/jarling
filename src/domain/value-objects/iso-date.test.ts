import { isValidIsoDate } from './iso-date';

describe('isValidIsoDate', () => {
  it.each(['2026-01-01', '2024-02-29', '9999-12-31'])(
    'accepts the existing calendar date %s',
    (value) => {
      expect(isValidIsoDate(value)).toBe(true);
    },
  );

  it.each([
    '',
    '2026-1-01',
    '2026-01-1',
    '2026/01/01',
    '2026-00-01',
    '2026-13-01',
    '2026-02-29',
    '2026-04-31',
    'not-a-date',
  ])('rejects the invalid date %p', (value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});
