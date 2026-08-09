# The Ranchers Guide

Unofficial fan-made guide site for The Ranchers (Early Access: July 30, 2026).
Static site, deployed via Cloudflare Pages.

## Structure
- Root `.html` files: top-level pages.
- `guides/`: long-form guide articles.
- `database/`: searchable data pages.
- `tools/`: interactive static tools.
- `assets/`: shared CSS, JS, images, icons, and social preview art.
- `zh/`: Simplified Chinese core pages with their own canonical URLs and search index.

## Search Indexes

Search is prebuilt for both locales. After changing searchable English or Chinese content, run:

```powershell
node scripts/build-search-index.cjs
node scripts/build-search-index.cjs --check
```

The generator writes `search-index.json` for English and `zh/search-index.json` for Simplified Chinese. The `--check` mode rebuilds both indexes in memory and fails if either committed file has drifted.

## Pre-Launch Rule
Do not publish unverified game numbers as final data. Use pending/TBD copy until values are confirmed from the release build or an official source.
