import type { CategoryTarget } from '@/domain/entities/category-target';
import { formatMoney } from '@/presentation/utils/money';
import {
  translate,
  type SupportedLanguage,
} from '@/presentation/localization/translator';

export function targetDescription(
  target: CategoryTarget,
  language: SupportedLanguage = 'en',
): string {
  const mode =
    target.fundingMode === 'refill_up_to'
      ? translate(language, 'targets.fillUpTo')
      : translate(language, 'targets.setAside');
  switch (target.kind) {
    case 'weekly': {
      const day = new Intl.DateTimeFormat(language, {
        weekday: 'long',
      }).format(new Date(2026, 7, 16 + (target.dayOfWeek ?? 1)));
      return `${mode} ${formatMoney(target.amount)}/${translate(language, 'targets.week')} · ${day}`;
    }
    case 'monthly':
      return `${mode} ${formatMoney(target.amount)}/${translate(language, 'targets.month')} · ${target.dayOfMonth === 0 ? translate(language, 'targets.lastDay') : target.dayOfMonth}`;
    case 'yearly': {
      const date = new Date(`${target.targetDate}T12:00:00`);
      const label = Number.isNaN(date.getTime())
        ? target.targetDate
        : new Intl.DateTimeFormat(language, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }).format(date);
      return `${mode} ${formatMoney(target.amount)} · ${label}`;
    }
    case 'custom': {
      const mode =
        target.customFundingMode === 'set_aside'
          ? translate(language, 'targets.setAside')
          : target.customFundingMode === 'fill_up_to'
            ? translate(language, 'targets.fillUpTo')
            : translate(language, 'targets.haveBalance');
      return `${mode} ${formatMoney(target.amount)}`;
    }
  }
}
