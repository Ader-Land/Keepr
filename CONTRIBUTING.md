# Contributing to Keepr

Thanks for your interest in improving Keepr!

## Getting set up

```bash
git clone https://github.com/<your-fork>/Keepr.git
cd Keepr
npm install
npx expo run:android      # development build on a device or emulator
```

## Before opening a pull request

1. Open an issue first for larger changes so we can agree on the approach.
2. Create a branch from `main` (`feat/...`, `fix/...`, `docs/...`).
3. Make sure these pass locally:
   ```bash
   npm run lint
   npm test
   npx expo-doctor
   ```
4. Keep changes focused and update documentation and [CHANGELOG.md](CHANGELOG.md) when behaviour changes.
5. Describe *what* and *why* in the PR and link the issue.

## Guidelines

- **Translations:** every key in `src/i18n/translations.js` must exist in all six languages; a test enforces this.
  New user-facing text must go through `t('key')` — no hard-coded strings.
- **Privacy:** do not add network calls, analytics or new permissions without prior discussion.
- **Dependencies:** use `npx expo install <package>` so versions match the Expo SDK.
- **Comments and identifiers** are written in English.

## Licensing

By contributing you agree that your contribution is licensed under the project's
[GPL-3.0-only](LICENSE) license.
