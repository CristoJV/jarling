import type { ReportMonth } from '@/domain/services/calculate-reports';
import { Money } from '@/domain/value-objects/money';
import { formatMoneyAmount } from '@/presentation/utils/money';

export function netWorthChangeCents(
  months: readonly Pick<ReportMonth, 'netWorth'>[],
  index: number,
): number {
  const current = months[index]?.netWorth.cents ?? 0;
  const previous = months[index - 1]?.netWorth.cents ?? 0;
  return current - previous;
}

export function formatSignedReportChange(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '-' : '';
  const amount = formatMoneyAmount(Money.fromCents(Math.abs(cents)));
  return `(${sign}${amount})`;
}
