import type { CategoryTarget } from '@/domain/entities/category-target';
import { formatMoney } from '@/presentation/utils/money';

const dayLabels = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function targetDescription(target: CategoryTarget): string {
  switch (target.kind) {
    case 'weekly':
      return `${target.weeklyFundingMode === 'refill_up_to' ? 'Refill up to' : 'Set aside'} ${formatMoney(target.amount)} weekly · ${dayLabels[(target.dayOfWeek ?? 1) - 1]}`;
    case 'monthly':
      return `${formatMoney(target.amount)} monthly · ${target.dayOfMonth === 0 ? 'Last day' : `Day ${target.dayOfMonth}`}`;
    case 'yearly': {
      const date = new Date(`${target.targetDate}T12:00:00`);
      const label = Number.isNaN(date.getTime())
        ? target.targetDate
        : new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).format(date);
      return `${formatMoney(target.amount)} by ${label}`;
    }
    case 'custom': {
      const mode =
        target.customFundingMode === 'set_aside'
          ? 'Set aside'
          : target.customFundingMode === 'fill_up_to'
            ? 'Fill up to'
            : 'Have a balance of';
      return `${mode} ${formatMoney(target.amount)}`;
    }
  }
}
