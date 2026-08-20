# ADR 0004: Data protection and portability boundaries

- Status: Accepted
- Date: 2026-08-20

## Context

Database encryption and key recovery previously added startup complexity and
failure modes that were disproportionate for the first release. Users still
need an accurate privacy model and a safe way to move their data.

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
- Restoration validates size, shape, domain relationships, foreign keys, and
  SQLite integrity before reporting success.
- No database-encryption compatibility or recovery code is retained in version 1.

## Consequences

- Startup has no key-management dependency or unrecoverable key-loss state.
- A rooted, compromised, or forensically inspected device is outside the
  protection offered by Jarling itself.
- Users must protect readable exports and remember backup passwords.
- Adding database encryption later requires a separate ADR, key-recovery
  design, backup strategy, and copy-verify-swap migration.

## Alternatives considered

- SQLCipher with a device-generated key was rejected for version 1 because key
  loss could make an otherwise healthy database inaccessible.
- A mandatory master password was rejected because it complicates onboarding
  and recovery before the product has established that threat-model need.
