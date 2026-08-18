import type { Account } from '@/domain/entities/account';
import type { AccountRepository } from '@/domain/repositories/account-repository';

export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();

  async findAll(): Promise<readonly Account[]> {
    return [...this.accounts.values()];
  }

  async findById(id: string): Promise<Account | null> {
    return this.accounts.get(id) ?? null;
  }

  async save(account: Account): Promise<void> {
    this.accounts.set(account.id, account);
  }
}
