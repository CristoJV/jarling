# Jarling

Local-first personal budgeting application built with Expo, React Native,
TypeScript, and SQLite.

The product and development roadmap lives in
[`docs/application-plan.md`](docs/application-plan.md).

## Requirements

- Node.js 22.13 or newer.
- npm.
- Android Studio for a local Android build.
- macOS and Xcode for a local iOS build.

## Development

Install dependencies and start Expo:

```bash
npm install
npx expo start
```

Useful platform commands:

```bash
npm run android
npm run ios
npm run web
```

## Validation

Run these checks before considering a change complete:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
```

## Architecture

```text
Presentation → Application → Domain ← Infrastructure
```

`src/app` contains Expo Router routes only. Dependency composition belongs in
`src/bootstrap`; SQLite details remain in `src/infrastructure`.
