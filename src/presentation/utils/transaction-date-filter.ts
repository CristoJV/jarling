export type TransactionDatePreset =
  'this-week' | 'previous-week' | 'this-month' | 'previous-month';

export type TransactionDateFilter = Readonly<{
  kind: TransactionDatePreset | 'custom';
  dateFrom?: string;
  dateTo?: string;
}>;

export function createTransactionDatePreset(
  kind: TransactionDatePreset,
  today: string,
): TransactionDateFilter {
  const date = parseIsoDate(today);
  switch (kind) {
    case 'this-week': {
      const monday = addDays(date, -daysSinceMonday(date));
      return { kind, dateFrom: isoDate(monday), dateTo: today };
    }
    case 'previous-week': {
      const currentMonday = addDays(date, -daysSinceMonday(date));
      return {
        kind,
        dateFrom: isoDate(addDays(currentMonday, -7)),
        dateTo: isoDate(addDays(currentMonday, -1)),
      };
    }
    case 'this-month':
      return {
        kind,
        dateFrom: isoDate(
          new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
        ),
        dateTo: today,
      };
    case 'previous-month':
      return {
        kind,
        dateFrom: isoDate(
          new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)),
        ),
        dateTo: isoDate(
          new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0)),
        ),
      };
  }
}

export function setCustomTransactionDate(
  current: TransactionDateFilter | undefined,
  boundary: 'from' | 'to',
  value: string,
): TransactionDateFilter {
  if (boundary === 'from') {
    return {
      kind: 'custom',
      dateFrom: value,
      ...(current?.dateTo && current.dateTo >= value
        ? { dateTo: current.dateTo }
        : {}),
    };
  }
  if (current?.dateFrom && value < current.dateFrom) {
    return { kind: 'custom', dateFrom: current.dateFrom };
  }
  return {
    kind: 'custom',
    ...(current?.dateFrom ? { dateFrom: current.dateFrom } : {}),
    dateTo: value,
  };
}

export function todayIsoDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function daysSinceMonday(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
