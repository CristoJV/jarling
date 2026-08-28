import { createReportCategoryColors } from './report-category-colors';

describe('createReportCategoryColors', () => {
  it('assigns stable runtime colors and cycles after the sixth category', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const colors = createReportCategoryColors(ids, false);

    expect(new Set(ids.slice(0, 6).map((id) => colors[id])).size).toBe(6);
    expect(colors.g).toBe(colors.a);
    expect(colors.a).not.toBe('#5B54E8');
  });

  it('uses a dark-mode palette without assigning the reserved primary color', () => {
    const colors = createReportCategoryColors(['groceries'], true);

    expect(colors.groceries).not.toBe('#9B96FF');
  });
});
