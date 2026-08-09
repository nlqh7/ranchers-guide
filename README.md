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

## Map Data

`data/locations.json` is the source of truth for the 29-place English directory and the 13 markers shared by both map pages. After changing a location, run:

```powershell
node scripts/build-locations.cjs
node scripts/build-search-index.cjs
node scripts/check-map.cjs
```

Do not edit generated marker blocks in `map.html` or `zh/map.html`, or the generated English directory block in `map.html`, directly. Keep uncertain coordinates approximate and preserve locale-specific marker targets where the Chinese page links to a translated answer instead of the English directory.

## Local Preview

Use the repository preview server so canonical extensionless routes behave like Cloudflare Pages:

```powershell
node scripts/serve-local.cjs
```

Open `http://127.0.0.1:4176/`. Do not use `python -m http.server`; it returns 404 for valid routes such as `/guides/beginners-guide` because the source file is named `beginners-guide.html`.

## Pre-Launch Rule
Do not publish unverified game numbers as final data. Use pending/TBD copy until values are confirmed from the release build or an official source.
