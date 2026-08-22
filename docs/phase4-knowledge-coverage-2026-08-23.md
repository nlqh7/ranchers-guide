# Phase 4 Knowledge Coverage Audit

Date: 2026-08-23

## Verdict

Phase 4 is complete for the current evidence set. The search dossier has bilingual, route-checked next steps for the existing actionable entity records. No additional relation is justified solely by a named location, a planned feature, or a single unverified community lead.

## Covered location paths

The current location paths cover City Hall, Leafy Market, Bykii terminal, Vehicle Dealers, QuickFix, Car Pound, Cash-In Box, Train Station, Transit Posts, Auto Hue Garage, Auction Market, Police Station, Fuel Stations, and Subway Stations.

## Held for evidence

The following existing location records remain in the directory but do not receive a new journey until a current-build source provides a useful action and a safe destination: Overnight Parking, Farmers Market District, The Ranchers Airport, Sunvale Port, The Ranchers Museum, The Ranchers Ferris Wheel, Sunset Casino, NovaGen Corp Headquarters, Vitalis Corp Headquarters, Lina's Tools, Youssef's Stand, Wanglow's Garage, Mines & Dungeon Entrances, Coastal Zones & Wild Islands, and Ranch Helipad.

Their current boundaries include missing services, missing exact positions, community-only reports, or planned content. Holding them is intentional; it prevents a directory label from becoming an unsupported gameplay answer.

## Verification

- `knowledge-index.json` and `zh/knowledge-index.json` contain 29 location entities.
- Covered journeys are bilingual and route-checked by `scripts/check-entity-journeys.cjs`.
- `scripts/check-all.cjs` passes 42 checks and internal-link validation passes.
- No public page, dataset fact, coordinate, price, or version claim was added by this audit.

## Next stage

Phase 5 may proceed only through a bounded visitor-tool slice. Existing local-only tools remain available; account sync, contribution backend, and community features remain gated by their recorded conditions.
