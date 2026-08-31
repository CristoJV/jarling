# Persistence and portability

## SQLite

Native data is stored in ordinary SQLite inside the platform-private app
directory. Foreign keys and structural checks complement Domain and
Application validation. The active database is not encrypted by Jarling.

Fresh installations execute the complete schema in `current-schema.ts` and
record its current version. Released databases advance through the retained,
ordered, forward-only migration runner. Once a migration ships, it is immutable.
Every future schema change must update both the fresh schema and add exactly the
next migration, with tests for clean creation and upgrade from a released
fixture.

Compound writes use a serialized `UnitOfWork`. Native SQLite runs them through
the transaction-scoped connection supplied by Expo. Repositories must never
escape to the raw connection during that operation.

## Portable plan snapshot

Readable JSON export and encrypted `.jarling` backup carry the same versioned
snapshot. The pipeline is:

```text
repositories → snapshot → validate/migrate → repositories
                         ↘ encrypt/decrypt ↗
```

Format detection happens from content. Both formats use one migration,
validation, and transactional restore path. Validation covers shape, size,
domain relationships, foreign keys, and SQLite integrity before replacement.
Typed causes distinguish password authentication failure, corruption,
unsupported versions, invalid snapshots, migration failures, and restore
failures.

`.jarling` uses AES-256-GCM and a per-file password-derived key using
PBKDF2-HMAC-SHA256 with at least 310,000 iterations and a unique salt. The
wrapper stores its version and cryptographic parameters. New encrypted exports
are read back, decrypted, and compared with the source snapshot before being
shared. Legacy supported wrappers are decoded at the boundary rather than
creating a second restore implementation.

Schema and backup versions are independent. A schema change does not
automatically require a backup version increase unless it changes the portable
contract or valid state set.

See [ADR 0003](../adr/0003-sqlite-baseline-and-forward-migrations.md),
[ADR 0004](../adr/0004-data-protection-and-portability.md), and
[ADR 0006](../adr/0006-atomic-sqlite-application-writes.md).
