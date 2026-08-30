import { PlanPortabilityError } from '@/application/errors/plan-portability-error';

import {
  BACKUP_FORMAT,
  CURRENT_BACKUP_VERSION,
  PBKDF2_ITERATIONS,
  type BackupCipher,
  type BackupVersion,
  createEncryptedBackupDocument,
  decryptEncryptedBackupDocument,
  type EncryptedBackupDocument,
  type EncryptedPayload,
  NobleBackupCipher,
  parseEncryptedBackupDocument,
  verifyEncryptedBackupDocument,
} from './encrypted-backup-codec';
import { parsePlanSnapshot } from './sqlite-plan-portability';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const cryptoProvider = globalThis.crypto;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) =>
    Number.parseInt(pair, 16),
  );
}

function context(version: BackupVersion) {
  return encoder.encode(`Jarling backup version ${version}`);
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

async function keyFor(password: string, salt: Uint8Array, iterations: number) {
  const material = await cryptoProvider.subtle.importKey(
    'raw',
    encoder.encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return cryptoProvider.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: arrayBuffer(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

class WebCryptoTestCipher implements BackupCipher {
  async encrypt(
    plaintext: string,
    password: string,
    version: BackupVersion,
    iterations: number,
  ): Promise<EncryptedPayload> {
    const salt = cryptoProvider.getRandomValues(new Uint8Array(16));
    const nonce = cryptoProvider.getRandomValues(new Uint8Array(12));
    const encrypted = new Uint8Array(
      await cryptoProvider.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: arrayBuffer(nonce),
          additionalData: arrayBuffer(context(version)),
        },
        await keyFor(password, salt, iterations),
        arrayBuffer(encoder.encode(plaintext)),
      ),
    );
    return {
      salt: toHex(salt),
      nonce: toBase64(nonce),
      payload: toBase64(encrypted.subarray(0, -16)),
      authenticationTag: toBase64(encrypted.subarray(-16)),
    };
  }

  async decrypt(
    backup: EncryptedBackupDocument,
    password: string,
  ): Promise<string> {
    const legacyCombined =
      !backup.nonce || !backup.authenticationTag
        ? fromBase64(backup.payload)
        : undefined;
    const nonce = backup.nonce
      ? fromBase64(backup.nonce)
      : legacyCombined!.subarray(0, 12);
    const payload = legacyCombined
      ? legacyCombined.subarray(12, -16)
      : fromBase64(backup.payload);
    const tag = backup.authenticationTag
      ? fromBase64(backup.authenticationTag)
      : legacyCombined!.subarray(-16);
    const combined = new Uint8Array(payload.length + tag.length);
    combined.set(payload);
    combined.set(tag, payload.length);
    const decrypted = await cryptoProvider.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: arrayBuffer(nonce),
        additionalData: arrayBuffer(context(backup.version)),
      },
      await keyFor(password, fromHex(backup.kdf.salt), backup.kdf.iterations),
      arrayBuffer(combined),
    );
    return decoder.decode(decrypted);
  }
}

const emptySnapshot = {
  format: BACKUP_FORMAT,
  version: CURRENT_BACKUP_VERSION,
  exportedAt: '2026-08-25T12:00:00.000Z',
  tables: {
    accounts: [],
    category_groups: [],
    categories: [],
    transactions: [],
    transaction_links: [],
    budget_allocations: [],
    category_targets: [],
    category_target_snoozes: [],
  },
};

const categoryInflowSnapshot = {
  ...emptySnapshot,
  tables: {
    ...emptySnapshot.tables,
    accounts: [
      {
        id: 'cash',
        name: 'Cash',
        type: 'checking',
        on_budget: 1,
        closed: 0,
        created_at: '2026-08-25T12:00:00.000Z',
        updated_at: '2026-08-25T12:00:00.000Z',
      },
    ],
    category_groups: [
      {
        id: 'needs',
        name: 'Needs',
        sort_order: 0,
        created_at: '2026-08-25T12:00:00.000Z',
        updated_at: '2026-08-25T12:00:00.000Z',
      },
    ],
    categories: [
      {
        id: 'clothing',
        group_id: 'needs',
        name: 'Clothing',
        notes: null,
        hidden: 0,
        linked_account_id: null,
        sort_order: 0,
        created_at: '2026-08-25T12:00:00.000Z',
        updated_at: '2026-08-25T12:00:00.000Z',
      },
    ],
    transactions: [
      {
        id: 'refund',
        account_id: 'cash',
        category_id: 'clothing',
        payee: 'Refund',
        amount: 4_000,
        date: '2026-08-25',
        notes: null,
        status: 'cleared',
        kind: 'standard',
        transaction_group_id: null,
        created_at: '2026-08-25T12:00:00.000Z',
        updated_at: '2026-08-25T12:00:00.000Z',
      },
    ],
  },
};

