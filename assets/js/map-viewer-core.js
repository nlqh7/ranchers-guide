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

  return { clampZoom: clampZoom, getView: getView, pan: pan };
});
