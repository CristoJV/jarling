import {
  CATEGORY_NOTES_MAX_LENGTH,
  createCategory,
  setCategoryNotes,
} from './category';

const category = createCategory({
  id: 'category-1',
  groupId: 'group-1',
  name: 'Groceries',
  hidden: false,
  sortOrder: 0,
  createdAt: '2026-08-20T10:00:00.000Z',
  updatedAt: '2026-08-20T10:00:00.000Z',
});

describe('Category', () => {
  it('normalizes notes and removes an empty value', () => {
    const withNotes = setCategoryNotes(
      category,
      '  Buy seasonal products  ',
      '2026-08-20T11:00:00.000Z',
    );
    expect(withNotes.notes).toBe('Buy seasonal products');

    expect(
      setCategoryNotes(withNotes, '   ', '2026-08-20T12:00:00.000Z'),
    ).not.toHaveProperty('notes');
  });

  it('rejects notes beyond the domain limit', () => {
    expect(() =>
      setCategoryNotes(
        category,
        'a'.repeat(CATEGORY_NOTES_MAX_LENGTH + 1),
        '2026-08-20T11:00:00.000Z',
      ),
    ).toThrow('too long');
  });
});