describe('encrypted Jarling backup codec', () => {
  const cipher = new WebCryptoTestCipher();
  const productionCipher = new NobleBackupCipher(async (length) =>
    cryptoProvider.getRandomValues(new Uint8Array(length)),
  );
  const password = 'correct horse battery staple';

  it('interoperates between the production cipher and standard Web Crypto', async () => {
    const serialized = JSON.stringify(emptySnapshot);
    const productionBackup = await createEncryptedBackupDocument(
      serialized,
      password,
      productionCipher,
    );
    await expect(
      decryptEncryptedBackupDocument(productionBackup, password, cipher),
    ).resolves.toEqual({
      version: CURRENT_BACKUP_VERSION,
      snapshotJson: serialized,
    });

    const standardBackup = await createEncryptedBackupDocument(
      serialized,
      password,
      cipher,
    );
    await expect(
      decryptEncryptedBackupDocument(
        standardBackup,
        password,
        productionCipher,
      ),
    ).resolves.toEqual({
      version: CURRENT_BACKUP_VERSION,
      snapshotJson: serialized,
    });
  });

  it('round-trips the current portable snapshot', async () => {
    const serialized = JSON.stringify(emptySnapshot);
    const backup = await createEncryptedBackupDocument(
      serialized,
      password,
      cipher,
    );
    const decoded = await decryptEncryptedBackupDocument(
      JSON.parse(JSON.stringify(backup)),
      password,
      cipher,
    );
    expect(decoded).toEqual({
      version: CURRENT_BACKUP_VERSION,
      snapshotJson: serialized,
    });
    expect(parsePlanSnapshot(JSON.parse(decoded.snapshotJson))).toEqual(
      emptySnapshot,
    );
    await expect(
      verifyEncryptedBackupDocument(backup, password, serialized, cipher),
    ).resolves.toBeUndefined();
  });

  it('round-trips an encrypted standard category inflow', async () => {
    const serialized = JSON.stringify(categoryInflowSnapshot);
    const backup = await createEncryptedBackupDocument(
      serialized,
      password,
      cipher,
    );
    const decoded = await decryptEncryptedBackupDocument(
      JSON.parse(JSON.stringify(backup)),
      password,
      cipher,
    );

    expect(parsePlanSnapshot(JSON.parse(decoded.snapshotJson))).toEqual(
      categoryInflowSnapshot,
    );
  });

  it('fails verification when the decrypted snapshot differs from its source', async () => {
    const backup = await createEncryptedBackupDocument(
      JSON.stringify(emptySnapshot),
      password,
      cipher,
    );
    await expect(
      verifyEncryptedBackupDocument(backup, password, '{}', cipher),
    ).rejects.toMatchObject({ code: 'backup-verification-failed' });
  });

  it('distinguishes a wrong password from an encrypted payload mutation', async () => {
    const backup = await createEncryptedBackupDocument(
      JSON.stringify(emptySnapshot),
      password,
      cipher,
    );
    await expect(
      decryptEncryptedBackupDocument(backup, 'wrong password', cipher),
    ).rejects.toMatchObject({ code: 'decryption-failed' });
    const corrupted = {
      ...backup,
      payload: `${backup.payload.slice(0, -4)}AAAA`,
    };
    await expect(
      decryptEncryptedBackupDocument(corrupted, password, cipher),
    ).rejects.toMatchObject({ code: 'corrupt-backup' });
  });

  it('distinguishes corrupted wrappers and unsupported versions', () => {
    expect(() =>
      parseEncryptedBackupDocument({
        format: BACKUP_FORMAT,
        version: 2,
        encryption: 'AES-256-GCM',
        kdf: {
          name: 'PBKDF2-HMAC-SHA256',
          iterations: PBKDF2_ITERATIONS,
          salt: 'broken',
        },
        payload: 'broken',
      }),
    ).toThrow(PlanPortabilityError);
    expect(() =>
      parseEncryptedBackupDocument({
        format: BACKUP_FORMAT,
        version: 99,
      }),
    ).toThrow(expect.objectContaining({ code: 'unsupported-version' }));
  });

  it.each([1, 2] as const)(
    'decrypts version %s and lets the snapshot migration chain normalize it',
    async (version) => {
      const { transaction_links: _, ...legacyTables } = emptySnapshot.tables;
      const legacySnapshot = {
        ...emptySnapshot,
        version,
        tables: version === 1 ? legacyTables : emptySnapshot.tables,
      };
      const encrypted = await cipher.encrypt(
        JSON.stringify(legacySnapshot),
        password,
        version,
        PBKDF2_ITERATIONS,
      );
      const backup: EncryptedBackupDocument = {
        format: BACKUP_FORMAT,
        version,
        encryption: 'AES-256-GCM',
        kdf: {
          name: 'PBKDF2-HMAC-SHA256',
          iterations: PBKDF2_ITERATIONS,
          salt: encrypted.salt,
        },
        payload:
          version === 1
            ? toBase64(
                Uint8Array.from([
                  ...fromBase64(encrypted.nonce),
                  ...fromBase64(encrypted.payload),
                  ...fromBase64(encrypted.authenticationTag),
                ]),
              )
            : encrypted.payload,
        ...(version === 2
          ? {
              nonce: encrypted.nonce,
              authenticationTag: encrypted.authenticationTag,
            }
          : {}),
      };
      const decoded = await decryptEncryptedBackupDocument(
        backup,
        password,
        cipher,
      );
      expect(parsePlanSnapshot(JSON.parse(decoded.snapshotJson)).version).toBe(
        CURRENT_BACKUP_VERSION,
      );
    },
  );
});
