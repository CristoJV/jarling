import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { TranslationKey } from '@/presentation/localization/translations';

type Translate = (key: TranslationKey) => string;

const categoryNames: Readonly<
  Record<string, Readonly<{ source: string; key: TranslationKey }>>
> = {
  'default-category-rent-mortgage': {
    source: '🏠 Rent/Mortgage',
    key: 'defaults.rentMortgage',
  },
  'default-category-phone-internet': {
    source: '📱 Phone & Internet',
    key: 'defaults.phoneInternet',
  },
  'default-category-utilities': {
    source: '⚡ Utilities',
    key: 'defaults.utilities',
  },
  'default-category-groceries': {
    source: '🛒 Groceries',
    key: 'defaults.groceries',
  },
  'default-category-transportation': {
    source: '🚗 Transportation',
    key: 'defaults.transportation',
  },
};

const groupNames: Readonly<
  Record<string, Readonly<{ source: string; key: TranslationKey }>>
> = {
  'default-group-bills': { source: 'Bills', key: 'defaults.bills' },
  'default-group-needs': { source: 'Needs', key: 'defaults.needs' },
  'default-group-subscriptions': {
    source: 'Subscriptions',
    key: 'defaults.subscriptions',
  },
  'default-group-wants': { source: 'Wants', key: 'defaults.wants' },
  'system-group-credit-card-payments': {
    source: 'Credit Card Payments',
    key: 'defaults.creditCardPayments',
  },
};

export function categoryDisplayName(
  category: Pick<Category, 'id' | 'name'>,
  t: Translate,
): string {
  const localized = categoryNames[category.id];
  return localized && localized.source === category.name
    ? t(localized.key)
    : category.name;
}

export function groupDisplayName(
  group: Pick<CategoryGroup, 'id' | 'name'>,
  t: Translate,
): string {
  const localized = groupNames[group.id];
  return localized && localized.source === group.name
    ? t(localized.key)
    : group.name;
}
