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
      if (!target.targetDate) return `${mode} ${formatMoney(target.amount)}`;
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
  }
}

export type TargetDetailCopy = Readonly<{
  title: string;
  subtitle: string;
  due: string;
}>;

export function targetDetailCopy(
  target: CategoryTarget,
  language: SupportedLanguage = 'en',
): TargetDetailCopy {
  const amount = formatMoney(target.amount);
  const recurringTitle = (period: 'week' | 'month' | 'year') => {
    const periodLabel = translate(language, `targets.${period}`);
    return target.fundingMode === 'refill_up_to'
      ? translate(language, 'targets.refillAmount', {
          amount,
          period: periodLabel,
        })
      : translate(language, 'targets.setAsideAmount', {
          amount,
          period: periodLabel,
        });
  };
  const by = (due: string): Omit<TargetDetailCopy, 'title'> => ({
    subtitle: translate(language, 'categoryDetails.by', { date: due }),
    due,
  });

  if (target.kind === 'weekly') {
    const weekday = new Intl.DateTimeFormat(language, {
      weekday: 'long',
    }).format(new Date(2026, 7, 16 + (target.dayOfWeek ?? 1)));
    return {
      title: recurringTitle('week'),
      subtitle: translate(language, 'categoryDetails.every', {
        date: weekday,
      }),
      due: weekday,
    };
  }

  if (target.kind === 'monthly') {
    const due =
      target.dayOfMonth === 0
        ? translate(language, 'targets.lastDay')
        : String(target.dayOfMonth);
    return { title: recurringTitle('month'), ...by(due) };
  }

  if (target.kind === 'yearly') {
    const due = formatTargetDate(target.targetDate, language);
    return { title: recurringTitle('year'), ...by(due) };
  }

  const mode =
    target.customFundingMode === 'fill_up_to'
      ? translate(language, 'targets.fillUpTo')
      : target.customFundingMode === 'balance'
        ? translate(language, 'targets.haveBalance')
        : translate(language, 'targets.setAside');
  const due = target.targetDate
    ? formatTargetDate(target.targetDate, language)
    : translate(language, 'categoryDetails.ongoing');
  return {
    title: `${mode} ${amount}`,
    subtitle: target.targetDate
      ? translate(language, 'categoryDetails.by', { date: due })
      : due,
    due,
  };
}

function formatTargetDate(
  value: string | undefined,
  language: SupportedLanguage,
): string {
  if (!value) return translate(language, 'categoryDetails.ongoing');
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
}
