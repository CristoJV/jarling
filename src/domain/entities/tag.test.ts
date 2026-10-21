import {
  assertTransactionTagLimit,
  createTag,
  normalizeTagName,
  tagNameKey,
} from './tag';

describe('tags', () => {
  it('normalizes display names and stable uniqueness keys', () => {
    expect(normalizeTagName('  Viaje   2026  ')).toBe('Viaje 2026');
    expect(tagNameKey(' VIAJE 2026 ')).toBe('viaje 2026');
    expect(
      createTag({
        id: 'tag-1',
        name: '  Viaje   2026 ',
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
      }),
    ).toEqual(
      expect.objectContaining({ name: 'Viaje 2026', nameKey: 'viaje 2026' }),
    );
  });

  it('rejects empty and oversized names', () => {
    expect(() => normalizeTagName('   ')).toThrow();
    expect(() => normalizeTagName('x'.repeat(61))).toThrow();
  });

  it('bounds unique tag associations per transaction', () => {
    expect(() =>
      assertTransactionTagLimit(
        Array.from({ length: 21 }, (_, index) => `tag-${index}`),
      ),
    ).toThrow('more than 20 tags');
    expect(() =>
      assertTransactionTagLimit(Array.from({ length: 21 }, () => 'same-tag')),
    ).not.toThrow();
  });
});
