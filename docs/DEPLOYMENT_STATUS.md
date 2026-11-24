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
npm audit --audit-level=high
npm run verify
npx playwright install --with-deps chromium webkit
npm run verify:browser
```

`npm run verify` builds the production bundle and checks type safety, gameplay, save/restore, challenge rules, onboarding, balance, performance and release metadata. The browser gate tests both Chromium and WebKit against production bundles.

Only after that does the workflow publish `./dist` to GitHub Pages.

## Release confirmation checklist

A build can be treated as deployed only when:

- [ ] The exact source commit passed the Actions deploy workflow and the resulting `gh-pages` revision was built by Pages.
- [ ] The public HTML carries the expected `praesidium-release` version. The service worker and its listed resources match the same published release, not just HTTP 200.
- [ ] A browser with fresh storage can start a battle, save it and reload it from the public URL.
- [ ] Record physical mobile, VoiceOver and outside playtest as separate evidence; never infer them from the desktop smoke.

Run `npm run verify:pages` after the public URL has propagated. For commit-to-CDN comparison, extract the exact successful `gh-pages` build tree into a directory and set `TEST_PAGES_BUILD_DIR` to that directory before running the command. The checker verifies every offline resource digest, then starts, saves and reloads a battle in fresh Chromium and WebKit contexts.

## Pages URL

```text
https://lunora-gather.github.io/Praesidium/
```

## If the deployed page looks stale

1. Hard refresh the page.
2. Confirm the workflow finished successfully.
3. Confirm the `gh-pages` branch contains the latest generated `dist` output.
4. Wait a short time for GitHub Pages cache propagation.
5. Re-open the page in a private/incognito window. For a normal update, save first and close all open Praesidium tabs instead of clearing site data.

## Final release decision

Do not rely on `statuses: []` alone. For this repository, the release gate is:

```text
Actions deploy success + latest GitHub Pages build + final smoke tests
```
