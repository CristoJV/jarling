# Jarling 1.0.0 release checklist

This is the release gate, not a historical progress log. A checked automated
item must be reproducible from a clean clone. Manual items require evidence
from the candidate binary that will be submitted.

## Release identity

- [x] Product name: Jarling.
- [x] User-facing version: `1.0.0`.
- [x] Android package and iOS bundle ID: `com.cristojv.jarling`.
- [x] EAS uses remote build-number management with production auto-increment.
- [ ] Create/link the Expo EAS project and verify its owner/project ID.
- [ ] Choose the public support contact and hosted privacy-policy URL.

## Automated gate

Run from a clean checkout with Node.js 22.13–24:

```bash
npm ci
npm run doctor
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage
npm audit --omit=dev --audit-level=critical
npm run export:web
npm run export:android
npm run export:ios
```

- [x] CI runs on pushes to `main` and `release/**` and on every pull request.
- [x] Expo SDK dependencies are checked against the SDK 57 compatibility map.
- [x] Android, iOS, and web JavaScript bundles are produced in CI.
- [ ] CI is green on the exact release commit.
- [ ] Production Android AAB succeeds on the EAS SDK 57 image.

`npm audit` currently reports high/moderate findings in Expo's Metro/build
toolchain (`image-size` and `uuid`). npm proposes a forced downgrade to Expo 53,
which is not an acceptable fix. CI blocks critical advisories, while Expo SDK
patches and upstream advisories must be reviewed before every candidate build.

## Data and upgrade safety

- [x] Fresh databases install the version-1 schema directly.
- [x] Development-era schema migrations are not shipped.
- [x] The forward-only migration runner remains tested for version 2 onward.
- [x] Compound native writes use the SQLite transaction connection.
- [x] Unknown schema versions fail instead of being guessed.
- [ ] Capture and commit a sanitized version-1 database fixture immediately
      after publishing, before any version-2 migration is developed.
- [ ] On a release build, create data, force-close the app, reopen it, and
      verify balances and settings.
- [ ] Export JSON, create an encrypted `.jarling` backup, delete the plan,
      restore the backup, and compare balances, targets, links, settings, and a
      categorized credit-card payment transfer.
- [ ] Repeat restoration with a wrong password and a malformed/oversized file.

## Device acceptance matrix

- [ ] Android phone with gesture navigation: all sheets, keyboards, floating
      actions, and the tab bar respect system insets.
- [ ] Android phone with three-button navigation: repeat the safe-area checks.
- [ ] Android light/dark/system theme and English/Spanish system language.
- [ ] Account creation for cash, credit, and tracking types.
- [ ] Expense, income, transfer, swipe deletion, search refinement, and memo.
- [ ] Open and close a transaction from both Budget and Transactions in light
      and dark mode; confirm the originating tab remains mounted with no white
      transition frame.
- [ ] Budget assignment, movement, overspending, rollover, and each target type.
- [ ] Reconciliation with and without an adjustment.
- [ ] Reports with empty, positive, negative, and sample data.
- [ ] App lock across background, foreground, cancellation, and unavailable
      device credentials.
- [ ] Maestro smoke flow passes against the release build.
- [ ] iOS equivalent smoke test on a real device before App Store submission.
- [ ] Web smoke test in a supported browser profile, including persistence and
      a compound write.

## Store material and policy

- [ ] Validate the final icon and splash screen from preview/production builds,
      not Expo Go.
- [ ] Prepare localized store descriptions and screenshots for English/Spanish.
- [ ] Prepare Google Play feature graphic and required screenshots.
- [ ] Complete Data safety and App Privacy declarations from `privacy.md`.
- [ ] Confirm that no analytics, network endpoint, debug log, or development
      secret is present in the production artifact.
- [ ] Tag the reviewed commit as `v1.0.0` and replace `TBD` in `CHANGELOG.md`.

## Deliberately deferred

- CSV/QIF/OFX/CAMT import and automatic bank connectivity.
- Scheduled transactions and persistent payee management.
- Cloud synchronization and multi-device conflict resolution.
- Application-managed encryption of the active SQLite database.
