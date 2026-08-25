(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RanchersMapViewer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var views = {
    // The default layer is concentrated around the city and airport; start there
    // at a readable scale. The Fit control still returns to a full-map view.
    overview: { scale: 1.25, x: -12.5, y: -12.5 },
    // The 16:10 mobile viewport needs a little more scale to use its width
    // while keeping the default city and airport anchors inside the frame.
    "overview-mobile": { scale: 1.5, x: -2, y: -18 },
    full: { scale: 1, x: 0, y: 0 },
    rural: { scale: 2, x: -8, y: -50 },
    city: { scale: 2, x: -46, y: -50 },
    "city-north": { scale: 2.6, x: -57.2, y: -49.4 },
    "city-center": { scale: 2.6, x: -55.45, y: -77.15 },
    "city-south": { scale: 2.6, x: -65, y: -80 },
    "east-coast": { scale: 2.6, x: -80, y: 3.34 },
  };

  function clampZoom(value) {
    return Math.min(3, Math.max(1, Number(value) || 1));
  }

  function getView(name) {
    var view = views[name] || views.overview;
    return { scale: view.scale, x: view.x, y: view.y };
  }

  function pan(view, direction) {
    var next = { scale: clampZoom(view.scale), x: Number(view.x) || 0, y: Number(view.y) || 0 };
    var step = 7 / next.scale;
    if (direction === "left") next.x += step;
    if (direction === "right") next.x -= step;
    if (direction === "up") next.y += step;
    if (direction === "down") next.y -= step;
    return clampXY(next);
  }

  function stageToImage(stagePoint, view) {
    var scale = clampZoom(view && view.scale);
    var x = Number(view && view.x) || 0;
    var y = Number(view && view.y) || 0;
    var sx = Number(stagePoint && stagePoint.sx) || 0;
    var sy = Number(stagePoint && stagePoint.sy) || 0;
    var ix = (sx - 0.5 - x / 100) / scale + 0.5;
    var iy = (sy - 0.5 - y / 100) / scale + 0.5;
    return { x: Math.round(ix * 10000) / 100, y: Math.round(iy * 10000) / 100 };
  }

  function clampXY(view) {
    view.scale = clampZoom(view.scale);
    var limit = 50 * (view.scale - 1);
    view.x = Math.min(limit, Math.max(-limit, Number(view.x) || 0));
    view.y = Math.min(limit, Math.max(-limit, Number(view.y) || 0));
    view.x = Math.round(view.x * 1000000) / 1000000;
    view.y = Math.round(view.y * 1000000) / 1000000;
    return view;
  }

  function zoomAt(view, factor, anchor) {
    var scale = clampZoom(view && view.scale);
    var next = clampZoom(scale * (Number(factor) || 1));
    var x = Number(view && view.x) || 0;
    var y = Number(view && view.y) || 0;
    var sx = Number(anchor && anchor.sx) || 0;
    var sy = Number(anchor && anchor.sy) || 0;
    var ix = (sx - 0.5 - x / 100) / scale + 0.5;
    var iy = (sy - 0.5 - y / 100) / scale + 0.5;
    return clampXY({ scale: next, x: 100 * ((sx - 0.5) - (ix - 0.5) * next), y: 100 * ((sy - 0.5) - (iy - 0.5) * next) });
  }

  function panBy(view, dx, dy) {
    return clampXY({ scale: clampZoom(view && view.scale), x: (Number(view && view.x) || 0) + (Number(dx) || 0) * 100, y: (Number(view && view.y) || 0) + (Number(dy) || 0) * 100 });
  }

  function focus(mx, my, scale) {
    var s = clampZoom(scale);
    return clampXY({ scale: s, x: 100 * s * (0.5 - (Number(mx) || 0) / 100), y: 100 * s * (0.5 - (Number(my) || 0) / 100) });
  }

  return { clampZoom: clampZoom, getView: getView, pan: pan, stageToImage: stageToImage, clampXY: clampXY, zoomAt: zoomAt, panBy: panBy, focus: focus };
});
