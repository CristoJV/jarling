import {
  routeBudgetMonth,
  routeId,
  routePositiveInteger,
  routeString,
} from './route-params';

describe('route parameters', () => {
  it('normalizes scalar and repeated parameters', () => {
    expect(routeString(' value ')).toBe('value');
    expect(routeString(['first', 'second'])).toBe('first');
    expect(routeId(undefined)).toBe('');
  });

  it('accepts valid months and falls back for malformed deep links', () => {
    const fallback = new Date(2026, 9, 3);
    expect(routeBudgetMonth('2025-12', fallback)).toBe('2025-12');
    expect(routeBudgetMonth('2025-13', fallback)).toBe('2026-10');
    expect(routeBudgetMonth(['bad', '2025-12'], fallback)).toBe('2026-10');
  });

  it('parses only positive safe integer parameters', () => {
    expect(routePositiveInteger('2500')).toBe(2500);
    expect(routePositiveInteger('-1')).toBe(0);
    expect(routePositiveInteger('1.5')).toBe(0);
    expect(routePositiveInteger('9007199254740992')).toBe(0);
  });
});
