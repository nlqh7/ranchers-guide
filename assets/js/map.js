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
  var markerFocusButtons = Array.from(document.querySelectorAll("[data-marker-focus]"));
  var zoomButtons = Array.from(document.querySelectorAll("[data-map-zoom]"));
  var panButtons = Array.from(document.querySelectorAll("[data-map-pan]"));
  var focusMarker = document.querySelector("[data-map-focus-marker]");
  var focusLabel = document.querySelector("[data-map-focus-label]");
  var addToggle = document.querySelector("[data-map-add-toggle]");
  var markerLayer = document.querySelector("[data-map-marker-layer]");
  var markers = markerLayer ? Array.from(markerLayer.querySelectorAll("[data-marker-category]")) : [];
  var markerFilterButtons = Array.from(document.querySelectorAll("[data-map-pin-filter]"));
  var inspectorLink = inspector ? inspector.querySelector("[data-map-inspector-link]") : null;
  var pinLayer = document.querySelector("[data-map-pin-layer]");
  var pinForm = document.querySelector("[data-map-pin-form]");
  var pinName = document.querySelector("[data-map-pin-name]");
  var pinCategory = document.querySelector("[data-map-pin-category]");
  var pinNotes = document.querySelector("[data-map-pin-notes]");
  var pinCoords = document.querySelector("[data-map-pin-coords]");
  var pinClose = document.querySelector("[data-map-pin-close]");
  var isChinese = document.documentElement.lang.toLowerCase() === "zh-cn";
  var hasDirectory = !!(search && category && entries.length && window.RanchersMap);
  var activePin = null;
  var placing = false;
  if (!mapStage || !mapImage || !window.RanchersMapViewer) return;

  var locations = hasDirectory ? entries.map(function (entry) {
    return {
      element: entry,
      title: entry.dataset.locationTitle,
      category: entry.dataset.locationCategory,
      keywords: entry.dataset.locationKeywords,
    };
  }) : [];

  function render() {
    if (!hasDirectory) return;
    var matches = window.RanchersMap.filterLocations(locations, search.value, category.value);
    var visible = new Set(matches.map(function (item) { return item.element; }));
    entries.forEach(function (entry) { entry.hidden = !visible.has(entry); });
    if (count) count.textContent = isChinese ? matches.length + " 个地点" : (matches.length === 1 ? "1 location" : matches.length + " locations");
    if (empty) empty.hidden = matches.length !== 0;
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
  }

  function selectMarker(marker) {
    markers.forEach(function (item) { item.classList.toggle("active", item === marker); });
    if (!inspector) return;
    inspector.querySelector("[data-map-inspector-title]").textContent = marker.dataset.markerTitle;
    var confidence = marker.dataset.markerConfidence || (isChinese ? "大致区域" : "Approximate");
    inspector.querySelector("[data-map-inspector-status]").textContent = isChinese
      ? "位置可信度：" + confidence + "，标记为估算区域，并非已验证坐标"
      : "Location confidence: " + confidence + " — pin is an estimate, not a verified coordinate";
    inspector.querySelector("[data-map-inspector-copy]").textContent = marker.dataset.markerCopy;
    if (inspectorLink && marker.dataset.markerTarget) {
      inspectorLink.hidden = false;
      var target = marker.dataset.markerTarget;
      if (target.charAt(0) === "#" && !document.querySelector(target)) target = "/map" + target;
      inspectorLink.setAttribute("href", target);
      inspectorLink.textContent = isChinese ? "查看 " + marker.dataset.markerTitle + " 条目" : "View " + marker.dataset.markerTitle + " in the directory";
    }
  }

  markers.forEach(function (marker) {
    marker.addEventListener("click", function (event) {
      event.stopPropagation();
      selectMarker(marker);
    });
  });

  function applyMarkerFilter(filter) {
    if (markerLayer) markerLayer.hidden = filter === "none";
    markerFilterButtons.forEach(function (button) {
      var active = button.dataset.mapPinFilter === filter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    markers.forEach(function (marker) {
      marker.hidden = filter === "none" || (filter !== "all" && marker.dataset.markerCategory !== filter);
      if (marker.hidden) marker.classList.remove("active");
    });
  }

  markerFilterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      applyMarkerFilter(button.dataset.mapPinFilter);
    });
  });
  applyMarkerFilter("none");

  function selectRegion(name, title, status, copy, showMarker) {
    viewState = window.RanchersMapViewer ? window.RanchersMapViewer.getView(name) : { scale: 1, x: 0, y: 0 };
    regionButtons.forEach(function (button) {
      button.classList.toggle("active", button.dataset.mapRegion === name);
      button.setAttribute("aria-pressed", button.dataset.mapRegion === name ? "true" : "false");
    });
    applyMapView();
    setInspector(title, status, copy);
  }

  if (hasDirectory) {
    search.addEventListener("input", render);
    category.addEventListener("change", render);
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

  markerFocusButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (!window.RanchersMapViewer) return;
      var title = button.dataset.markerFocus;
      var marker = markers.filter(function (item) { return item.dataset.markerTitle === title; })[0];
      if (!marker) return;
      var mx = parseFloat(marker.style.getPropertyValue("--mx"));
      var my = parseFloat(marker.style.getPropertyValue("--my"));
      applyMarkerFilter(marker.dataset.markerCategory);
      viewState = window.RanchersMapViewer.focus(mx, my, 2.6);
      applyMapView();
      selectMarker(marker);
      marker.classList.add("pin-flash");
      if (pinFlashTimer) clearTimeout(pinFlashTimer);
      pinFlashTimer = setTimeout(function () { marker.classList.remove("pin-flash"); }, 2000);
      if (mapStage) mapStage.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  /* Recognition-photo lightbox: pure front-end, no external library */
  var atlasPhotos = Array.from(document.querySelectorAll("[data-atlas-photo]"));
  if (atlasPhotos.length) {
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
      document.body.style.overflow = "";
    }
    function openLightbox(photo) {
      lightboxImg.src = photo.currentSrc || photo.src;
      lightboxImg.alt = photo.alt || "";
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
      lightboxClose.focus();
    }
    atlasPhotos.forEach(function (photo) {
      photo.addEventListener("click", function () { openLightbox(photo); });
    });
    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && lightbox.classList.contains("is-open")) closeLightbox();
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

  var pointers = new Map();
  var dragStart = null;
  var dragMoved = false;
  var pinchStart = null;

  function stagePointFromClient(clientX, clientY) {
    var rect = mapStage.getBoundingClientRect();
    return { sx: (clientX - rect.left) / rect.width, sy: (clientY - rect.top) / rect.height };
  }

  function isMapControl(target) {
    return !!target.closest("[data-map-region], [data-map-pan], [data-map-zoom], [data-location-map], [data-map-pin-filter], .map-pin, .map-marker");
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
        "版本：0.8.10.455",
        notes ? "备注：" + notes : "",
        "",
        "请尽量附上当前版本的地图面板或店面截图。"
      ] : [
        "Location: " + name,
        "Category: " + (category || "Unspecified"),
        "Map position: " + activePin.x + "%, " + activePin.y + "% (current player map)",
        "Build: 0.8.10.455",
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
  if (hasDirectory) render();
})();
