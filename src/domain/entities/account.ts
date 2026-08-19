import { InvalidAccountNameError } from '@/domain/errors/invalid-account-name-error';

export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'cash',
  'credit_card',
  'tracking',
  'loan',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Account = Readonly<{
  id: string;
  name: string;
  type: AccountType;
  onBudget: boolean;
  closed: boolean;
  createdAt: string;
  updatedAt: string;
}>;

type CreateAccountProperties = Omit<Account, 'name' | 'closed'> & {
  name: string;
};

export function createAccount(properties: CreateAccountProperties): Account {
  const name = properties.name.trim();

  if (name.length === 0) {
    throw new InvalidAccountNameError();
  }

  return {
    ...properties,
    name,
    onBudget:
      properties.type === 'credit_card'
        ? true
        : properties.type === 'tracking' || properties.type === 'loan'
          ? false
          : properties.onBudget,
    closed: false,
  };
}

export function closeAccount(account: Account, updatedAt: string): Account {
  if (account.closed) {
    return account;
  }

  return {
    ...account,
    closed: true,
    updatedAt,
  };
}
