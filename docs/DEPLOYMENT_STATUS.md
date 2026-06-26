# Deployment Status Guide

This guide explains how to verify that Praesidium is actually deployed and release-ready.

## Why combined status may be empty

GitHub's combined commit status can be empty when the repository uses GitHub Actions workflow runs instead of legacy commit status contexts. In that case, `statuses: []` does not necessarily mean failure; it only means no classic status contexts were attached to the commit.

For Praesidium, use the Actions workflow result and the deployed GitHub Pages page as the source of truth.

## What the deploy workflow does

The deploy workflow is defined in:

```text
.github/workflows/deploy.yml
```

Before publishing, it runs:

```bash
npm ci
npm run verify
```

`npm run verify` includes:

1. TypeScript typecheck.
2. Runtime selftest.
3. Save/restore regression test.
4. Balance simulation.
5. Release audit.
6. Production build.

Only after that does the workflow publish `./dist` to GitHub Pages.

## Release confirmation checklist

A build can be treated as deployed only when:

- [ ] The latest GitHub Actions deploy workflow finished successfully.
- [ ] The GitHub Pages URL opens the latest build.
- [ ] Hard refresh shows the latest version.
- [ ] Browser smoke test from `docs/FINAL_RELEASE_QA.md` passes.
- [ ] Mobile smoke test from `docs/MOBILE_QA.md` passes.

## Pages URL

```text
https://lunora-gather.github.io/Praesidium/
```

## If the deployed page looks stale

1. Hard refresh the page.
2. Confirm the workflow finished successfully.
3. Confirm the `gh-pages` branch contains the latest generated `dist` output.
4. Wait a short time for GitHub Pages cache propagation.
5. Re-open the page in a private/incognito window.

## Final release decision

Do not rely on `statuses: []` alone. For this repository, the release gate is:

```text
Actions deploy success + latest GitHub Pages build + final smoke tests
```
