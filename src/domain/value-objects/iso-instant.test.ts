import { isValidIsoInstant } from './iso-instant';

describe('isValidIsoInstant', () => {
  it.each(['2026-10-21T12:34:56.789Z', '2000-02-29T00:00:00.000Z'])(
    'accepts canonical UTC instant %s',
    (value) => {
      expect(isValidIsoInstant(value)).toBe(true);
    },
  );

  it.each([
    '2026-02-29T00:00:00.000Z',
    '2026-10-21',
    '2026-10-21T12:34:56Z',
    '2026-10-21T12:34:56.789+02:00',
    'abcdefghij',
  ])('rejects non-canonical or impossible instant %s', (value) => {
    expect(isValidIsoInstant(value)).toBe(false);
  });
});
