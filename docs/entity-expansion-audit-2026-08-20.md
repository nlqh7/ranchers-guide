# Entity Expansion Audit — 2026-08-20

## Decision

Expand the knowledge graph before expanding page count. Publish one searchable database page per entity type. An individual NPC or quest receives a standalone page only after demand and evidence justify a full answer.

## Current Inventory

- Animals: 4 species in `data/animals.json`.
- Crops: 6 crops and 4 inputs in `data/crops.json`.
- Materials: 5 records in `data/materials.json`.
- Locations: 29 directory records and 13 approximate markers in `data/locations.json`.
- NPC facts: scattered across location records, guides and retained video observations.
- Quest facts: scattered across six guides/problem routes and retained video/community evidence.

## Publication Gates

### NPC

Publish only when the retained evidence supports all three:

1. identity or role;
2. a current player interaction, service or quest function;
3. a useful connection to an existing map, guide, quest or database route.

Angela, Victor and Gigi pass. Lina, Youssef, Meriam, Nestor, Olaug and Salome remain held because their current-build role, inventory, exact location or practical use is incomplete.

### Quest

Publish only when the retained evidence supports all three:

1. an exact observed name, a current community label, or an explicitly marked descriptive name;
2. a recognizable start condition or objective;
3. an actionable step, decision path or failure recovery route.

Six records pass as aggregate quest entries: Rust to Rumbling!, Power to the Bench, Chicken Coop Mission, the roof-building tutorial objective, Real Eggs, Real Evidence and the solar-panel objective. Descriptive/community labels must never be presented as exact tracker text.

## Migration Order

1. Build `data/quests.json` and `data/npcs.json` with source registries and three-field evidence semantics.
2. Generate bilingual aggregate pages at `/database/quests` and `/database/npcs`.
3. Connect entries to existing guides, map searches and each other.
4. Add both pages to isolated English/Chinese search indexes and reciprocal hreflang metadata.
5. Reassess standalone pages only after GSC demand or repeated current-build questions appear.

## Explicit Holds

- No target URL count.
- No automatic page per entity.
- No exact NPC map pin without a current screenshot or reproducible route.
- No historical Wiki shop inventory promoted to current fact.
- No quest reward, prerequisite or tracker title inferred from a discussion title.
