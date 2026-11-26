# Atlas deployment and release guide

Last reviewed: 26 November 2026

## Current status

This development task has not deployed Atlas or changed production infrastructure. The application is a React 19 / TanStack Start project built with Vite. The Lovable integration and backend setup are documented in `AGENTS.md` and `docs/backend/README.md`.

The backend is not configured in the current source tree. Do not infer a working authentication, sync or production database from the presence of reference SQL.

## Local development

Requirements: Node.js 22 and npm.

```bash
npm ci
npm run dev
```

## Verification commands

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run preview
```

The GitHub Actions workflow `.github/workflows/ci.yml` uses read-only repository permissions
and runs:

1. Clean dependency installation with `npm ci`.
2. Vitest.
3. ESLint.
4. TypeScript checking.
5. Production build.

The lockfile was repaired on the development branch after CI exposed a mismatch with `package.json`. Do not replace `npm ci` with an unreviewed dependency update as a permanent workaround.

## Branch and review policy

- Develop on a separate `codex/*` branch.
- Do not force-push, amend, rebase or squash published commits.
- Keep the pull request draft until the change has been reviewed and the latest CI run passes.
- Do not merge to `main` without the owner's approval.
- Do not edit generated route trees or Lovable-managed migration files by hand.

## Environment configuration

Use the exact variables and secret locations documented in `docs/backend/README.md`. The currently documented public Supabase configuration is detected by the app but is not an active client connection.

Public browser configuration is not a substitute for server secrets. Keep service-role, AI and payment keys in the hosting provider's server-side secret manager. Never commit secrets or put them in Vite-exposed variables.

## Database and Lovable Cloud

- Enable Cloud/Auth only through the owner-controlled Lovable project.
- Apply schema changes through Lovable Cloud, not by manually editing managed migration directories.
- Review every policy and security-definer function before applying.
- Keep payments and hosted AI disabled.
- Verify two independent accounts and cross-user denial before enabling sync.
- Preserve local progress when the backend is offline.

See `docs/backend/README.md` and `docs/backend/schema.sql` for the prepared design. The SQL is not a production migration.

## Release checklist

- [ ] Latest branch CI passes tests, lint, TypeScript and production build.
- [ ] No secrets or generated files are included.
- [ ] Database policy review is complete if backend changes are proposed.
- [ ] Two-account isolation tests pass before cloud sync is enabled.
- [ ] Backup and restore have browser-level end-to-end coverage.
- [ ] Accessibility and responsive checks are complete.
- [ ] Monitoring and recovery procedures are documented.
- [ ] Any paid provider has a reviewed cost cap and explicit approval.
- [ ] Payment activation is explicitly approved and webhook tests pass.
- [ ] Public deployment is explicitly approved.
- [ ] Rollback and data recovery have been tested.

## Production deployment

No production deployment command is authorised by this document. Use the owner-controlled Lovable deployment workflow after the release checklist and explicit approval. Do not trigger a deployment merely to validate a branch build.
