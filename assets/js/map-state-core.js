(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RanchersMapState = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var markerLayers = ["shopping", "services", "transport", "landmarks"];

  function createState(overrides) {
    return Object.assign({
      selectedLocationId: null,
      region: "overview",
      category: "all",
      layers: markerLayers.slice(),
      evidence: "supported",
      relation: "all",
    }, overrides || {});
  }

  function markerVisible(marker, state) {
    if (!marker) return false;
    var categoryVisible = Array.isArray(state.layers)
      ? state.layers.includes(marker.category)
      : state.category === "all" || marker.category === state.category;
    var evidenceVisible = state.evidence === "all" || marker.evidenceLayer === state.evidence;
    return categoryVisible && evidenceVisible;
  }

  function selectLocation(state, marker) {
    return Object.assign({}, state, { selectedLocationId: marker ? marker.id : null });
  }

  function selectRegion(state, region) {
    return Object.assign({}, state, { region: region || "overview", selectedLocationId: null });
  }

  function setCategory(state, category, selectedMarker) {
    var nextCategory = category || "all";
    var nextLayers = nextCategory === "all" ? markerLayers.slice() : (nextCategory === "none" ? [] : [nextCategory]);
    var next = Object.assign({}, state, { category: nextCategory, layers: nextLayers });
    if (next.selectedLocationId && !markerVisible(selectedMarker, next)) next.selectedLocationId = null;
    return next;
  }

  function toggleLayer(state, layer, selectedMarker) {
    var current = Array.isArray(state.layers) ? state.layers : markerLayers.slice();
    var nextLayers = current.includes(layer)
      ? current.filter(function (item) { return item !== layer; })
      : current.concat(layer);
    var next = Object.assign({}, state, { layers: nextLayers });
    if (next.selectedLocationId && !markerVisible(selectedMarker, next)) next.selectedLocationId = null;
    return next;
  }

  function setAllLayers(state, visible, selectedMarker) {
    var next = Object.assign({}, state, { layers: visible ? markerLayers.slice() : [] });
    if (next.selectedLocationId && !markerVisible(selectedMarker, next)) next.selectedLocationId = null;
    return next;
  }

  function setEvidence(state, evidence, selectedMarker) {
    var next = Object.assign({}, state, { evidence: evidence || "supported" });
    if (next.selectedLocationId && !markerVisible(selectedMarker, next)) next.selectedLocationId = null;
    return next;
  }

  function setRelation(state, relation) {
    return Object.assign({}, state, { relation: relation || "all" });
  }

  function focusLocation(state, marker) {
    if (!marker) return selectLocation(state, null);
    var layers = Array.isArray(state.layers) ? state.layers.slice() : markerLayers.slice();
    if (!layers.includes(marker.category)) layers.push(marker.category);
    return Object.assign({}, state, {
      selectedLocationId: marker.id,
      category: marker.category,
      layers: layers,
      evidence: marker.evidenceLayer,
      relation: "all",
    });
  }

  function resolveLocationId(queryId, hashId, knownIds) {
    var known = new Set(knownIds || []);
    if (queryId && known.has(queryId)) return queryId;
    if (hashId && known.has(hashId)) return hashId;
    return null;
  }

  function groupsOpenAfterSearch(searching, matchingIds, rememberedIds) {
    return (searching ? matchingIds : rememberedIds || []).slice();
  }

  function directoryFilterKeepsSelection(marker, category) {
    return !marker || !category || category === "all" || marker.category === category;
  }

  function searchNeedsHistoryBoundary(selectedLocationId, currentQuery, nextQuery) {
    if (!selectedLocationId) return false;
    var current = String(currentQuery || "").trim().toLocaleLowerCase();
    var next = String(nextQuery || "").trim().toLocaleLowerCase();
    return current !== next;
  }

  return {
    createState: createState,
    markerVisible: markerVisible,
    selectLocation: selectLocation,
    selectRegion: selectRegion,
    setCategory: setCategory,
    toggleLayer: toggleLayer,
    setAllLayers: setAllLayers,
    setEvidence: setEvidence,
    setRelation: setRelation,
    focusLocation: focusLocation,
    resolveLocationId: resolveLocationId,
    groupsOpenAfterSearch: groupsOpenAfterSearch,
    directoryFilterKeepsSelection: directoryFilterKeepsSelection,
    searchNeedsHistoryBoundary: searchNeedsHistoryBoundary,
  };
});
