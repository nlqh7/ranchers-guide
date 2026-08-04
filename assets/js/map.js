(function () {
  "use strict";

  var search = document.querySelector("[data-location-search]");
  var category = document.querySelector("[data-location-category]");
  var entries = Array.from(document.querySelectorAll("[data-location-entry]"));
  var count = document.querySelector("[data-location-count]");
  var empty = document.querySelector("[data-location-empty]");
  var mapStage = document.querySelector("[data-map-stage]");
  var mapImage = document.querySelector("[data-map-image]");
  var inspector = document.querySelector("[data-map-inspector]");
  var regionButtons = Array.from(document.querySelectorAll("[data-map-region]:not([data-location-map])"));
  var locationButtons = Array.from(document.querySelectorAll("[data-location-map]"));
  var zoomButtons = Array.from(document.querySelectorAll("[data-map-zoom]"));
  var panButtons = Array.from(document.querySelectorAll("[data-map-pan]"));
  var focusMarker = document.querySelector("[data-map-focus-marker]");
  var focusLabel = document.querySelector("[data-map-focus-label]");
  if (!search || !category || !entries.length || !window.RanchersMap) return;

  var locations = entries.map(function (entry) {
    return {
      element: entry,
      title: entry.dataset.locationTitle,
      category: entry.dataset.locationCategory,
      keywords: entry.dataset.locationKeywords,
    };
  });

  function render() {
    var matches = window.RanchersMap.filterLocations(locations, search.value, category.value);
    var visible = new Set(matches.map(function (item) { return item.element; }));
    entries.forEach(function (entry) { entry.hidden = !visible.has(entry); });
    count.textContent = matches.length === 1 ? "1 location" : matches.length + " locations";
    empty.hidden = matches.length !== 0;
  }

  var viewState = window.RanchersMapViewer ? window.RanchersMapViewer.getView("overview") : { scale: 1, x: 0, y: 0 };

  function applyMapView() {
    if (!mapImage) return;
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
  }

  function selectRegion(name, title, status, copy, showMarker) {
    viewState = window.RanchersMapViewer ? window.RanchersMapViewer.getView(name) : { scale: 1, x: 0, y: 0 };
    regionButtons.forEach(function (button) {
      button.classList.toggle("active", button.dataset.mapRegion === name);
      button.setAttribute("aria-pressed", button.dataset.mapRegion === name ? "true" : "false");
    });
    applyMapView();
    setInspector(title, status, copy);
    if (focusMarker) focusMarker.hidden = !showMarker;
    if (focusLabel && showMarker) focusLabel.textContent = title;
  }

  search.addEventListener("input", render);
  category.addEventListener("change", render);

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

  zoomButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var action = button.dataset.mapZoom;
      if (action === "reset") {
        selectRegion("overview", "Full Sunvale overview", "Current player capture", "West is the rural ranch district; east is the dense city grid. Bridges across the central waterway connect the two halves.");
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

  applyMapView();
  render();
})();
