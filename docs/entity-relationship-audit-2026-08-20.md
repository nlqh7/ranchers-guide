# Entity Relationship Audit — 2026-08-20

## Decision

Do not replace the current domain datasets with one `entities.json` file. The site already has useful, evidence-aware sources for animals, crops, materials, locations, NPCs and quests. A forced merge would duplicate migration risk without improving player answers.

The next architectural step is a small typed relationship layer over the existing datasets. Quest records should be the first producers because they naturally connect a player goal to NPCs, locations, materials, guides and recovery paths.

Do not build a progression planner yet. The current evidence supports several quest routes, but it does not support a complete or stable ordering of the Early Access progression graph.

## Current Inventory

| Entity type | Published records | Current relationship storage |
| --- | ---: | --- |
| Quests | 6 | 18 `relatedRoutes` URL strings |
| NPCs | 3 | 9 `relatedRoutes` URL strings |
| Locations | 29 | Links embedded in localized HTML; no typed entity references |
| Materials | 5 | No structured relationships |
| Animals | 4 species | No structured relationships |
| Crops | 6 crops + 4 inputs | No structured relationships |

Quest name quality is already explicit: two exact observed names, two community labels, one current community name and one descriptive objective. This distinction must survive any relationship work.

## Existing High-Value Quest Nodes

### Power to the Bench

- Connects Victor, City Hall, the electricity contract, the workbench and the electricity guide.
- Current evidence supports the five-objective route and 1,000 C commissioning fee on build `0.8.10.455`.
- Best first relationship-migration case because its NPC, location and guide targets already exist.

### Rust to Rumbling!

- Connects Victor, the old car, Bykii and vehicle recovery.
- Exact title and four-objective chain are video-observed.
- Missing retained dialogue choices prevent a complete transcript, but not a route graph.

### Real Eggs, Real Evidence

- Connects Gigi, Large Eggs, chicken care, the police chase and the present story endpoint.
- Strong player-goal node because it already spans animal care, quest recovery and police mechanics.

### Chicken Coop Mission

- Connects Angela, chicken acquisition, transport and the Chicken Troubleshooter.
- The label is community-supplied; the graph must never promote it to an exact tracker title.

### Roof-building tutorial objective

- Connects the building guide, tracker recovery and failed-quest replay.
- No reliable NPC or exact title is retained. It is a useful symptom node, not a complete quest record.

### Solar panel objective

- Connects Victor, City Hall, electricity and the required basic ground panel.
- Exact title and prerequisite timing remain unverified, so it cannot anchor progression order yet.

## Relationship Gaps

1. `relatedRoutes` describes where to send a reader, not what the relationship means. `/map#city-hall` cannot answer whether City Hall starts, hosts or merely supports a quest.
2. Relationships are asymmetric. A quest can link to an NPC while the NPC omits the corresponding quest, and neither side is validated as a graph edge.
3. Domain links are mixed with presentation links. NPC, location, guide, problem and tool URLs all share one untyped array.
4. Materials and locations already contain useful relationships in prose, such as Zirconite → Meriam → City Hall, but the generator cannot query them.
5. Localized HTML stores some links, so changing a route or relation requires editing presentation text rather than one structured record.
6. Source registries are repeated per dataset. This is acceptable for dataset locality today, but it means a new global graph must not pretend that source IDs are globally unique.

## Recommended Model

Keep the existing datasets as the authoritative entity records. Add typed relations alongside each record, beginning with quests:

```json
{
  "relations": [
    {
      "predicate": "involves-npc",
      "target": { "type": "npc", "id": "victor" },
      "sourceIds": ["launch-video"],
      "build": "0.8.10.455",
      "validity": "current"
    },
    {
      "predicate": "takes-place-at",
      "target": { "type": "location", "id": "city-hall" },
      "sourceIds": ["launch-video"],
      "build": "0.8.10.455",
      "validity": "current"
    }
  ],
  "relatedRoutes": [
    "/guides/electricity-power#two-paths"
  ]
}
```

`relations` answers knowledge questions. `relatedRoutes` remains for non-entity reading destinations such as guides, tools and problem pages. Do not infer a relation merely because two pages link to each other.

### Initial predicates

- `involves-npc`
- `takes-place-at`
- `requires-material`
- `requires-item`
- `requires-animal-product`
- `unlocks-quest`
- `recovers-with`

Keep this vocabulary deliberately small. Add a predicate only when at least two retained facts need it.

## Progression Map Gate

A public progression planner would currently overstate the evidence. Day observations are not the same as prerequisites, and several objective names or trigger times remain unverified.

Build only after the retained evidence supports:

1. at least eight current-build milestones;
2. an explicit start condition for every milestone;
3. a verified predecessor or an explicit `independent` state;
4. required money/materials without guessed quantities;
5. a recovery route for known blocking states;
6. a named build and source for every ordering edge.

Until then, the quest database should answer “what is this objective and what do I do next?” without claiming a complete game-wide order.

## Migration Difficulty

| Change | Difficulty | Risk |
| --- | --- | --- |
| Add typed relations to the six quests | Low | Existing facts already name most targets |
| Validate target type/ID and reciprocal discovery | Low | Deterministic check can cover all edges |
| Render “NPC / Place / Required” groups on quest cards | Medium | Requires bilingual labels and empty-state rules |
| Migrate NPC relations | Low | Only three records currently pass the gate |
| Migrate material/location prose into relations | Medium | Must separate current facts from historical or unverified text |
| Merge all datasets into `entities.json` | High | Large migration, weaker locality, no current benefit |
| Build a progression planner now | High | Ordering evidence is incomplete; product would imply false certainty |

## Implementation Order

1. Add a deterministic relationship validator and typed `relations` to quests only.
2. Generate grouped quest connections while preserving current aggregate pages and URLs.
3. Derive backlinks at build time; do not hand-maintain reciprocal arrays.
4. Add NPC typed relations after the quest implementation proves useful.
5. Migrate only repeated high-value material/location relations backed by current evidence.
6. Reassess progression after the evidence gate is met or GSC/community demand identifies a concrete planning problem.

## Explicit Holds

- No single-file entity migration.
- No new standalone entity pages.
- No quest-order arrows based only on observed day numbers.
- No generated material requirements where quantities are unknown.
- No relationship extracted from prose without retaining its source and build context.
- No AI-generated geography or coordinate changes in the map layer.

## Top Recommendation

Deepen the existing quest module first: give it a small typed relationship interface and derive cross-links from that interface. This concentrates graph knowledge in one place, improves locality for future evidence updates and provides the most player value without increasing URL count.

## Local Implementation Status

Implemented locally after the audit, without adding a route or changing the homepage:

- all six quests now declare a `relations` array, including an explicit empty array when evidence supports no typed connection;
- six sourced relations currently clear the gate across Victor, Angela, Gigi, City Hall and Bykii;
- quest pages group typed entity connections separately from named guide/problem/tool destinations;
- NPC quest backlinks are derived from quest relations rather than maintained in both datasets;
- unsupported targets, predicates, sources, builds, validity values, duplicates and entity-route duplication fail deterministically;
- English and Chinese generated pages, isolated search indexes and all aggregate checks pass;
- desktop and 390px browser QA found no horizontal overflow, console warning or broken backlink; derived backlink targets are 44px high.

This local batch is not committed or deployed yet.
