const assert = require("node:assert/strict");
const viewer = require("../assets/js/map-viewer-core.js");

assert.deepEqual(viewer.getView("overview"), { scale: 1.25, x: -12.5, y: -12.5 });
assert.deepEqual(viewer.getView("overview-mobile"), { scale: 1.5, x: -2, y: -18 });
assert.deepEqual(viewer.getView("full"), { scale: 1, x: 0, y: 0 });
assert.deepEqual(viewer.getView("rural"), { scale: 2, x: -8, y: -50 });
assert.deepEqual(viewer.getView("city"), { scale: 2, x: -46, y: -50 });
assert.deepEqual(viewer.getView("city-center"), { scale: 2.6, x: -55.45, y: -77.15 });
assert.deepEqual(viewer.getView("east-coast"), { scale: 2.6, x: -80, y: 3.34 });

assert.deepEqual(viewer.panBy({ scale: 1, x: 0, y: 0 }, 0.1, 0.05), { scale: 1, x: 0, y: 0 });
assert.deepEqual(viewer.panBy({ scale: 2, x: 0, y: 0 }, -0.7, 0.7), { scale: 2, x: -50, y: 50 });
assert.deepEqual(viewer.focus(84.24, 48.71625, 2.6), { scale: 2.6, x: -80, y: 3.33775 });
assert.deepEqual(viewer.focus(71.3265, 79.67375, 2.6), { scale: 2.6, x: -55.4489, y: -77.15175 });

console.log("PASS: the square native map can focus verified POIs without exposing blank edges.");
