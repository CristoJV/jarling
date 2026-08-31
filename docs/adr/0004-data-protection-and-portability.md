# ADR 0004: Data protection and portability boundaries

- Status: Accepted
- Date: 2026-08-20

## Context

Database encryption and key recovery previously added startup complexity and
failure modes that were disproportionate for the first release. Users still
need an accurate privacy model and a safe way to move their data.

## Problem

Device-key database encryption risked unrecoverable startup failures, while
unencrypted portability alone would leave users without a protected backup.

## Decision

- The active SQLite database is not encrypted by Jarling. It lives in the
  platform's private application directory.
- Device credential lock protects access to the interface; it is not described
  as database encryption.
- Android platform backup is disabled for the application database.
- JSON export is deliberately readable and carries an explicit warning.
- Each `.jarling` backup is independently encrypted with AES-256-GCM. Its key
  is derived from that backup's password with PBKDF2-HMAC-SHA256, at least
  310,000 iterations, and a unique salt.
- AES-GCM and PBKDF2 use the audited Noble JavaScript implementations so the
  exact encryption code exercised by automated tests also runs on Android,
  iOS, and web. Platform crypto remains the source of secure random salt and
  nonce bytes.
- The portable wrapper stores the nonce, ciphertext, authentication tag, KDF
  parameters, and a non-secret SHA-256 payload checksum explicitly. The
  checksum distinguishes a damaged current backup from a wrong password before
  authentication; AES-GCM remains the security and authenticity boundary.
- Restore remains compatible with legacy v1/v2 wrappers that stored nonce,
  ciphertext, and tag as one combined Base64 payload.
- Before a new backup is shared, Jarling reads the file back from storage,
  decrypts it with the supplied password, and verifies that the recovered
  snapshot is byte-for-byte equal to the source. A backup that fails this
  native round-trip is never offered to the user.
- JSON export and `.jarling` backup contain the same versioned plan snapshot;
  `.jarling` is the canonical user backup and encrypts that snapshot.
- Restore detects the format from file contents, asks for a password only for
  encrypted input, migrates legacy snapshots, and sends both formats through
  one transactional snapshot restoration path.
- Restoration validates size, shape, domain relationships, foreign keys, and
  SQLite integrity before committing and reporting success. Errors preserve a
  typed internal cause instead of treating every failure as a bad password.
- No database-encryption compatibility or recovery code is retained in version 1.

## Consequences

- Startup has no key-management dependency or unrecoverable key-loss state.
- A rooted, compromised, or forensically inspected device is outside the
  protection offered by Jarling itself.
- Users must protect readable exports and remember backup passwords.
- Readable JSON exports can also restore a plan, which supports
  interoperability without creating a second restoration implementation.
- Adding database encryption later requires a separate ADR, key-recovery
  design, backup strategy, and copy-verify-swap migration.

## Alternatives considered

- SQLCipher with a device-generated key was rejected for version 1 because key
  loss could make an otherwise healthy database inaccessible.
- A mandatory master password was rejected because it complicates onboarding
  and recovery before the product has established that threat-model need.
