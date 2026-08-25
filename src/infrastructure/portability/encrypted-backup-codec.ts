import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import {
  bytesToHex,
  bytesToUtf8,
  concatBytes,
  hexToBytes,
  utf8ToBytes,
} from '@noble/hashes/utils';
import { getRandomBytesAsync } from 'expo-crypto';

import { PlanPortabilityError } from '@/application/errors/plan-portability-error';
import {
  decodeBase64,
  encodeBase64,
} from '@/infrastructure/portability/base64';

export const BACKUP_FORMAT = 'com.cristojv.jarling.backup';
export const CURRENT_BACKUP_VERSION = 2;
export const PBKDF2_ITERATIONS = 310_000;
const MAX_PBKDF2_ITERATIONS = 2_000_000;
const SUPPORTED_BACKUP_VERSIONS = [1, CURRENT_BACKUP_VERSION] as const;

export type BackupVersion = (typeof SUPPORTED_BACKUP_VERSIONS)[number];

export type EncryptedBackupDocument = Readonly<{
  format: typeof BACKUP_FORMAT;
  version: BackupVersion;
  encryption: 'AES-256-GCM';
  kdf: Readonly<{
    name: 'PBKDF2-HMAC-SHA256';
    iterations: number;
    salt: string;
  }>;
  payload: string;
  nonce?: string;
  authenticationTag?: string;
  payloadDigest?: string;
}>;

export type EncryptedPayload = Readonly<{
  payload: string;
  nonce: string;
  authenticationTag: string;
  salt: string;
}>;

export interface BackupCipher {
  encrypt(
    plaintext: string,
    password: string,
    version: BackupVersion,
    iterations: number,
  ): Promise<EncryptedPayload>;
  decrypt(backup: EncryptedBackupDocument, password: string): Promise<string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function authenticatedContext(version: BackupVersion): Uint8Array {
  return utf8ToBytes(`Jarling backup version ${version}`);
}

function normalizePassword(password: string): string {
  const normalized = password.normalize('NFKC');
  if (normalized.length < 8) {
    throw new PlanPortabilityError(
      'decryption-failed',
      'The backup password must contain at least 8 characters.',
    );
  }
  return normalized;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  return pbkdf2Async(sha256, utf8ToBytes(normalizePassword(password)), salt, {
    c: iterations,
    dkLen: 32,
    asyncTick: 8,
  });
}

type RandomBytes = (length: number) => Promise<Uint8Array>;

export class NobleBackupCipher implements BackupCipher {
  constructor(
    private readonly randomBytes: RandomBytes = getRandomBytesAsync,
  ) {}

  async encrypt(
    plaintext: string,
    password: string,
    version: BackupVersion,
    iterations: number,
  ): Promise<EncryptedPayload> {
    const salt = await this.randomBytes(16);
    const nonce = await this.randomBytes(12);
    const key = await deriveKey(password, salt, iterations);
    try {
      const sealed = gcm(key, nonce, authenticatedContext(version)).encrypt(
        utf8ToBytes(plaintext),
      );
      return {
        salt: bytesToHex(salt),
        nonce: encodeBase64(nonce),
        payload: encodeBase64(sealed.subarray(0, -16)),
        authenticationTag: encodeBase64(sealed.subarray(-16)),
      };
    } finally {
      key.fill(0);
    }
  }

  async decrypt(
    backup: EncryptedBackupDocument,
    password: string,
  ): Promise<string> {
    try {
      const key = await deriveKey(
        password,
        hexToBytes(backup.kdf.salt),
        backup.kdf.iterations,
      );
      try {
        const combined = decodeBase64(backup.payload);
        const nonce = backup.nonce
          ? decodeBase64(backup.nonce)
          : combined.subarray(0, 12);
        const sealed = backup.authenticationTag
          ? concatBytes(combined, decodeBase64(backup.authenticationTag))
          : combined.subarray(12);
        return bytesToUtf8(
          gcm(key, nonce, authenticatedContext(backup.version)).decrypt(sealed),
        );
      } finally {
        key.fill(0);
      }
    } catch (cause) {
      if (cause instanceof PlanPortabilityError) throw cause;
      throw new PlanPortabilityError(
        'decryption-failed',
        'The backup could not be authenticated or decrypted.',
        { cause },
      );
    }
  }
}

function isBase64(value: unknown, minimumLength = 1): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minimumLength &&
    value.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}

function encryptedPayloadDigest(
  payload: Pick<
    EncryptedBackupDocument,
    'payload' | 'nonce' | 'authenticationTag'
  >,
): string {
  return bytesToHex(
    sha256(
      utf8ToBytes(
        `${payload.nonce ?? ''}.${payload.payload}.${payload.authenticationTag ?? ''}`,
      ),
    ),
  );
}

