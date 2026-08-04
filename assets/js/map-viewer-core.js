(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RanchersMapViewer = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var views = {
    overview: { scale: 1, x: 0, y: 0 },
    rural: { scale: 1.6, x: 24, y: 2 },
    city: { scale: 1.55, x: -25, y: 1 },
    "city-north": { scale: 2.25, x: -24, y: 18 },
    "city-center": { scale: 2.25, x: -24, y: 0 },
    "city-south": { scale: 2.25, x: -24, y: -17 },
    "east-coast": { scale: 2.45, x: -38, y: 1 },
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
    next.x = Math.min(45, Math.max(-45, next.x));
    next.y = Math.min(30, Math.max(-30, next.y));
    return next;
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
    view.x = Math.min(45, Math.max(-45, Number(view.x) || 0));
    view.y = Math.min(30, Math.max(-30, Number(view.y) || 0));
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

  return { clampZoom: clampZoom, getView: getView, pan: pan, stageToImage: stageToImage, clampXY: clampXY, zoomAt: zoomAt, panBy: panBy };
});
