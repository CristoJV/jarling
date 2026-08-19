import type { Money } from '@/domain/value-objects/money';
import { InvalidTransactionDateError } from '@/domain/errors/invalid-transaction-date-error';

export const TRANSACTION_STATUSES = [
  'uncleared',
  'cleared',
  'reconciled',
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const TRANSACTION_KINDS = [
  'standard',
  'opening_balance',
  'transfer',
  'reconciliation_adjustment',
] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export type Transaction = Readonly<{
  id: string;
  accountId: string;
  categoryId?: string;
  payee?: string;
  amount: Money;
  date: string;
  notes?: string;
  status: TransactionStatus;
  kind: TransactionKind;
  transactionGroupId?: string;
  createdAt: string;
  updatedAt: string;
}>;

type TransactionProperties = Omit<Transaction, 'payee' | 'notes' | 'kind'> & {
  payee?: string;
  notes?: string;
  kind?: TransactionKind;
};

function optionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function isValidTransactionDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function createTransaction(
  properties: TransactionProperties,
): Transaction {
  if (!isValidTransactionDate(properties.date)) {
    throw new InvalidTransactionDateError();
  }

  const { payee: rawPayee, notes: rawNotes, ...required } = properties;
  const payee = optionalText(rawPayee);
  const notes = optionalText(rawNotes);

  return {
    ...required,
    kind: properties.kind ?? 'standard',
    ...(payee ? { payee } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function updateTransaction(
  transaction: Transaction,
  changes: Omit<TransactionProperties, 'id' | 'createdAt'>,
): Transaction {
  return createTransaction({
    ...changes,
    kind: changes.kind ?? transaction.kind,
    id: transaction.id,
    createdAt: transaction.createdAt,
  });
}
