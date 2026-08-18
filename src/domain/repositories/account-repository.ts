import type { Account } from '@/domain/entities/account';

export interface AccountRepository {
  findAll(): Promise<readonly Account[]>;
  findById(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
}
