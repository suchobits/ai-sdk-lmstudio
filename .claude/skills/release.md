---
name: release
description: Prepare and execute a release for ai-sdk-lmstudio. Runs quality checks, creates a changeset, and guides through the PR-based release flow with Trusted Publishing to npm.
---

# Release Skill for ai-sdk-lmstudio

When the user asks to do a release, prepare a release, cut a release, publish, or bump version — follow this process.

## Pre-flight checks

Run all of these and stop if any fail:

1. `pnpm quality` — runs lint, typecheck, and unit tests
2. `pnpm build` — verify the package builds cleanly
3. `pnpm pack --dry-run` — verify package contents look correct (should include dist/, README.md, LICENSE)
4. `git status` — ensure working tree is clean (no uncommitted changes)
5. `git branch --show-current` — must NOT be on `main` (we use branch protection, all changes go through PRs)

If on `main`, create a release branch: `git checkout -b release/prepare-<version>`

## Determine the version bump

Ask the user what kind of release this is:
- **patch** (0.1.0 → 0.1.1): bug fixes, dependency updates, no API changes
- **minor** (0.1.0 → 0.2.0): new features, backwards-compatible additions
- **major** (0.1.0 → 1.0.0): breaking API changes

## Create the changeset

1. Check `git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD` to see what changed since last release
2. Write a changeset file at `.changeset/<descriptive-name>.md`:

```markdown
---
"ai-sdk-lmstudio": <patch|minor|major>
---

<Summary of changes — 1-3 bullet points, user-facing language>
```

3. Commit the changeset: `git add .changeset/ && git commit -m "Add changeset for <version bump>"`

## Open the PR

1. Push the branch: `git push -u origin <branch-name>`
2. Create PR with title like "Prepare release: <summary>" using `gh pr create`
3. Wait for CI to pass: `gh pr checks <number> --watch`

## What happens after merge

Tell the user:

> After you merge this PR, the release workflow will automatically:
> 1. Create a "Version Packages" PR that bumps the version in package.json and updates CHANGELOG.md
> 2. When you merge THAT PR, it publishes to npm via Trusted Publishing (OIDC, no tokens needed)
> 3. The published package will include verified provenance

## Integration test reminder

If LM Studio is running locally, also suggest running `pnpm test:integration` before the release. These tests hit the live API and verify real functionality. They are not required (CI doesn't run them) but are good practice before a publish.

## Troubleshooting

- If `pnpm quality` fails on lint: run `pnpm check` to auto-fix, then re-run
- If the release workflow fails on npm publish: verify Trusted Publishing is configured at https://www.npmjs.com/package/ai-sdk-lmstudio/access (GitHub Actions provider, workflow: release.yml, repo: suchobits/ai-sdk-lmstudio)
- If changesets/action creates an empty Version Packages PR: there may be no changeset files — verify `.changeset/` contains a markdown file (not just config.json)
