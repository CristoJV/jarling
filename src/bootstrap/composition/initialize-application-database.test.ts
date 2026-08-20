const mockInitializeDatabase = jest.fn();
const mockEnsureDefaults = jest.fn();
const mockCreateApplication = jest.fn((_database: unknown) => ({
  categories: { ensureDefaults: { execute: mockEnsureDefaults } },
}));

jest.mock(
  '@/infrastructure/persistence/sqlite/database/initialize-database',
  () => ({
    initializeDatabase: (...args: unknown[]) => mockInitializeDatabase(...args),
  }),
);
jest.mock('@/bootstrap/composition/create-application', () => ({
  createApplication: (database: unknown) => mockCreateApplication(database),
}));

// Dependency doubles must be installed before evaluating the composition root.
// eslint-disable-next-line import/first
import { initializeApplicationDatabase } from './initialize-application-database';

describe('initializeApplicationDatabase', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initializes SQLite before ensuring the default categories', async () => {
    const database = {};
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockEnsureDefaults.mockResolvedValue(undefined);

    await initializeApplicationDatabase(database as never);

    expect(mockInitializeDatabase).toHaveBeenCalledWith(database);
    expect(mockCreateApplication).toHaveBeenCalledWith(database);
    expect(mockEnsureDefaults).toHaveBeenCalledTimes(1);
    expect(mockInitializeDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnsureDefaults.mock.invocationCallOrder[0],
    );
  });

  it('does not compose the application when database initialization fails', async () => {
    mockInitializeDatabase.mockRejectedValue(
      new Error('Database initialization failed.'),
    );

    await expect(initializeApplicationDatabase({} as never)).rejects.toThrow(
      'Database initialization failed.',
    );

    expect(mockCreateApplication).not.toHaveBeenCalled();
    expect(mockEnsureDefaults).not.toHaveBeenCalled();
  });
});
