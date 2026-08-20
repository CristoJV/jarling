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

type TransactionBase = Readonly<{
  id: string;
  accountId: string;
  categoryId?: string;
  payee?: string;
  amount: Money;
  date: string;
  notes?: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}>;

export type StandardTransaction = TransactionBase &
  Readonly<{ kind: 'standard'; transactionGroupId?: never }>;
export type OpeningBalanceTransaction = TransactionBase &
  Readonly<{ kind: 'opening_balance'; transactionGroupId?: never }>;
export type TransferLeg = TransactionBase &
  Readonly<{ kind: 'transfer'; transactionGroupId: string }>;
export type ReconciliationAdjustmentTransaction = TransactionBase &
  Readonly<{ kind: 'reconciliation_adjustment'; transactionGroupId?: never }>;

export type Transaction =
  | StandardTransaction
  | OpeningBalanceTransaction
  | TransferLeg
  | ReconciliationAdjustmentTransaction;

type BaseTransactionProperties = Omit<TransactionBase, 'payee' | 'notes'> & {
  payee?: string;
  notes?: string;
};

type StandardTransactionProperties = BaseTransactionProperties &
  Readonly<{ kind?: 'standard'; transactionGroupId?: never }>;
type OpeningBalanceTransactionProperties = BaseTransactionProperties &
  Readonly<{ kind: 'opening_balance'; transactionGroupId?: never }>;
type TransferLegProperties = BaseTransactionProperties &
  Readonly<{ kind: 'transfer'; transactionGroupId: string }>;
type ReconciliationAdjustmentProperties = BaseTransactionProperties &
  Readonly<{
    kind: 'reconciliation_adjustment';
    transactionGroupId?: never;
  }>;

export type TransactionProperties =
  | StandardTransactionProperties
  | OpeningBalanceTransactionProperties
  | TransferLegProperties
  | ReconciliationAdjustmentProperties;

type TransactionChanges = Omit<BaseTransactionProperties, 'id' | 'createdAt'> &
  Readonly<{ kind?: TransactionKind; transactionGroupId?: string }>;

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
  properties: StandardTransactionProperties,
): StandardTransaction;
export function createTransaction(
  properties: OpeningBalanceTransactionProperties,
): OpeningBalanceTransaction;
export function createTransaction(
  properties: TransferLegProperties,
): TransferLeg;
export function createTransaction(
  properties: ReconciliationAdjustmentProperties,
): ReconciliationAdjustmentTransaction;
export function createTransaction(
  properties: TransactionProperties,
): Transaction;
export function createTransaction(
  properties: TransactionProperties,
): Transaction {
  if (!isValidTransactionDate(properties.date)) {
    throw new InvalidTransactionDateError();
  }

  const {
    payee: rawPayee,
    notes: rawNotes,
    transactionGroupId,
    ...required
  } = properties;
  const payee = optionalText(rawPayee);
  const notes = optionalText(rawNotes);
  const kind = properties.kind ?? 'standard';
  if (kind === 'transfer' && !transactionGroupId) {
    throw new TypeError('A transfer leg requires a transaction group.');
  }
  if (kind !== 'transfer' && transactionGroupId) {
    throw new TypeError('Only transfer legs may own a transaction group.');
  }

  const base = {
    ...required,
    ...(payee ? { payee } : {}),
    ...(notes ? { notes } : {}),
  };
  return kind === 'transfer'
    ? { ...base, kind, transactionGroupId: transactionGroupId! }
    : { ...base, kind };
}

export function updateTransaction(
  transaction: Transaction,
  changes: TransactionChanges,
): Transaction {
  const properties = {
    ...changes,
    kind: changes.kind ?? transaction.kind,
    transactionGroupId:
      changes.transactionGroupId ?? transaction.transactionGroupId,
    id: transaction.id,
    createdAt: transaction.createdAt,
  };
  if (properties.kind === 'transfer') {
    if (!properties.transactionGroupId) {
      throw new TypeError('A transfer leg requires a transaction group.');
    }
    return createTransaction({
      ...properties,
      kind: 'transfer',
      transactionGroupId: properties.transactionGroupId,
    });
  }
  const { transactionGroupId: _group, ...nonTransfer } = properties;
  return createTransaction({ ...nonTransfer, kind: properties.kind });
}
