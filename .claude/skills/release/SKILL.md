---
name: release
description: >
  ALWAYS invoke when the user types /release, wants to publish to npm, cut a new version, prepare a release, bump the version, or create a changeset for ai-sdk-lmstudio. Runs quality gates, creates a changeset, opens a PR, and guides through the Trusted Publishing flow to npm.
user-invocable: true
disable-model-invocation: true
---

# release

Guides the full ai-sdk-lmstudio release process from quality checks through npm publish. This project uses changesets for versioning and OIDC Trusted Publishing (no npm tokens) for automated publishing via GitHub Actions.

## Workflow

### 1. Pre-flight checks

Run each command and stop on first failure:

```bash
pnpm quality        # lint (biome) + typecheck (tsc) + unit tests (vitest)
pnpm build          # tsup build → dist/
pnpm pack --dry-run # verify package contents: dist/, README.md, LICENSE
git status          # working tree must be clean
```

If `pnpm quality` fails on lint, run `pnpm check` to auto-fix formatting, then re-run.

If LM Studio is running locally, suggest running `pnpm test:integration` as well. These tests hit the live API and are not required but catch real issues before publish.

### 2. Ensure correct branch

Check the current branch with `git branch --show-current`. This project uses branch protection — all changes go through PRs.

If on `main`, create a release branch:

```bash
git checkout -b release/vX.Y.Z
```

### 3. Determine version bump

Use `AskUserQuestion` to ask what kind of release:

- **patch** (0.1.0 → 0.1.1) — bug fixes, dependency updates, no API changes
- **minor** (0.1.0 → 0.2.0) — new features, backwards-compatible additions
- **major** (0.1.0 → 1.0.0) — breaking API changes

### 4. Review changes since last release

```bash
git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD
```

Summarize the changes for the user before writing the changeset.

### 5. Create the changeset

Write a file at `.changeset/<descriptive-slug>.md`:

```markdown
---
"ai-sdk-lmstudio": patch
---

- Fixed streaming token usage tracking for thinking models
- Updated dependency versions
```

Use user-facing language in the summary. The slug should be a short kebab-case description (e.g., `fix-streaming-usage.md`).

Commit:

```bash
git add .changeset/
git commit -m "chore: add changeset for vX.Y.Z"
```

### 6. Open the PR

```bash
git push -u origin <branch-name>
gh pr create --title "Prepare release: <summary>" --body "<changeset summary>"
gh pr checks <number> --watch
```

Wait for CI to pass. If it fails, fix and push again.

### 7. Post-merge: the two-PR flow

After the changeset PR is merged, explain to the user:

> The release workflow (`.github/workflows/release.yml`) will now automatically create a **"Version Packages"** PR. This PR:
>
> - Bumps the version in `package.json`
> - Updates `CHANGELOG.md` with the changeset summary
> - Removes the consumed `.changeset/*.md` file
>
> **To publish:** merge the "Version Packages" PR. The release workflow will then automatically publish to npm via OIDC Trusted Publishing with provenance.

### 8. Verify the publish

After the Version Packages PR is merged, verify:

```bash
npm view ai-sdk-lmstudio version   # should show the new version
```

Check the GitHub Actions run for the release workflow completed successfully. The package at npmjs.com/package/ai-sdk-lmstudio should show the new version with a "Published with provenance" badge.

## Gotchas

- The changeset `.md` file must have the package name in quotes: `"ai-sdk-lmstudio": patch` — unquoted names with hyphens break YAML parsing.
- The release workflow requires OIDC Trusted Publishing configured at npmjs.com (GitHub Actions provider, workflow: `release.yml`, repo: `suchobits/ai-sdk-lmstudio`). If publish fails, check that config first.
- Branch protection requires the `build-and-test` status check to pass before merging. If the PR can't merge, verify CI passed.
- Don't create empty changesets — the Version Packages PR won't appear if there are no changeset files beyond `config.json`.