export function parseEncryptedBackupDocument(
  value: unknown,
): EncryptedBackupDocument {
  if (!isRecord(value) || value.format !== BACKUP_FORMAT) {
    throw new PlanPortabilityError(
      'unsupported-format',
      'The file is not a Jarling backup.',
    );
  }
  if (!SUPPORTED_BACKUP_VERSIONS.includes(value.version as BackupVersion)) {
    throw new PlanPortabilityError(
      'unsupported-version',
      'The backup version is not supported.',
    );
  }
  if (
    value.encryption !== 'AES-256-GCM' ||
    !isRecord(value.kdf) ||
    value.kdf.name !== 'PBKDF2-HMAC-SHA256' ||
    typeof value.kdf.iterations !== 'number' ||
    !Number.isSafeInteger(value.kdf.iterations) ||
    value.kdf.iterations < PBKDF2_ITERATIONS ||
    value.kdf.iterations > MAX_PBKDF2_ITERATIONS ||
    typeof value.kdf.salt !== 'string' ||
    !/^[A-Fa-f0-9]{32}$/.test(value.kdf.salt) ||
    !isBase64(value.payload, 4)
  ) {
    throw new PlanPortabilityError(
      'corrupt-backup',
      'The encrypted backup wrapper is damaged or incomplete.',
    );
  }
  const hasExplicitParts =
    value.nonce !== undefined || value.authenticationTag !== undefined;
  if (
    hasExplicitParts &&
    (!isBase64(value.nonce, 16) || !isBase64(value.authenticationTag, 20))
  ) {
    throw new PlanPortabilityError(
      'corrupt-backup',
      'The encrypted backup nonce or authentication tag is invalid.',
    );
  }
  if (!hasExplicitParts && value.payload.length < 40) {
    throw new PlanPortabilityError(
      'corrupt-backup',
      'The encrypted backup payload is incomplete.',
    );
  }
  if (
    value.payloadDigest !== undefined &&
    (typeof value.payloadDigest !== 'string' ||
      !/^[A-Fa-f0-9]{64}$/.test(value.payloadDigest) ||
      value.payloadDigest.toLowerCase() !==
        encryptedPayloadDigest(
          value as Pick<
            EncryptedBackupDocument,
            'payload' | 'nonce' | 'authenticationTag'
          >,
        ))
  ) {
    throw new PlanPortabilityError(
      'corrupt-backup',
      'The encrypted backup payload is damaged or incomplete.',
    );
  }
  return value as EncryptedBackupDocument;
}

export async function createEncryptedBackupDocument(
  snapshotJson: string,
  password: string,
  cipher: BackupCipher = new NobleBackupCipher(),
): Promise<EncryptedBackupDocument> {
  const encrypted = await cipher.encrypt(
    snapshotJson,
    password,
    CURRENT_BACKUP_VERSION,
    PBKDF2_ITERATIONS,
  );
  const document: EncryptedBackupDocument = {
    format: BACKUP_FORMAT,
    version: CURRENT_BACKUP_VERSION,
    encryption: 'AES-256-GCM',
    kdf: {
      name: 'PBKDF2-HMAC-SHA256',
      iterations: PBKDF2_ITERATIONS,
      salt: encrypted.salt,
    },
    payload: encrypted.payload,
    nonce: encrypted.nonce,
    authenticationTag: encrypted.authenticationTag,
  };
  return {
    ...document,
    payloadDigest: encryptedPayloadDigest(document),
  };
}

export async function decryptEncryptedBackupDocument(
  value: unknown,
  password: string,
  cipher: BackupCipher = new NobleBackupCipher(),
): Promise<Readonly<{ version: BackupVersion; snapshotJson: string }>> {
  const backup = parseEncryptedBackupDocument(value);
  try {
    return {
      version: backup.version,
      snapshotJson: await cipher.decrypt(backup, password),
    };
  } catch (cause) {
    if (cause instanceof PlanPortabilityError) throw cause;
    throw new PlanPortabilityError(
      'decryption-failed',
      'The backup could not be authenticated or decrypted.',
      { cause },
    );
  }
}

export async function verifyEncryptedBackupDocument(
  value: unknown,
  password: string,
  expectedSnapshotJson: string,
  cipher: BackupCipher = new NobleBackupCipher(),
): Promise<void> {
  try {
    const decrypted = await decryptEncryptedBackupDocument(
      value,
      password,
      cipher,
    );
    if (decrypted.snapshotJson !== expectedSnapshotJson) {
      throw new Error('The decrypted snapshot differs from the source.');
    }
  } catch (cause) {
    throw new PlanPortabilityError(
      'backup-verification-failed',
      'The encrypted backup failed its read-back verification.',
      { cause },
    );
  }
}
