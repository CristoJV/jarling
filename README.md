<p align="center">
  <img src="assets/images/jarling-icon.png" width="164" alt="Jarling app icon" />
</p>

<h1 align="center">Jarling</h1>

<p align="center">
  <strong>Envelope budgeting, built for privacy.</strong><br />
  Give every euro a purpose and keep your financial plan on your device.
</p>

<p align="center">
  <strong>English</strong> · <a href="docs/README.es.md">Español</a>
</p>

<p align="center">
  <img alt="Expo" src="https://img.shields.io/badge/Expo-57-000020?logo=expo" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript" />
  <img alt="Local first" src="https://img.shields.io/badge/data-local--first-167D6C" />
</p>

Jarling is a local-first personal budgeting app for Android, iOS, and the web.
It brings the clarity of the **envelope budgeting method** to a modern,
focused interface: divide the money you have into purposeful categories, spend
from those categories, and adjust the plan when life changes.

Jarling is designed for planning, not merely tracking expenses after the money
is gone. Accounts, transactions, targets, and reports all support one central
question: **what does the money you have need to do next?**

## Envelope budgeting

Traditional envelopes turn one balance into several spending decisions.
Jarling applies the same method digitally:

1. Record the money currently available in your accounts.
2. Assign it to envelopes such as rent, groceries, transport, or savings.
3. Spend from those envelopes and move money between them when priorities
   change.

Only money you actually have is assigned. Category balances make trade-offs
visible before spending, while targets help prepare for recurring bills and
long-term goals.

## Highlights

- Monthly envelope budgets organized into flexible groups and categories.
- Weekly, monthly, yearly, and custom funding targets.
- Clear funded, underfunded, spent, available, and overspent states.
- Transactions, account transfers, payees, memos, and refinable search.
- Account balances and reconciliation against the real-world balance.
- Income, spending, and net-worth reports.
- Local SQLite storage in the application's private directory, with no account
  required.
- Readable JSON exports and portable, independently password-encrypted
  `.jarling` backups.
- Optional protection with the device credentials.
- Light, dark, and system themes.
- English and Spanish interfaces selected from the device language.

## Product principles

- **Plan before spending.** The budget is the source of truth; transaction
  tracking keeps it accurate.
- **Own your data.** Financial information is stored locally and the core
  experience does not depend on a cloud account.
- **Make trade-offs explicit.** Moving money between envelopes is a normal part
  of maintaining a realistic plan.

## Getting started

You need Node.js 22.13 or newer and npm. Native builds additionally require
Android Studio or, on macOS, Xcode.

Install the dependencies and start the platform you want to use:

```bash
npm install
npm run android
```

Run a specific platform:

```bash
npm run android
npm run ios
npm run web
```

## Validation

Run the complete quality gate before considering a change finished:

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage
npm run test:e2e # requires Maestro and a native build/emulator
```

Jarling is under active development. Read the
[application plan](docs/application-plan.md) for the roadmap, product decisions,
and acceptance criteria. Data handling is documented in the bilingual
[privacy and data protection note](docs/privacy.md).
