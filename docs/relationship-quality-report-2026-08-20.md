# Relationship Layer Quality Report - 2026-08-20

## Scope

This report audits the first typed relationship batch without adding entities, relations or public pages. The audited graph connects quests to current NPC and location records; guide, problem and tool destinations remain named reading routes.

An **orphan entity** has neither a typed relation nor a reading route. A **typed isolate** has no evidence-backed entity relation yet, but still gives the player a valid next-answer route. These are intentionally different states.

## Snapshot

| Measure | Result |
| --- | ---: |
| Quest records | 6 |
| NPC records | 3 |
| Location records available as targets | 29 |
| Published typed relations | 6 |
| Invalid references | 0 |
| Orphan entities | 0 |
| Typed isolates with reading routes | 2 |

The typed isolates are `roof-building` and `solar-panel-objective`. Both retain named next-answer routes, so neither is a navigation dead end. Their missing entity edges are evidence gaps, not implementation defects.

## Invalid References

None. Every typed target resolves to an existing NPC or location ID, every relation uses an allowed predicate, and every edge carries evidence level, build, validity and registered source IDs.

## Orphan Entities

None in the relationship-enabled quest/NPC scope. Quest-to-NPC links generate reverse NPC-to-quest navigation at build time instead of maintaining duplicate backlinks by hand.

## Missing High-Confidence Links

These are candidates for later evidence review, not approved additions:

1. `Victor -> City Hall`: the NPC record already describes Victor at City Hall, but NPC-to-location relations are outside the first quest-only interface.
2. `Chicken Coop Mission -> Chicken`: the objective and animal guide overlap, but animal targets are outside the current interface.
3. `Real Eggs, Real Evidence -> Chicken`: Large Eggs connect the quest to chicken care, but the relation should wait for the animal adapter.
4. `Angela -> Chicken`: Angela's current seller role supports the association, but it should be added only with the animal relationship batch.
5. `Chicken -> Hay`: current animal evidence supports feed usage; this belongs to a later animal/material pass rather than this validation release.

No relation is proposed for `solar-panel-objective -> Victor/City Hall`: the retained quest evidence does not establish that edge. No NPC or location relation is proposed for `roof-building` for the same reason.

## Next-Step Navigation

The static scan ignores breadcrumbs and table-of-contents links, then checks whether each page's main content offers another internal route.

- Expected functional surfaces without next-step links: `contribute.html`, `search.html`, `zh/search.html`.
- Content navigation gap: `community.html`.

`community.html` is the only actionable content-page gap. It should be evaluated after the current relationship batch is observed; this report does not modify it.

## Measurement Limits

Repository checks can prove graph integrity and navigation availability, but they cannot prove that visitors use the links. Quest-to-guide clicks, NPC-to-quest clicks and multi-page sessions require analytics events or equivalent click-path data. Do not infer engagement from rankings or page views alone.

## Recommendation

Deploy this stable batch and observe it before extending relations to materials or animals. The next implementation should be selected from actual click paths or repeated current-build questions. A Player Journey remains on hold because verified ordering evidence is still insufficient.
