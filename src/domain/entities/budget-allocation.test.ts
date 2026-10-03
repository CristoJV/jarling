import {
  isValidBudgetMonth,
  shiftBudgetMonth,
} from '@/domain/entities/budget-allocation';
import { InvalidBudgetMonthError } from '@/domain/errors/invalid-budget-month-error';

describe('budget month utilities', () => {
  test('shifts months across year boundaries', () => {
    expect(shiftBudgetMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftBudgetMonth('2026-12', 2)).toBe('2027-02');
  });

  test('supports four-digit years below 100', () => {
    expect(shiftBudgetMonth('0001-01', -1)).toBe('0000-12');
  });

  test('rejects invalid months and offsets', () => {
    expect(isValidBudgetMonth('2026-13')).toBe(false);
    expect(() => shiftBudgetMonth('2026-13', 1)).toThrow(
      InvalidBudgetMonthError,
    );
    expect(() => shiftBudgetMonth('2026-01', 0.5)).toThrow(
      InvalidBudgetMonthError,
    );
  });
});
