const mockOpenDatabase = jest.fn();
const mockInitializeDatabase = jest.fn();

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args: unknown[]) => mockOpenDatabase(...args),
}));
jest.mock('@/bootstrap/composition/initialize-application-database', () => ({
  initializeApplicationDatabase: (...args: unknown[]) =>
    mockInitializeDatabase(...args),
}));

// Native module doubles must be installed before evaluating the module.
/* eslint-disable import/first */
import { DATABASE_NAME } from '@/bootstrap/config/database';
import { openApplicationDatabase } from './open-application-database';
/* eslint-enable import/first */

describe('openApplicationDatabase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the initialized connection', async () => {
    const database = { closeAsync: jest.fn() };
    mockOpenDatabase.mockResolvedValue(database);
    mockInitializeDatabase.mockResolvedValue(undefined);

    await expect(openApplicationDatabase()).resolves.toBe(database);
    expect(mockOpenDatabase).toHaveBeenCalledWith(DATABASE_NAME, {
      useNewConnection: true,
    });
    expect(mockInitializeDatabase).toHaveBeenCalledWith(database);
    expect(database.closeAsync).not.toHaveBeenCalled();
  });

  it('always closes the connection when first-run initialization fails', async () => {
    const database = { closeAsync: jest.fn().mockResolvedValue(undefined) };
    mockOpenDatabase.mockResolvedValue(database);
    mockInitializeDatabase.mockRejectedValue(new Error('Migration failed.'));

    await expect(openApplicationDatabase()).rejects.toThrow(
      'Migration failed.',
    );
    expect(database.closeAsync).toHaveBeenCalledTimes(1);
  });
});
