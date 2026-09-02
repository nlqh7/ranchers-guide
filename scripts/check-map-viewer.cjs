const assert = require("node:assert/strict");
const viewer = require("../assets/js/map-viewer-core.js");

for (const scale of [1, 1.6, 2.6, 3, 4, 8]) {
  const marker = viewer.getMarkerMetrics(scale);
  assert.ok(Math.abs(marker.hitSize * scale - 44) < 0.0001, `marker click target must remain 44 screen pixels at ${scale}×`);
  assert.ok(Math.abs(marker.iconScale * scale - 1) < 0.0001, `native glyphs must not grow again at ${scale}×`);
}
assert.equal(viewer.clampZoom(9), 8, "dense native places must allow closer inspection than the old 3× ceiling");
const hitCandidates = [
  { id: "behind", x: 100, y: 100, size: 24, z: 1 },
  { id: "front", x: 110, y: 100, size: 24, z: 2 },
];
assert.equal(viewer.pickMarker(hitCandidates, { x: 100, y: 100 }).id, "front", "a painted front icon wins even if another anchor is closer");
assert.equal(viewer.pickMarker(hitCandidates, { x: 95, y: 100 }).id, "behind", "the exposed part of a rear icon must remain clickable");
assert.equal(viewer.pickMarker(hitCandidates, { x: 82, y: 100 }).id, "behind", "empty target padding uses the nearest anchor");
assert.equal(viewer.pickMarker(hitCandidates, { x: 70, y: 100 }), null, "a marker must not claim clicks beyond its 44px target");
assert.equal(viewer.pickMarker([], { x: 100, y: 100 }), null);
assert.deepEqual(viewer.viewportToCanvas({ sx: 0.75, sy: 0.5 }, { width: 800, height: 500 }, { width: 500, height: 500 }), { sx: 0.9, sy: 0.5 }, "wheel anchors must use the square canvas, not the wider viewport");
const zoomedCenter = viewer.zoomAt({ scale: 2, x: -40, y: -30 }, 2, { sx: 0.5, sy: 0.5 });
assert.deepEqual(zoomedCenter, { scale: 4, x: -80, y: -60 }, "button zoom keeps the same place at the center");

assert.deepEqual(viewer.getView("overview"), { scale: 3.2, x: -57.6, y: -76.8 });
assert.deepEqual(viewer.getView("overview-mobile"), { scale: 3.2, x: -57.6, y: -76.8 });
assert.deepEqual(viewer.getView("full"), { scale: 1, x: 0, y: 0 });
assert.deepEqual(viewer.getView("rural"), { scale: 2, x: -8, y: -50 });
assert.deepEqual(viewer.getView("city"), { scale: 2, x: -46, y: -50 });
assert.deepEqual(viewer.getView("city-center"), { scale: 2.6, x: -55.45, y: -77.15 });
assert.deepEqual(viewer.getView("east-coast"), { scale: 2.6, x: -80, y: 3.34 });

assert.deepEqual(viewer.panBy({ scale: 1, x: 0, y: 0 }, 0.1, 0.05), { scale: 1, x: 0, y: 0 });
assert.deepEqual(viewer.panBy({ scale: 2, x: 0, y: 0 }, -0.7, 0.7), { scale: 2, x: -50, y: 50 });
assert.deepEqual(viewer.focus(84.24, 48.71625, 2.6), { scale: 2.6, x: -80, y: 3.33775 });
assert.deepEqual(viewer.focus(71.3265, 79.67375, 2.6), { scale: 2.6, x: -55.4489, y: -77.15175 });

console.log("PASS: the embedded map opens on useful land and can still fit the full square texture.");
