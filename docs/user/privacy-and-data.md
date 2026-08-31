# Privacy, backups, and data

Jarling is local-first. It does not require an account, and the application
does not send financial data, diagnostics, or analytics to a Jarling server.

On Android and iOS, SQLite data lives in the application's private internal
directory. The operating system provides that storage boundary. Jarling does
not add application-managed encryption to the active database. Device
credential lock is an optional interface gate, not database encryption.

## Export and backup

- A `.json` export is human-readable and unencrypted. Anyone who obtains it can
  read its financial contents.
- A `.jarling` backup encrypts the same versioned plan snapshot with
  AES-256-GCM. Its key is derived from that backup's password with
  PBKDF2-HMAC-SHA256, at least 310,000 iterations, and a unique random salt.

Each encrypted backup is independent. Jarling cannot recover a forgotten
password. Before sharing a new `.jarling` file, the application reads and
decrypts it again to verify the round trip. Restore detects the format,
validates and migrates the snapshot if needed, and replaces the plan
transactionally so a failed restore leaves the current plan intact.

The web build uses browser-managed storage. Avoid shared or untrusted browser
profiles for sensitive information.

Deleting a plan removes its records from the active database. Files already
exported and device-level backups remain outside Jarling's control and must be
deleted separately.
