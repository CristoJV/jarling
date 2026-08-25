import {
  filterSearchableItems,
  hasExactSelectionMatch,
  normalizeSelectionSearch,
} from './searchable-selection';

describe('searchable selections', () => {
  const items = [{ name: 'Veterinario' }, { name: 'Groceries' }];

  it('normalizes surrounding whitespace and casing', () => {
    expect(normalizeSelectionSearch('  VETERINARIO ', 'es')).toBe(
      'veterinario',
    );
  });

  it('filters labels without changing the original collection', () => {
    expect(
      filterSearchableItems(items, 'vete', 'es', ({ name }) => name),
    ).toEqual([{ name: 'Veterinario' }]);
    expect(filterSearchableItems(items, '', 'es', ({ name }) => name)).toBe(
      items,
    );
  });

  it('matches an existing label case-insensitively', () => {
    expect(
      hasExactSelectionMatch(items, ' veterinario ', 'es', ({ name }) => name),
    ).toBe(true);
    expect(
      hasExactSelectionMatch(items, 'Veterinary', 'es', ({ name }) => name),
    ).toBe(false);
    expect(
      hasExactSelectionMatch(
        [{ name: '🏠 Rent/Mortgage' }],
        'Rent/Mortgage',
        'en',
        ({ name }) => name,
      ),
    ).toBe(true);
  });
});
