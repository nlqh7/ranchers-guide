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

## Building Requirements

Native-build crafting references live in `data/build-recipes.json`. They contain selected interpreted recipe ingredients, workshop requirements and original item names, not raw game files or runtime availability claims. `node scripts/build-crafting-reference.cjs` regenerates the bilingual crafting/building reference blocks; `--check` verifies synchronization. Historical observations remain separate from configuration records.

`data/building-checklists.json` is the source for the bilingual construction-guide and ranch-checklist requirement tables. Each building tier gets a separate row; historical quantities stay labeled. Optional material tracking retains browser-local progress.

Run `node scripts/build-building-requirements.cjs` after changing the data or table renderer, then `node scripts/build-search-index.cjs` and `node scripts/check-ranch-checklist.cjs`. Use `--check` on the requirements generator to check generated blocks without writing them.

## Shop References

`data/build-shops.json` contains selected vendor listings, seasonal sections and shop material requirements. Run `node scripts/build-shop-reference.cjs`, `node scripts/build-crafting-reference.cjs` and `node scripts/build-database.cjs`, then rebuild search. Store conditions are separate from recipes and do not establish stock, prices or unlock timing. Unmatched vehicle references remain labeled rather than guessed.

## Equipment References

`data/build-equipment.json` supplies seasonal water/electricity configuration to the existing utility guides. Run `node scripts/build-equipment-reference.cjs`, rebuild shop references and database navigation, then rebuild search. Its values have no verified unit or settlement interval and must not be converted into daily output or bills.

## Consumable References

`data/build-consumables.json` supplies exact bilingual names, energy/health fields and explicit drink flags to the existing resources guides. Run `node scripts/build-consumable-reference.cjs`, rebuild shop references, then rebuild search. Missing flags remain unknown; configured restore values do not establish actual eating effects, availability or animal yields.

## Farm Equipment

`data/build-farm-equipment.json` contains source-linked farm-tool names and nullable seasonal configuration. `node scripts/build-farm-equipment.cjs` combines these with `data/build-recipes.json` into the existing bilingual farming guides. Regenerate crafting references, database navigation and search afterward. Grid parameters do not establish tile coverage; absent water/power fields are not zero. Keep recipe and equipment search answers deduplicated while retaining old anchors.

## Fertilizer References

The three fertilizer inputs in `data/crops.json` retain source-linked names, intended-use descriptions, energy and held/stacking settings. Regenerate crop pages, shop references, database navigation, knowledge and search indexes after editing them. `node scripts/check-fertilizer-reference.cjs` verifies profile links and exact-name search. File descriptions are not tested effects; empty localization descriptions remain unknown, historical prices remain separate, and the official fertilizer warning stays linked.

## Resource References

`data/build-resources.json` stores eight exact bilingual resource definitions, inventory configuration and nullable Energy/Health fields. Run `node scripts/build-resource-reference.cjs`, `node scripts/build-materials.cjs`, `node scripts/build-shop-reference.cjs`, `node scripts/build-database.cjs`, `node scripts/build-knowledge-index.cjs` and `node scripts/build-search-index.cjs`. Material profiles join every matching recipe ID/quantity from `data/build-recipes.json`; water, energy and fuel use the existing resources guide. Internal prices remain private; flags do not establish runtime selling, and missing stats are not zero. Verify with `node scripts/check-resource-reference.cjs`.

## Local Preview Server

Use the repository preview server so canonical extensionless routes behave like Cloudflare Pages:

```powershell
node scripts/serve-local.cjs
```

Open `http://127.0.0.1:4176/`. Do not use `python -m http.server`; it returns 404 for valid routes such as `/guides/beginners-guide` because the source file is named `beginners-guide.html`.

## Pre-Launch Rule
Do not publish unverified game numbers as final data. Use pending/TBD copy until values are confirmed from the release build or an official source.
