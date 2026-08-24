(function () {
  "use strict";

  var search = document.querySelector("[data-location-search]");
  var category = document.querySelector("[data-location-category]");
  var entries = Array.from(document.querySelectorAll("[data-location-entry]"));
  var locationGroups = Array.from(document.querySelectorAll("[data-location-group]"));
  var count = document.querySelector("[data-location-count]");
  var empty = document.querySelector("[data-location-empty]");
  var mapStage = document.querySelector("[data-map-stage]");
  var mapImage = document.querySelector("[data-map-image]");
  var inspector = document.querySelector("[data-map-inspector]");
  var regionButtons = Array.from(document.querySelectorAll("[data-map-region]:not([data-location-map])"));
  var locationButtons = Array.from(document.querySelectorAll("[data-location-map]"));
  var markerFocusButtons = Array.from(document.querySelectorAll("[data-marker-focus]"));
  var zoomButtons = Array.from(document.querySelectorAll("[data-map-zoom]"));
  var panButtons = Array.from(document.querySelectorAll("[data-map-pan]"));
  var focusMarker = document.querySelector("[data-map-focus-marker]");
  var focusLabel = document.querySelector("[data-map-focus-label]");
  var addToggle = document.querySelector("[data-map-add-toggle]");
  var markerLayer = document.querySelector("[data-map-marker-layer]");
  var markers = markerLayer ? Array.from(markerLayer.querySelectorAll("[data-marker-category]")) : [];
  var knownMarkerIds = Array.from(new Set(markers.map(function (marker) { return marker.dataset.markerId; })));
  var markerFilterButtons = Array.from(document.querySelectorAll("[data-map-pin-filter]"));
  var layerToggleButtons = Array.from(document.querySelectorAll("[data-map-layer-toggle]"));
  var layerActionButtons = Array.from(document.querySelectorAll("[data-map-layer-action]"));
  var layerSummary = document.querySelector("[data-map-layer-summary]");
  var evidenceFilterButtons = Array.from(document.querySelectorAll("[data-map-evidence-filter]"));
  var relationFilterButtons = Array.from(document.querySelectorAll("[data-map-relation-filter]"));
  var progressCount = document.querySelector("[data-map-progress-count]");
  var discoveryToggle = document.querySelector("[data-map-discovery-toggle]");
  var progressReset = document.querySelector("[data-map-progress-reset]");
  var inspectorLink = inspector ? inspector.querySelector("[data-map-inspector-link]") : null;
  var inspectorConnections = inspector ? inspector.querySelector("[data-map-inspector-connections]") : null;
  var inspectorConnectionList = inspector ? inspector.querySelector("[data-map-inspector-connection-list]") : null;
  var inspectorJourney = inspector ? inspector.querySelector("[data-map-inspector-journey]") : null;
  var inspectorJourneyList = inspector ? inspector.querySelector("[data-map-inspector-journey-list]") : null;
  var pinLayer = document.querySelector("[data-map-pin-layer]");
  var pinForm = document.querySelector("[data-map-pin-form]");
  var pinName = document.querySelector("[data-map-pin-name]");
  var pinCategory = document.querySelector("[data-map-pin-category]");
  var pinNotes = document.querySelector("[data-map-pin-notes]");
  var pinCoords = document.querySelector("[data-map-pin-coords]");
  var pinClose = document.querySelector("[data-map-pin-close]");
  var mapPanel = document.querySelector(".map-viewer-panel");
  var mapExpand = document.querySelector("[data-map-expand]");
  var mapFullscreenClose = document.querySelector("[data-map-fullscreen-close]");
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var hasDirectory = !!(search && category && entries.length && window.RanchersMap);
  var searchWasActive = false;
  var openGroupsBeforeSearch = [];
  var activePin = null;
  var placing = false;
  var selectedMarker = null;
  var mapExpanded = false;
  var mapInteractionState = window.RanchersMapState ? window.RanchersMapState.createState() : null;
  var knowledgeEntities = [];
  var relationFilter = "all";
  var discoveryKey = "ranchers-guide-map-progress-v1";
  var discovered = {};
  try { discovered = JSON.parse(localStorage.getItem(discoveryKey) || "{}"); } catch (_) { discovered = {}; }
  if (!mapStage || !mapImage || !window.RanchersMapViewer) return;

  Array.from(document.querySelectorAll("[data-protected-game-art]")).forEach(function (asset) {
    asset.setAttribute("draggable", "false");
    asset.addEventListener("contextmenu", function (event) { event.preventDefault(); });
    asset.addEventListener("dragstart", function (event) { event.preventDefault(); });
  });

  if (inspector && !inspectorJourney) {
    inspectorJourney = document.createElement("div");
    inspectorJourney.className = "map-inspector-journey";
    inspectorJourney.dataset.mapInspectorJourney = "";
    inspectorJourney.hidden = true;
    var journeyHeading = document.createElement("strong");
    journeyHeading.textContent = isChinese ? "继续解决这个问题" : "Continue solving this";
    inspectorJourneyList = document.createElement("div");
    inspectorJourneyList.dataset.mapInspectorJourneyList = "";
    inspectorJourney.append(journeyHeading, inspectorJourneyList);
    if (inspectorConnections) inspector.insertBefore(inspectorJourney, inspectorConnections);
    else inspector.appendChild(inspectorJourney);
  }

  var locations = hasDirectory ? entries.map(function (entry) {
    return {
      id: entry.id,
      element: entry,
      title: entry.dataset.locationTitle,
      category: entry.dataset.locationCategory,
      aliases: entry.dataset.locationAliases || "",
      keywords: entry.dataset.locationKeywords,
    };
  }) : [];

  var initialParams = new URLSearchParams(window.location.search);
  if (hasDirectory) {
    search.value = initialParams.get("q") || "";
    var initialCategory = initialParams.get("category");
    if (initialCategory && Array.from(category.options).some(function (option) { return option.value === initialCategory; })) {
      category.value = initialCategory;
    }
  }

  function updateQueryUrl() {
    if (!hasDirectory || !window.history || !window.history.replaceState) return;
    var query = window.RanchersMap.buildQueryString(search.value, category.value);
    if (selectedMarker) query += (query ? "&" : "?") + "location=" + encodeURIComponent(selectedMarker.dataset.markerId);
    window.history.replaceState(null, "", window.location.pathname + query + locationSafeHash(selectedMarker));
  }

  function locationSafeHash(marker) {
    if (marker) return "";
    var hashId = window.location.hash ? window.location.hash.slice(1) : "";
    return knownMarkerIds.includes(hashId) ? "" : window.location.hash;
  }

  function writeLocationUrl(marker, mode) {
    if (!window.history || !window.history[mode]) return;
    var params = new URLSearchParams(window.location.search);
    if (marker) params.set("location", marker.dataset.markerId);
    else params.delete("location");
    var query = params.toString();
    window.history[mode](null, "", window.location.pathname + (query ? "?" + query : "") + locationSafeHash(marker));
  }

  function openEntryGroup(entry) {
    var group = entry && entry.closest("[data-location-group]");
    if (group) group.open = true;
  }

  function focusBestMatch(matches, shouldScroll) {
    entries.forEach(function (entry) { entry.classList.remove("is-focused"); });
    if (!search.value.trim() || !matches.length) return;
    var best = window.RanchersMap.findBestLocation(locations, search.value, category.value);
    if (!best) return;
    openEntryGroup(best.element);
    best.element.classList.add("is-focused");
    if (shouldScroll) best.element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function render() {
    if (!hasDirectory) return;
    var searching = !!search.value.trim();
    var wasSearching = searchWasActive;
    if (searching && !wasSearching) {
      openGroupsBeforeSearch = locationGroups.filter(function (group) { return group.open; }).map(function (group) { return group.dataset.locationGroup; });
    }
    var matches = window.RanchersMap.filterLocations(locations, search.value, category.value);
    var visible = new Set(matches.map(function (item) { return item.element; }));
    entries.forEach(function (entry) { entry.hidden = !visible.has(entry); });
    var matchingGroupIds = [];
    locationGroups.forEach(function (group) {
      var hasVisibleEntry = Array.from(group.querySelectorAll("[data-location-entry]")).some(function (entry) { return !entry.hidden; });
      group.hidden = !hasVisibleEntry;
      if (hasVisibleEntry) matchingGroupIds.push(group.dataset.locationGroup);
    });
    if (searching || wasSearching) {
      var groupsToOpen = window.RanchersMapState
        ? window.RanchersMapState.groupsOpenAfterSearch(searching, matchingGroupIds, openGroupsBeforeSearch)
        : (searching ? matchingGroupIds : openGroupsBeforeSearch);
      locationGroups.forEach(function (group) { group.open = groupsToOpen.includes(group.dataset.locationGroup); });
    }
    searchWasActive = searching;
    if (count) count.textContent = isChinese ? matches.length + " 个地点" : (matches.length === 1 ? "1 location" : matches.length + " locations");
    if (empty) empty.hidden = matches.length !== 0;
    focusBestMatch(matches, false);
    return matches;
  }

  var viewState = window.RanchersMapViewer ? window.RanchersMapViewer.getView("overview") : { scale: 1, x: 0, y: 0 };

  function applyMapView() {
    if (!mapImage) return;
    var host = mapStage || mapImage;
    host.style.setProperty("--map-scale", viewState.scale);
    host.style.setProperty("--map-x", viewState.x + "%");
    host.style.setProperty("--map-y", viewState.y + "%");
    mapImage.style.setProperty("--map-scale", viewState.scale);
    mapImage.style.setProperty("--map-x", viewState.x + "%");
    mapImage.style.setProperty("--map-y", viewState.y + "%");
    if (mapStage) mapStage.classList.toggle("is-zoomed", viewState.scale > 1.05);
  }

  function setInspector(title, status, copy) {
    if (!inspector) return;
    inspector.querySelector("[data-map-inspector-title]").textContent = title;
    inspector.querySelector("[data-map-inspector-status]").textContent = status;
    inspector.querySelector("[data-map-inspector-copy]").textContent = copy;
    if (inspectorLink) inspectorLink.hidden = true;
    if (inspectorConnections) inspectorConnections.hidden = true;
    if (inspectorJourney) inspectorJourney.hidden = true;
  }

  function saveDiscovery() {
    try { localStorage.setItem(discoveryKey, JSON.stringify(discovered)); } catch (_) { /* Private mode still keeps the map usable. */ }
  }

  function updateProgress() {
    var found = knownMarkerIds.filter(function (id) { return discovered[id] === true; }).length;
    if (progressCount) progressCount.textContent = isChinese ? found + " / " + knownMarkerIds.length + " 个地点已发现" : found + " / " + knownMarkerIds.length + " places discovered";
    markers.forEach(function (marker) {
      marker.classList.toggle("is-discovered", discovered[marker.dataset.markerId] === true);
    });
    if (discoveryToggle) {
      var canToggle = !!selectedMarker;
      discoveryToggle.disabled = !canToggle;
      discoveryToggle.textContent = canToggle && discovered[selectedMarker.dataset.markerId] === true
        ? (isChinese ? "取消当前地点已发现" : "Mark selected as undiscovered")
        : (isChinese ? "将当前地点标为已发现" : "Mark selected as discovered");
      discoveryToggle.setAttribute("aria-pressed", canToggle && discovered[selectedMarker.dataset.markerId] === true ? "true" : "false");
    }
  }

  function markerStateData(marker) {
    return marker ? {
      id: marker.dataset.markerId,
      category: marker.dataset.markerCategory,
      evidenceLayer: marker.dataset.markerEvidenceLayer,
    } : null;
  }

  function markerForLocation(id) {
    return markers.find(function (marker) { return marker.dataset.markerId === id && marker.dataset.markerPrimary === "true"; })
      || markers.find(function (marker) { return marker.dataset.markerId === id; });
  }

  function clearSelectedMarker() {
    selectedMarker = null;
    if (mapInteractionState && window.RanchersMapState) {
      mapInteractionState = window.RanchersMapState.selectLocation(mapInteractionState, null);
    }
    markers.forEach(function (marker) { marker.classList.remove("active"); });
    updateProgress();
  }

  function markerRoute(marker) {
    return marker && marker.dataset.markerId ? (isChinese ? "/zh/map#" : "/map#") + marker.dataset.markerId : "";
  }

  function renderInspectorConnections(marker) {
    if (!inspectorConnections || !inspectorConnectionList) return;
    var route = markerRoute(marker);
    var matches = knowledgeEntities.filter(function (entity) {
      return entity.route !== route && (entity.relatedRoutes || []).some(function (link) {
        return (link.href || link) === route;
      });
    }).slice(0, 5);
    inspectorConnectionList.replaceChildren();
    if (!matches.length) {
      inspectorConnections.hidden = true;
      return;
    }
    matches.forEach(function (entity) {
      var link = document.createElement("a");
      link.className = "map-inspector-connection";
      link.href = entity.route;
      var type = document.createElement("span");
      type.textContent = entity.typeLabel || (isChinese ? "关联条目" : "Related entry");
      var label = document.createElement("strong");
      label.textContent = entity.label;
      link.append(type, label);
      inspectorConnectionList.appendChild(link);
    });
    inspectorConnections.hidden = false;
  }

  function renderInspectorJourney(marker) {
    if (!inspectorJourney || !inspectorJourneyList || !marker || !marker.dataset.markerId) return;
    var entity = knowledgeEntities.find(function (candidate) {
      return candidate.id === "location:" + marker.dataset.markerId;
    });
    var steps = entity && Array.isArray(entity.journey) ? entity.journey.slice(0, 5) : [];
    inspectorJourneyList.replaceChildren();
    if (!steps.length) {
      inspectorJourney.hidden = true;
      return;
    }
    steps.forEach(function (step, index) {
      var link = document.createElement("a");
      link.className = "map-inspector-journey-link";
      link.href = step.href;
      var number = document.createElement("span");
      number.className = "map-inspector-journey-number";
      number.textContent = String(index + 1);
      var copy = document.createElement("span");
      var label = document.createElement("strong");
      label.textContent = step.label;
      var reason = document.createElement("small");
      reason.textContent = step.reason;
      copy.append(label, reason);
      link.append(number, copy);
      inspectorJourneyList.appendChild(link);
    });
    inspectorJourney.hidden = false;
  }

  function markerHasRelation(marker, type) {
    if (type === "service") return marker.dataset.markerCategory === "services";
    var route = markerRoute(marker);
    return knowledgeEntities.some(function (entity) {
      return entity.type === type && (entity.relatedRoutes || []).some(function (link) { return (link.href || link) === route; });
    });
  }

  fetch(isChinese ? "/zh/knowledge-index.json" : "/knowledge-index.json", { credentials: "same-origin" })
    .then(function (response) { if (!response.ok) throw new Error("knowledge index " + response.status); return response.json(); })
    .then(function (payload) {
      knowledgeEntities = Array.isArray(payload.entities) ? payload.entities : [];
      renderMarkerLayers();
      if (selectedMarker) {
        renderInspectorConnections(selectedMarker);
        renderInspectorJourney(selectedMarker);
      }
    })
    .catch(function () {
      knowledgeEntities = [];
      relationFilter = "all";
      relationFilterButtons.forEach(function (button) {
        var isAll = button.dataset.mapRelationFilter === "all";
        button.disabled = !isAll;
        if (!isAll) button.title = isChinese ? "关联索引加载失败；基础地图仍可使用" : "Related-answer index unavailable; the base map still works";
      });
      renderMarkerLayers();
    });

  function selectMarker(marker, historyMode) {
    selectedMarker = marker;
    if (mapInteractionState && window.RanchersMapState) {
      mapInteractionState = window.RanchersMapState.selectLocation(mapInteractionState, markerStateData(marker));
    }
    markers.forEach(function (item) { item.classList.toggle("active", item === marker); });
    updateProgress();
    if (historyMode !== false) writeLocationUrl(marker, historyMode || "pushState");
    if (!inspector) return;
    var pointLabel = marker.dataset.markerPointLabel || "";
    inspector.querySelector("[data-map-inspector-title]").textContent = marker.dataset.markerTitle + (pointLabel ? " · " + pointLabel : "");
    var confidence = marker.dataset.markerConfidence || (isChinese ? "大致区域" : "Approximate");
    var exact = marker.dataset.markerPrecision === "exact";
    inspector.querySelector("[data-map-inspector-status]").textContent = isChinese
      ? (exact ? "位置可信度：" + confidence + "，锚点来自当前版本原生 POI" : "位置可信度：" + confidence + "，标记为估算区域，并非已验证坐标")
      : (exact ? "Location confidence: " + confidence + " — anchored to the current-build native POI" : "Location confidence: " + confidence + " — pin is an estimate, not a verified coordinate");
    inspector.querySelector("[data-map-inspector-copy]").textContent = marker.dataset.markerCopy;
    renderInspectorConnections(marker);
    renderInspectorJourney(marker);
    if (inspectorLink && marker.dataset.markerTarget) {
      var target = marker.dataset.markerTarget;
      var localTargetExists = target.charAt(0) !== "#" || !!document.querySelector(target);
      inspectorLink.hidden = !localTargetExists;
      if (localTargetExists) {
        inspectorLink.setAttribute("href", target);
        inspectorLink.textContent = isChinese ? "查看 " + marker.dataset.markerTitle + " 条目" : "View " + marker.dataset.markerTitle + " in the directory";
      }
    }
  }

  markers.forEach(function (marker) {
    marker.addEventListener("click", function (event) {
      event.stopPropagation();
      selectMarker(marker);
    });
  });

  var markerCategories = ["shopping", "services", "transport", "landmarks"];
  var activeCategoryLayers = markerCategories.slice();
  var activeEvidenceFilter = "supported";

  function layerCountCopy(visible, total) {
    return isChinese ? "显示 " + visible + " / " + total : visible + " / " + total + " visible";
  }

  function renderMarkerLayers() {
    if (markerLayer) markerLayer.hidden = activeCategoryLayers.length === 0;
    layerToggleButtons.forEach(function (button) {
      var active = activeCategoryLayers.includes(button.dataset.mapLayerToggle);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    layerActionButtons.forEach(function (button) {
      var action = button.dataset.mapLayerAction;
      var active = action === "all" ? activeCategoryLayers.length === markerCategories.length : activeCategoryLayers.length === 0;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    evidenceFilterButtons.forEach(function (button) {
      var active = button.dataset.mapEvidenceFilter === activeEvidenceFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    relationFilterButtons.forEach(function (button) {
      var active = button.dataset.mapRelationFilter === relationFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    markers.forEach(function (marker) {
      var categoryHidden = !activeCategoryLayers.includes(marker.dataset.markerCategory);
      var evidenceHidden = activeEvidenceFilter !== "all" && marker.dataset.markerEvidenceLayer !== activeEvidenceFilter;
      var relationDimmed = relationFilter !== "all" && !markerHasRelation(marker, relationFilter);
      marker.hidden = categoryHidden || evidenceHidden;
      marker.classList.toggle("is-relation-match", relationFilter !== "all" && !relationDimmed);
      marker.classList.toggle("is-relation-dimmed", relationDimmed);
    });
    markerCategories.forEach(function (markerCategory) {
      var output = document.querySelector('[data-map-layer-count="' + markerCategory + '"]');
      if (!output) return;
      var categoryMarkers = markers.filter(function (marker) { return marker.dataset.markerCategory === markerCategory; });
      var visible = categoryMarkers.filter(function (marker) { return !marker.hidden; }).length;
      output.textContent = layerCountCopy(visible, categoryMarkers.length);
    });
    if (layerSummary) {
      var visibleCount = markers.filter(function (marker) { return !marker.hidden; }).length;
      layerSummary.textContent = isChinese ? "显示 " + visibleCount + " 个" : visibleCount + " visible";
    }
  }

  function applyMarkerFilter(filter) {
    var hadSelection = !!selectedMarker;
    if (mapInteractionState && window.RanchersMapState) {
      mapInteractionState = filter === "all" || filter === "none"
        ? window.RanchersMapState.setAllLayers(mapInteractionState, filter === "all", markerStateData(selectedMarker))
        : window.RanchersMapState.toggleLayer(mapInteractionState, filter, markerStateData(selectedMarker));
      activeCategoryLayers = mapInteractionState.layers.slice();
      if (hadSelection && !mapInteractionState.selectedLocationId) {
        clearSelectedMarker();
        writeLocationUrl(null, "replaceState");
        setInspector(isChinese ? "未选择地点" : "No location selected", isChinese ? "筛选已更新" : "Filters updated", isChinese ? "先前地点已被当前筛选隐藏，请选择一个可见标记。" : "The previous location is hidden by the current filters. Select a visible marker to continue.");
      }
    } else if (filter === "all") {
      activeCategoryLayers = markerCategories.slice();
    } else if (filter === "none") {
      activeCategoryLayers = [];
    } else {
      activeCategoryLayers = activeCategoryLayers.includes(filter)
        ? activeCategoryLayers.filter(function (item) { return item !== filter; })
        : activeCategoryLayers.concat(filter);
    }
    renderMarkerLayers();
  }

  function applyEvidenceFilter(filter) {
    var hadSelection = !!selectedMarker;
    activeEvidenceFilter = filter;
    if (mapInteractionState && window.RanchersMapState) {
      mapInteractionState = window.RanchersMapState.setEvidence(mapInteractionState, filter, markerStateData(selectedMarker));
      if (hadSelection && !mapInteractionState.selectedLocationId) {
        clearSelectedMarker();
        writeLocationUrl(null, "replaceState");
        setInspector(isChinese ? "未选择地点" : "No location selected", isChinese ? "筛选已更新" : "Filters updated", isChinese ? "先前地点已被当前筛选隐藏，请选择一个可见标记。" : "The previous location is hidden by the current filters. Select a visible marker to continue.");
      }
    }
    renderMarkerLayers();
  }

  markerFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyMarkerFilter(button.dataset.mapPinFilter);
    });
  });
  evidenceFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyEvidenceFilter(button.dataset.mapEvidenceFilter);
    });
  });
  relationFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      relationFilter = button.dataset.mapRelationFilter;
      if (mapInteractionState && window.RanchersMapState) mapInteractionState = window.RanchersMapState.setRelation(mapInteractionState, relationFilter);
      renderMarkerLayers();
    });
  });
  applyMarkerFilter("all");
  updateProgress();

  if (discoveryToggle) {
    discoveryToggle.addEventListener("click", function () {
      if (!selectedMarker) return;
      var id = selectedMarker.dataset.markerId;
      discovered[id] = discovered[id] !== true;
      saveDiscovery();
      updateProgress();
    });
  }
  if (progressReset) {
    progressReset.addEventListener("click", function () {
      if (!Object.keys(discovered).length) return;
      if (!window.confirm(isChinese ? "清除本地地图探索进度？" : "Clear your local map discovery progress?")) return;
      discovered = {};
      saveDiscovery();
      updateProgress();
    });
  }

  function selectRegion(name, title, status, copy, showMarker) {
    clearSelectedMarker();
    writeLocationUrl(null, "replaceState");
    if (mapInteractionState && window.RanchersMapState) mapInteractionState = window.RanchersMapState.selectRegion(mapInteractionState, name);
    viewState = window.RanchersMapViewer ? window.RanchersMapViewer.getView(name) : { scale: 1, x: 0, y: 0 };
    regionButtons.forEach(function (button) {
      button.classList.toggle("active", button.dataset.mapRegion === name);
      button.setAttribute("aria-pressed", button.dataset.mapRegion === name ? "true" : "false");
    });
    applyMapView();
    setInspector(title, status, copy);
  }

  if (hasDirectory) {
    search.addEventListener("input", function () {
      var currentQuery = new URLSearchParams(window.location.search).get("q") || "";
      var shouldCreateBoundary = window.RanchersMapState
        ? window.RanchersMapState.searchNeedsHistoryBoundary(selectedMarker && selectedMarker.dataset.markerId, currentQuery, search.value)
        : !!selectedMarker && currentQuery.trim().toLowerCase() !== search.value.trim().toLowerCase();
      if (shouldCreateBoundary) {
        clearSelectedMarker();
        writeLocationUrl(null, "pushState");
      }
      render();
      updateQueryUrl();
    });
    search.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      var matches = render();
      var best = window.RanchersMap.findBestLocation(locations, search.value, category.value);
      if (!best) return;
      var marker = markerForLocation(best.id);
      if (marker) {
        focusMarkerOnMap(marker, true);
      } else {
        clearSelectedMarker();
        writeLocationUrl(null, "replaceState");
        openEntryGroup(best.element);
        best.element.classList.add("is-focused");
        best.element.scrollIntoView({ behavior: "smooth", block: "center" });
        setInspector(best.title, isChinese ? "暂无验证坐标" : "No verified coordinate", isChinese ? "此地点保留在目录中，但目前没有可可靠显示的地图标记。" : "This place remains in the directory, but it does not have a reliable map marker yet.");
      }
    });
    category.addEventListener("change", function () {
      var keepsSelection = window.RanchersMapState
        ? window.RanchersMapState.directoryFilterKeepsSelection(markerStateData(selectedMarker), category.value)
        : !selectedMarker || category.value === "all" || selectedMarker.dataset.markerCategory === category.value;
      if (!keepsSelection) {
        clearSelectedMarker();
        writeLocationUrl(null, "replaceState");
        setInspector(isChinese ? "未选择地点" : "No location selected", isChinese ? "分类已更新" : "Category updated", isChinese ? "先前地点已被当前目录分类隐藏，请选择一个可见地点。" : "The previous location is hidden by the current directory category. Select a visible place to continue.");
      }
      render();
      updateQueryUrl();
    });
  }

  regionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectRegion(button.dataset.mapRegion, button.dataset.mapTitle, button.dataset.mapStatus, button.dataset.mapCopy);
    });
  });

  locationButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectRegion(button.dataset.mapRegion, button.dataset.mapTitle, button.dataset.mapStatus, button.dataset.mapCopy, true);
      if (mapStage) mapStage.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  var pinFlashTimer = null;

  function focusMarkerOnMap(marker, pushHistory) {
    if (!marker || !window.RanchersMapViewer) return;
    var mx = parseFloat(marker.style.getPropertyValue("--mx"));
    var my = parseFloat(marker.style.getPropertyValue("--my"));
    if (mapInteractionState && window.RanchersMapState) {
      mapInteractionState = window.RanchersMapState.focusLocation(mapInteractionState, markerStateData(marker));
      activeCategoryLayers = mapInteractionState.layers.slice();
      activeEvidenceFilter = mapInteractionState.evidence;
      relationFilter = mapInteractionState.relation;
    } else {
      if (!activeCategoryLayers.includes(marker.dataset.markerCategory)) activeCategoryLayers.push(marker.dataset.markerCategory);
      activeEvidenceFilter = marker.dataset.markerEvidenceLayer;
      relationFilter = "all";
    }
    renderMarkerLayers();
    viewState = window.RanchersMapViewer.focus(mx, my, 2.6);
    applyMapView();
    selectMarker(marker, pushHistory ? "pushState" : false);
    marker.classList.add("pin-flash");
    if (pinFlashTimer) clearTimeout(pinFlashTimer);
    pinFlashTimer = setTimeout(function () { marker.classList.remove("pin-flash"); }, 2000);
    if (mapStage) mapStage.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  markerFocusButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var title = button.dataset.markerFocus;
      var candidates = markers.filter(function (item) { return item.dataset.markerTitle === title; });
      var marker = candidates.find(function (item) { return item.dataset.markerPrimary === "true"; }) || candidates[0];
      focusMarkerOnMap(marker, true);
    });
  });

  /* Recognition-photo lightbox: pure front-end, no external library */
  var atlasPhotos = Array.from(document.querySelectorAll("[data-atlas-photo]"));
  if (atlasPhotos.length) {
    var lightboxOpener = null;
    var lightbox = document.createElement("div");
    lightbox.className = "atlas-lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", isChinese ? "放大的识别照片" : "Enlarged recognition photo");
    var lightboxImg = document.createElement("img");
    var lightboxClose = document.createElement("button");
    lightboxClose.type = "button";
    lightboxClose.className = "atlas-lightbox-close";
    lightboxClose.setAttribute("aria-label", isChinese ? "关闭大图" : "Close enlarged photo");
    lightboxClose.textContent = "×";
    lightbox.appendChild(lightboxImg);
    lightbox.appendChild(lightboxClose);
    document.body.appendChild(lightbox);

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.body.classList.remove("has-modal-open");
      if (lightboxOpener) lightboxOpener.focus();
      lightboxOpener = null;
    }
    function openLightbox(photo) {
      lightboxOpener = photo;
      lightboxImg.src = photo.currentSrc || photo.src;
      lightboxImg.alt = photo.alt || "";
      lightbox.classList.add("is-open");
      document.body.classList.add("has-modal-open");
      lightboxClose.focus();
    }
    atlasPhotos.forEach(function (photo) {
      photo.tabIndex = 0;
      photo.setAttribute("role", "button");
      photo.setAttribute("aria-label", (photo.alt || (isChinese ? "识别图片" : "Recognition photo")) + (isChinese ? "，按回车放大" : ", press Enter to enlarge"));
      photo.addEventListener("click", function () { openLightbox(photo); });
      photo.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openLightbox(photo);
      });
    });
    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
      if (event.key === "Tab" && lightbox.classList.contains("is-open")) {
        event.preventDefault();
        lightboxClose.focus();
      }
    });
    var swipeStartY = null;
    lightbox.addEventListener("touchstart", function (event) {
      swipeStartY = event.touches.length === 1 ? event.touches[0].clientY : null;
    }, { passive: true });
    lightbox.addEventListener("touchend", function (event) {
      if (swipeStartY === null) return;
      var deltaY = event.changedTouches[0].clientY - swipeStartY;
      swipeStartY = null;
      if (deltaY > 70) closeLightbox();
    }, { passive: true });
  }

  zoomButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var action = button.dataset.mapZoom;
      if (action === "reset") {
        var overview = regionButtons.filter(function (item) { return item.dataset.mapRegion === "overview"; })[0];
        selectRegion("overview", overview.dataset.mapTitle, overview.dataset.mapStatus, overview.dataset.mapCopy);
        return;
      }
      var delta = action === "in" ? 0.25 : -0.25;
      viewState.scale = window.RanchersMapViewer ? window.RanchersMapViewer.clampZoom(viewState.scale + delta) : Math.max(1, Math.min(3, viewState.scale + delta));
      applyMapView();
    });
  });

  panButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (!window.RanchersMapViewer) return;
      viewState = window.RanchersMapViewer.pan(viewState, button.dataset.mapPan);
      applyMapView();
    });
  });

  if (mapStage) {
    mapStage.addEventListener("keydown", function (event) {
      var directions = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      if (directions[event.key] && window.RanchersMapViewer) {
        event.preventDefault();
        viewState = window.RanchersMapViewer.pan(viewState, directions[event.key]);
        applyMapView();
      }
      if ((event.key === "+" || event.key === "=") && window.RanchersMapViewer) {
        event.preventDefault();
        viewState.scale = window.RanchersMapViewer.clampZoom(viewState.scale + 0.25);
        applyMapView();
      }
      if (event.key === "-" && window.RanchersMapViewer) {
        event.preventDefault();
        viewState.scale = window.RanchersMapViewer.clampZoom(viewState.scale - 0.25);
        applyMapView();
      }
    });
  }

  function clearPin() {
    if (activePin && activePin.element && pinLayer && activePin.element.parentNode === pinLayer) {
      pinLayer.removeChild(activePin.element);
    }
    activePin = null;
  }

  function setPlacing(next) {
    placing = next;
    if (addToggle) {
      addToggle.setAttribute("aria-pressed", next ? "true" : "false");
      addToggle.classList.toggle("active", next);
    }
    if (mapStage) mapStage.classList.toggle("is-placing", next);
    if (!next) {
      if (pinForm) pinForm.hidden = true;
      clearPin();
    }
  }

  function updatePinCoords(x, y) {
    if (pinCoords) pinCoords.textContent = (isChinese ? "地图位置：" : "Map position: ") + x + "%, " + y + "%";
  }

  function placePin(sx, sy) {
    if (!window.RanchersMapViewer || !pinLayer) return;
    var point = window.RanchersMapViewer.stageToImage({ sx: sx, sy: sy }, viewState);
    if (point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) return;
    var pin = document.createElement("button");
    pin.type = "button";
    pin.className = "map-pin";
    pin.setAttribute("aria-label", isChinese ? "待提交的位置标记，可拖动调整" : "Submitted location pin, drag to adjust");
    pin.style.left = point.x + "%";
    pin.style.top = point.y + "%";
    pinLayer.appendChild(pin);
    makeDraggable(pin);
    activePin = { x: point.x, y: point.y, element: pin };
    if (pinForm) {
      pinForm.hidden = false;
      updatePinCoords(point.x, point.y);
      if (pinName) pinName.focus();
    }
  }

  function makeDraggable(pin) {
    var dragging = false;
    pin.addEventListener("pointerdown", function (event) {
      dragging = true;
      if (pin.setPointerCapture) pin.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    pin.addEventListener("pointermove", function (event) {
      if (!dragging || !mapStage || !window.RanchersMapViewer) return;
      var rect = mapStage.getBoundingClientRect();
      var point = window.RanchersMapViewer.stageToImage({
        sx: (event.clientX - rect.left) / rect.width,
        sy: (event.clientY - rect.top) / rect.height
      }, viewState);
      if (point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100) return;
      pin.style.left = point.x + "%";
      pin.style.top = point.y + "%";
      if (activePin) { activePin.x = point.x; activePin.y = point.y; }
      updatePinCoords(point.x, point.y);
    });
    pin.addEventListener("pointerup", function () { dragging = false; });
  }

  if (addToggle) {
    addToggle.addEventListener("click", function () { setPlacing(!placing); });
  }

  if (pinClose) {
    pinClose.addEventListener("click", function () { setPlacing(false); });
  }

  function mapFocusableElements() {
    if (!mapPanel) return [];
    return Array.from(mapPanel.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1'])")).filter(function (element) {
      return !element.hidden && element.offsetParent !== null;
    });
  }

  function setMapExpanded(next) {
    mapExpanded = !!next;
    if (mapPanel) mapPanel.classList.toggle("is-map-fullscreen", mapExpanded);
    document.body.classList.toggle("has-map-fullscreen", mapExpanded);
    if (mapExpand) {
      mapExpand.setAttribute("aria-expanded", mapExpanded ? "true" : "false");
      mapExpand.hidden = mapExpanded;
    }
    if (mapFullscreenClose) mapFullscreenClose.hidden = !mapExpanded;
    if (mapExpanded) {
      mapPanel.scrollTop = 0;
      mapPanel.setAttribute("role", "dialog");
      mapPanel.setAttribute("aria-modal", "true");
      mapPanel.setAttribute("aria-label", isChinese ? "全屏 Sunvale 地图" : "Expanded Sunvale map");
      if (mapFullscreenClose) mapFullscreenClose.focus();
    } else if (mapExpand) {
      mapPanel.removeAttribute("role");
      mapPanel.removeAttribute("aria-modal");
      mapPanel.removeAttribute("aria-label");
      mapExpand.focus();
    }
  }

  if (mapExpand) mapExpand.addEventListener("click", function () { setMapExpanded(true); });
  if (mapFullscreenClose) mapFullscreenClose.addEventListener("click", function () { setMapExpanded(false); });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && mapExpanded) setMapExpanded(false);
    if (event.key === "Tab" && mapExpanded) {
      var focusable = mapFocusableElements();
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (!mapPanel.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  var pointers = new Map();
  var dragStart = null;
  var dragMoved = false;
  var pinchStart = null;

  function stagePointFromClient(clientX, clientY) {
    var rect = mapStage.getBoundingClientRect();
    return { sx: (clientX - rect.left) / rect.width, sy: (clientY - rect.top) / rect.height };
  }

  function isMapControl(target) {
    return !!target.closest("[data-map-region], [data-map-pan], [data-map-zoom], [data-location-map], [data-map-pin-filter], [data-map-evidence-filter], [data-map-relation-filter], [data-map-discovery-toggle], [data-map-progress-reset], .map-pin, .map-marker");
  }

  if (mapStage) {
    mapStage.addEventListener("dragstart", function (event) { event.preventDefault(); });
    mapStage.addEventListener("wheel", function (event) {
      event.preventDefault();
      if (!window.RanchersMapViewer) return;
      var factor = Math.exp(-event.deltaY * 0.0015);
      var anchor = stagePointFromClient(event.clientX, event.clientY);
      viewState = window.RanchersMapViewer.zoomAt(viewState, factor, anchor);
      applyMapView();
    }, { passive: false });

    mapStage.addEventListener("pointerdown", function (event) {
      if (isMapControl(event.target)) return;
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches && !mapExpanded) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        dragStart = { x: event.clientX, y: event.clientY, view: { scale: viewState.scale, x: viewState.x, y: viewState.y } };
        dragMoved = false;
      } else if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinchStart = { dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)), view: { scale: viewState.scale, x: viewState.x, y: viewState.y }, cx: (pts[0].x + pts[1].x) / 2, cy: (pts[0].y + pts[1].y) / 2 };
      }
      if (mapStage.setPointerCapture) mapStage.setPointerCapture(event.pointerId);
    });

    mapStage.addEventListener("pointermove", function (event) {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (!window.RanchersMapViewer) return;
      if (pointers.size === 2 && pinchStart) {
        var pts = Array.from(pointers.values());
        var dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
        var anchor = stagePointFromClient(pinchStart.cx, pinchStart.cy);
        viewState = window.RanchersMapViewer.zoomAt(pinchStart.view, dist / pinchStart.dist, anchor);
        applyMapView();
        return;
      }
      if (pointers.size === 1 && dragStart) {
        var rect = mapStage.getBoundingClientRect();
        var dx = (event.clientX - dragStart.x) / rect.width;
        var dy = (event.clientY - dragStart.y) / rect.height;
        if (Math.hypot(dx, dy) > 0.02) {
          dragMoved = true;
          if (mapStage) mapStage.classList.add("is-panning");
        }
        viewState = window.RanchersMapViewer.panBy(dragStart.view, dx, dy);
        applyMapView();
      }
    });

    function endPointer(event) {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (pointers.size === 0 && dragStart) {
        if (mapStage) mapStage.classList.remove("is-panning");
        if (placing && !dragMoved) {
          var rect = mapStage.getBoundingClientRect();
          placePin((dragStart.x - rect.left) / rect.width, (dragStart.y - rect.top) / rect.height);
        }
        dragStart = null;
      }
    }
    mapStage.addEventListener("pointerup", endPointer);
    mapStage.addEventListener("pointercancel", endPointer);
  }

  if (pinForm) {
    pinForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!pinForm.reportValidity() || !activePin) return;
      var name = pinName ? pinName.value.trim() : "";
      var category = pinCategory ? pinCategory.value : "";
      var notes = pinNotes ? pinNotes.value.trim() : "";
      var body = (isChinese ? [
        "地点：" + name,
        "分类：" + (category || "未选择"),
        "地图位置：" + activePin.x + "%, " + activePin.y + "%（当前玩家地图）",
        "版本：0.8.10.842",
        notes ? "备注：" + notes : "",
        "",
        "请尽量附上当前版本的地图面板或店面截图。"
      ] : [
        "Location: " + name,
        "Category: " + (category || "Unspecified"),
        "Map position: " + activePin.x + "%, " + activePin.y + "% (current player map)",
        "Build: 0.8.10.842",
        notes ? "Notes: " + notes : "",
        "",
        "Attach a current-build screenshot of the map panel or storefront if possible."
      ]).filter(Boolean).join("\n");
      var subject = (isChinese ? "地图地点：" : "Map location: ") + name;
      window.location.href = "mailto:contribute@theranchersguide.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      pinForm.hidden = true;
      if (pinName) pinName.value = "";
      if (pinCategory) pinCategory.value = "";
      if (pinNotes) pinNotes.value = "";
      setPlacing(false);
    });
  }

  applyMapView();
  if (hasDirectory) {
    var initialMatches = render();
    if (search.value.trim()) setTimeout(function () { focusBestMatch(initialMatches, true); }, 0);
  }

  function restoreLocationFromUrl() {
    var params = new URLSearchParams(window.location.search);
    if (hasDirectory) {
      search.value = params.get("q") || "";
      var restoredCategory = params.get("category") || "all";
      if (!Array.from(category.options).some(function (option) { return option.value === restoredCategory; })) restoredCategory = "all";
      category.value = restoredCategory;
      render();
    }
    var queryId = params.get("location") || "";
    var hashId = window.location.hash ? window.location.hash.slice(1) : "";
    var requestedId = window.RanchersMapState
      ? window.RanchersMapState.resolveLocationId(queryId, hashId, knownMarkerIds)
      : (knownMarkerIds.includes(queryId) ? queryId : (knownMarkerIds.includes(hashId) ? hashId : null));
    var nextHash = queryId && knownMarkerIds.includes(queryId) && knownMarkerIds.includes(hashId) ? "" : window.location.hash;
    if (queryId && !knownMarkerIds.includes(queryId)) params.delete("location");
    if (params.toString() !== new URLSearchParams(window.location.search).toString() || nextHash !== window.location.hash) {
      var normalized = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (normalized ? "?" + normalized : "") + nextHash);
    }
    if (!requestedId) {
      clearSelectedMarker();
      return;
    }
    var marker = markerForLocation(requestedId);
    if (marker) {
      focusMarkerOnMap(marker, false);
      return;
    }
    clearSelectedMarker();
  }

  restoreLocationFromUrl();
  window.addEventListener("popstate", restoreLocationFromUrl);
})();
