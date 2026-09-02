const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

for (const script of ["build-locations.cjs", "check-locations-data.cjs"]) {
  const args = script === "build-locations.cjs" ? [path.join(root, "scripts", script), "--check"] : [path.join(root, "scripts", script)];
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${script} failed:\n${result.stdout}${result.stderr}`);
}

const mapPage = read("map.html");
const chineseMapPage = read("zh/map.html");
const sharedStyles = read("assets/css/style.css");
assert.match(mapPage, /<h2 class="visually-hidden" id="current-map-title">/, "the map canvas should not be pushed down by a duplicate visible title");
assert.match(chineseMapPage, /<h2 class="visually-hidden" id="current-map-title">/, "Chinese map must use the same compact heading structure");
const questData = JSON.parse(read("data/quests.json"));
const taskRelationIds = questData.quests.map((quest) => quest.id);
const mapStyleAsset = /\/assets\/css\/style\.css\?v=20260827-map44/;
const mapScriptAsset = /\/assets\/js\/map\.js\?v=20260827-map39/;
const mapViewerAsset = /\/assets\/js\/map-viewer-core\.js\?v=20260827-full4/;
assert.match(mapPage, mapStyleAsset, "English map must bust the stylesheet cache after adding marker-type controls");
assert.match(chineseMapPage, mapStyleAsset, "Chinese map must use the same current stylesheet cache key");
assert.match(mapPage, mapScriptAsset, "English map must bust the script cache after map interaction changes");
assert.match(chineseMapPage, mapScriptAsset, "Chinese map must use the same current script cache key");
assert.match(mapPage, mapViewerAsset, "English map must bust the viewer cache after changing the initial camera");
assert.match(chineseMapPage, mapViewerAsset, "Chinese map must use the same current viewer cache key");
assert.match(sharedStyles, /\.map-marker-type-filter\s*\{[^}]*display:\s*flex;[^}]*min-height:\s*44px;/, "native icon filters need compact touch-sized cards");
assert.match(sharedStyles, /\.map-marker-type-icon\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;[^}]*background:\s*var\(--brown-900\);/, "native filter icons need a compact dark slot so white game glyphs stay visible");
assert.match(sharedStyles, /@media \(max-width:\s*520px\)[\s\S]*?\.map-marker-type-filter small\s*\{[^}]*flex:\s*0 0 100%;[^}]*padding-left:\s*37px;/, "mobile marker counts must wrap below the label instead of clipping the card edge");
assert.doesNotMatch(sharedStyles, /var\(--green-600\)/, "map marker colors must use a defined green token");
assert.doesNotMatch(mapPage, /map-construction-badge/, "verification copy must not cover the map image");
assert.doesNotMatch(chineseMapPage, /map-construction-badge/, "Chinese verification copy must not cover the map image");
assert.doesNotMatch(sharedStyles, /\.map-construction-badge/, "removed map overlay must not leave dead styles");
assert.match(sharedStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/, "hidden UI must stay hidden when component display rules apply");
assert.match(sharedStyles, /\.map-pin-controls button\s*\{[\s\S]*?min-height:\s*44px;/, "map filters need touch-sized controls");
assert.match(mapPage, /<link rel="canonical" href="https:\/\/theranchersguide\.com\/map">/);
assert.match(mapPage, /data-location-search/);
assert.match(mapPage, /data-location-search[^>]*aria-controls="location-directory"[^>]*aria-describedby="location-count"/, "English search must expose its result region to assistive technology");
assert.match(mapPage, /data-location-category/);
assert.doesNotMatch(mapPage, /class="coverage-summary"/, "map hero should not lead with redundant coverage counters");
assert.doesNotMatch(chineseMapPage, /class="coverage-summary"/, "Chinese map hero should not lead with redundant coverage counters");
assert.doesNotMatch(mapPage, /class="evidence-status"/, "map page should not show a redundant status banner above the tools");
assert.doesNotMatch(chineseMapPage, /class="evidence-status"/, "Chinese map page should not show a redundant status banner above the tools");
assert.doesNotMatch(mapPage, /data-map-stage-hud/, "map stage should not overlay redundant view counters");
assert.doesNotMatch(chineseMapPage, /data-map-stage-hud/, "Chinese map stage should not overlay redundant view counters");
assert.match(mapPage, /data-location-search/, "location search must remain the first map utility");
assert.match(chineseMapPage, /data-location-search/, "Chinese location search must remain the first map utility");
assert.match(mapPage, /data-location-entry/g);
assert.match(mapPage, /Leafy Market/);
assert.match(mapPage, /City Hall/);
assert.match(mapPage, /id="map-progress"/);
assert.match(chineseMapPage, /id="map-progress"/);
assert.match(mapPage, /data-map-progress-count>0 \/ 16 places discovered<\/span>/, "English progress copy must cover all 16 exact POI groups");
assert.match(chineseMapPage, /data-map-progress-count>0 \/ 16 个地点已发现<\/span>/, "Chinese progress copy must cover all 16 exact POI groups");
assert.match(mapPage, /href="\/database\/npcs#victor"/);
assert.match(mapPage, /href="\/problems\/vehicle-recovery"/);
assert.match(chineseMapPage, /href="\/zh\/database\/npcs#victor"/);
assert.match(chineseMapPage, /href="\/zh\/problems\/vehicle-recovery"/);
assert.match(mapPage, /16 active Subway POI trackers/);
assert.match(mapPage, /official June update[^<]*version 0\.8\.10\.420 says 15 travel stations/);
assert.match(chineseMapPage, /16 个启用的地铁 POI/);
assert.match(chineseMapPage, /官方 0\.8\.10\.420 公告仍写 15 个可旅行站/);
assert.match(mapPage, /13 active SAFE_PARKING map trackers/);
assert.match(chineseMapPage, /13 个启用的 SAFE_PARKING 地图 tracker/);
assert.match(mapPage, /href="\/contribute\?topic=map"/);
assert.match(mapPage, /data-current-map/);
assert.match(mapPage, /data-map-region="(?:overview|rural|city)"/);
assert.match(mapPage, /<details class="map-view-options">[\s\S]*?data-map-region="overview"[\s\S]*?data-map-label-toggle[\s\S]*?<\/details>/, "region presets and label mode should live in one secondary map-options panel");
assert.match(chineseMapPage, /<details class="map-view-options">[\s\S]*?data-map-region="overview"[\s\S]*?data-map-label-toggle[\s\S]*?<\/details>/, "Chinese region presets and label mode should live in one secondary map-options panel");
assert.match(mapPage, /data-location-finder[\s\S]*?data-location-category[\s\S]*?map-type-filters[\s\S]*?<\/form>/, "directory category and original-icon filters should share the finder above the map");
assert.match(chineseMapPage, /data-location-finder[\s\S]*?data-location-category[\s\S]*?map-type-filters[\s\S]*?<\/form>/, "Chinese directory category and original-icon filters should share the finder above the map");
assert.match(mapPage, /<details class="map-more-tools">[\s\S]*?map-view-options[\s\S]*?map-advanced-filters[\s\S]*?map-task-relations[\s\S]*?map-progress-panel[\s\S]*?map-secondary-actions[\s\S]*?<\/details>/, "secondary map controls should be grouped behind one player-facing disclosure");
assert.match(chineseMapPage, /<details class="map-more-tools">[\s\S]*?map-view-options[\s\S]*?map-advanced-filters[\s\S]*?map-task-relations[\s\S]*?map-progress-panel[\s\S]*?map-secondary-actions[\s\S]*?<\/details>/, "Chinese secondary map controls should be grouped behind one player-facing disclosure");
assert.ok(mapPage.indexOf("map-type-filters") < mapPage.indexOf('class="map-viewer-panel"'), "native icon filtering should be discoverable before the map canvas");
const englishToolbar = mapPage.match(/<div class="map-viewer-toolbar"[\s\S]*?<\/div>\s*<figure class="map-stage"/)[0];
const chineseToolbar = chineseMapPage.match(/<div class="map-viewer-toolbar"[\s\S]*?<\/div>\s*<figure class="map-stage"/)[0];
assert.doesNotMatch(englishToolbar, /data-map-region|data-map-label-toggle/, "the primary toolbar should only expose map expansion and zoom controls");
assert.doesNotMatch(chineseToolbar, /data-map-region|data-map-label-toggle/, "the Chinese primary toolbar should only expose map expansion and zoom controls");
assert.match(mapPage, /The complete map opens first\. Zoom or choose a region when you want a closer look\./, "English Overview must open on the complete map");
assert.match(chineseMapPage, /地图先显示完整范围；需要细看时再缩放或选择区域。/, "Chinese Overview must open on the complete map");
assert.match(mapPage, /data-map-zoom="(?:in|out|reset)"/);
assert.match(mapPage, /data-map-pan="(?:left|right|up|down)"/);
assert.match(mapPage, /data-map-region="city-north"/);
assert.match(mapPage, /data-map-region="city-center"/);
assert.match(mapPage, /data-map-region="east-coast"/);
assert.match(mapPage, /data-map-inspector/);
assert.match(mapPage, /data-map-add-toggle/);
assert.match(mapPage, /data-map-pin-layer/);
assert.match(mapPage, /data-map-pin-form/);
assert.match(mapPage, /data-map-pin-close/);
assert.match(mapPage, /Games Station/);
assert.match(mapPage, /youtube\.com\/watch\?v=GrFiYqWcBK0(?:&amp;|&)t=1695s/);
assert.match(mapPage, /Site-collected map evidence/i);
assert.match(mapPage, /data-map-marker-layer/);
assert.match(mapPage, /data-marker-category="(?:shopping|services|transport|landmarks)"/);
assert.doesNotMatch(mapPage, /data-map-pin-filter|data-map-layer-toggle|data-map-layer-action/, "category filtering should not be duplicated below the map");
assert.doesNotMatch(chineseMapPage, /data-map-pin-filter|data-map-layer-toggle|data-map-layer-action/, "Chinese category filtering should not be duplicated below the map");
assert.doesNotMatch(mapPage, /data-map-layer-action="none"/, "the layer panel should not expose a destructive hide-all control");
assert.doesNotMatch(chineseMapPage, /data-map-layer-action="none"/, "the Chinese layer panel should not expose a destructive hide-all control");
assert.doesNotMatch(mapPage, /data-map-layer-count=/, "category cards should not repeat per-layer counts");
assert.doesNotMatch(chineseMapPage, /data-map-layer-count=/, "Chinese category cards should not repeat per-layer counts");
assert.doesNotMatch(mapPage, /data-map-stack-action="toggle"/, "global stack spreading is too noisy; nearby locations use the inspector list");
assert.doesNotMatch(chineseMapPage, /data-map-stack-action="toggle"/, "global stack spreading is too noisy; nearby locations use the inspector list");
assert.match(mapPage, /data-map-marker-type-list/, "English map needs a fine-grained native marker type filter");
assert.match(chineseMapPage, /data-map-marker-type-list/, "Chinese map needs a fine-grained native marker type filter");
assert.match(mapPage, /data-map-inspector-stack-list/, "English map needs a stable nearby-location list instead of moving labels");
assert.match(chineseMapPage, /data-map-inspector-stack-list/, "Chinese map needs a stable nearby-location list instead of moving labels");
assert.match(mapPage, /<details class="map-inspector-related"[^>]*data-map-inspector-related[\s\S]*?data-map-inspector-connections[\s\S]*?<\/details>/, "related guides should not overwhelm the primary location details");
assert.match(chineseMapPage, /<details class="map-inspector-related"[^>]*data-map-inspector-related[\s\S]*?data-map-inspector-connections[\s\S]*?<\/details>/, "Chinese related guides should not overwhelm the primary location details");
assert.match(mapPage, /<aside class="map-inspector"[^>]*data-map-inspector[^>]*hidden>/, "the inspector should stay out of the default map view until a marker is selected");
assert.match(chineseMapPage, /<aside class="map-inspector"[^>]*data-map-inspector[^>]*hidden>/, "the Chinese inspector should stay out of the default map view until a marker is selected");
assert.match(mapPage, /<details class="map-progress-panel"[^>]*data-map-progress>/, "exploration progress should be secondary disclosure");
assert.match(mapPage, /<details class="map-confidence"/, "map accuracy notes should be secondary disclosure");
assert.doesNotMatch(mapPage, /data-map-layer-summary/, "the default layer panel should not show an implementation count");
assert.doesNotMatch(chineseMapPage, /data-map-layer-summary/, "the Chinese layer panel should not show an implementation count");
assert.match(mapPage, /data-map-evidence-filter="supported"/);
assert.match(mapPage, /data-map-evidence-filter="reported"/);
assert.match(mapPage, /data-map-evidence-filter="planned"/);
assert.match(mapPage, /data-map-evidence-filter="all"[^>]*aria-pressed="true"/, "the complete map must start on all evidence");
assert.match(mapPage, /class="map-advanced-filters"/, "secondary evidence and relation filters should be collapsible");
const englishMapSupportCopy = mapPage
  .replace(/MAP_MARKERS:START[\s\S]*?MAP_MARKERS:END/, "")
  .replace(/<section class="section"><div class="container source-panel">[\s\S]*?<\/section>/, "");
const chineseMapSupportCopy = chineseMapPage.replace(/MAP_MARKERS:START[\s\S]*?MAP_MARKERS:END/, "");
assert.doesNotMatch(englishMapSupportCopy, /Steam build\s+24847725/, "visible map support copy must not expose internal build ids");
assert.doesNotMatch(chineseMapSupportCopy, /Steam build\s+24847725/, "Chinese visible map support copy must not expose internal build ids");
assert.match(mapPage, /data-map-task-relations/, "English map needs the task-location relation matrix");
assert.match(chineseMapPage, /data-map-task-relations/, "Chinese map needs the task-location relation matrix");
assert.equal((mapPage.match(/data-map-task-relation-card/g) || []).length, taskRelationIds.length, "English map must expose every task relation card");
assert.equal((chineseMapPage.match(/data-map-task-relation-card/g) || []).length, taskRelationIds.length, "Chinese map must expose every task relation card");
assert.equal((mapPage.match(/data-map-task-status="(?:anchored|directory|unresolved)"/g) || []).length, taskRelationIds.length, "English task relation cards need explicit location states");
assert.equal((chineseMapPage.match(/data-map-task-status="(?:anchored|directory|unresolved)"/g) || []).length, taskRelationIds.length, "Chinese task relation cards need explicit location states");
for (const taskId of taskRelationIds) {
  assert.match(mapPage, new RegExp(`data-map-task-id="${taskId}"`), `English task matrix is missing ${taskId}`);
  assert.match(chineseMapPage, new RegExp(`data-map-task-id="${taskId}"`), `Chinese task matrix is missing ${taskId}`);
}
assert.match(mapPage, /data-map-task-action="focus"/, "anchored task relations need a map focus action");
assert.match(mapPage, /data-map-task-action="directory"/, "directory-only task relations need a directory action");
assert.match(chineseMapPage, /data-map-task-action="focus"/);
assert.match(chineseMapPage, /data-map-task-action="directory"/);
assert.match(mapPage, /data-location-category>[\s\S]*?<option value="all"[^>]*>All categories<\/option>/, "the unified category filter should default to all locations");
assert.doesNotMatch(mapPage, /data-map-marker-layer[^>]*hidden/, "the supported marker layer should be visible by default");
assert.equal((mapPage.match(/data-marker-evidence-layer="supported"/g) || []).length, 9, "the source-backed layer must retain the nine exact anchors across three supported place groups");
assert.match(mapPage, /data-marker-evidence-layer="supported"/);
assert.match(mapPage, /data-marker-evidence-layer="reported"/);
assert.doesNotMatch(mapPage, /data-marker-evidence-layer="planned"/, "planned directory entries must not receive map coordinates");
assert.equal((mapPage.match(/class="map-marker map-marker-[a-z]+ map-marker-exact/g) || []).length, 58, "the full map must render every exact current-build anchor");
assert.equal((mapPage.match(/data-marker-icon="/g) || []).length, 58, "every exact anchor needs a native marker type for fine-grained filtering");
assert.ok((mapPage.match(/data-marker-icon="[^"]+"/g) || []).some((value) => value.includes("shop-grocery")), "native marker types must include the grocery icon");
assert.doesNotMatch(mapPage, /class="map-layer-panel"/, "the map should not repeat category controls below the canvas");
assert.match(mapPage, /class="map-confidence"/);
assert.doesNotMatch(mapPage, /map-legend-note/, "confidence copy must not be packed into the pin legend");
assert.match(mapPage, /Site-collected map evidence/);
assert.match(mapPage, /Lina's Tools/);
assert.match(mapPage, /Youssef's stand/);
assert.match(mapPage, /Train station/);
assert.match(mapPage, /Auction market/);
assert.match(mapPage, /Cash-In box/);
assert.match(mapPage, /Bykii terminal/);
assert.match(mapPage, /Wanglow's Garage/);
assert.match(mapPage, /dungeon entrances/i);
assert.match(mapPage, /wild islands/i);
assert.match(mapPage, /Transit posts/);
assert.match(mapPage, /Reviewed August 24, 2026/);
assert.match(mapPage, /theranchers\.wiki\/wiki\/map\//);
assert.match(mapPage, /theranchers\.wiki\/wiki\/npcs\//);
assert.match(mapPage, /data-location-count[^>]*>29 locations</, "English location count must remain available after the hero cleanup");
assert.match(chineseMapPage, /data-location-count[^>]*>29 个地点</, "Chinese location count must remain available after the hero cleanup");
assert.match(chineseMapPage, /data-location-search/, "Chinese map needs a core-location search");
assert.match(chineseMapPage, /for="zh-location-search"[\s\S]*?id="zh-location-search"[^>]*aria-controls="zh-location-directory"/, "Chinese search needs an explicit label and result relationship");
assert.match(chineseMapPage, /data-location-category/, "Chinese map needs category filtering");
assert.equal((chineseMapPage.match(/data-location-entry/g) || []).length, 29, "Chinese map finder must cover the full translated location directory");
assert.match(chineseMapPage, /LOCATION_DIRECTORY:START[\s\S]*LOCATION_DIRECTORY:END/);
assert.match(chineseMapPage, /City Hall 市政厅/);
assert.match(chineseMapPage, /Auction Market/);
assert.match(chineseMapPage, /Transit Posts/);
assert.ok(mapPage.indexOf("data-location-search") < mapPage.indexOf("data-current-map"), "English search must appear before map controls");
assert.ok(chineseMapPage.indexOf("data-location-search") < chineseMapPage.indexOf("data-current-map"), "Chinese search must appear before map controls");
assert.equal((mapPage.match(/data-location-group=/g) || []).length, 4, "English directory must use four collapsible category groups");
assert.equal((chineseMapPage.match(/data-location-group=/g) || []).length, 4, "Chinese directory must use four collapsible category groups");
assert.match(mapPage, /data-map-expand/);
assert.match(chineseMapPage, /data-map-expand/);
assert.match(mapPage, /data-map-stage-selection/);
assert.match(chineseMapPage, /data-map-stage-selection/);
assert.match(mapPage, /data-map-label-toggle[^>]*aria-pressed="false"/, "English map needs an explicit native-label toggle");
assert.match(chineseMapPage, /data-map-label-toggle[^>]*aria-pressed="false"/, "Chinese map needs an explicit native-label toggle");
assert.match(mapPage, /class="map-secondary-actions"/);
assert.match(chineseMapPage, /class="map-secondary-actions"/);

// Recognition photos: hover cards, lightbox hooks, locate-on-map button
assert.match(mapPage, /data-visual-atlas/, "English map keeps the recognition-photo section");
assert.equal((mapPage.match(/data-atlas-photo/g) || []).length, 4, "every English atlas photo opens the lightbox");
assert.equal((mapPage.match(/atlas-locate-btn/g) || []).length, 1, "only the airport photo links to a verified pin");
assert.match(mapPage, /class="location-map-button atlas-locate-btn" data-marker-focus="The Ranchers Airport"/, "locate button must target an existing guide pin");
assert.equal((chineseMapPage.match(/data-atlas-photo/g) || []).length, 4, "every Chinese map photo opens the lightbox");
assert.equal((chineseMapPage.match(/atlas-locate-btn/g) || []).length, 1, "Chinese map exposes exactly one locate-on-map button");
assert.match(chineseMapPage, /atlas-locate-btn" data-marker-focus="The Ranchers Airport">在地图上定位/, "Chinese locate button targets the airport pin");
assert.match(sharedStyles, /\.visual-atlas-card\s*\{[\s\S]*?transition:\s*transform/, "atlas cards share the site card hover transition");
assert.match(sharedStyles, /\.visual-atlas-card:hover\s*\{\s*transform:\s*translateY\(-4px\)/, "atlas cards lift on hover");
assert.match(sharedStyles, /\.visual-atlas-card:hover img\s*\{\s*transform:\s*scale\(1\.04\)/, "atlas photos zoom slightly on hover");
assert.match(sharedStyles, /\.atlas-lightbox\s*\{[\s\S]*?position:\s*fixed/, "lightbox overlay styles exist");
assert.match(sharedStyles, /@keyframes pin-flash/, "pin flash animation exists");
assert.match(sharedStyles, /\.map-marker\.pin-flash/, "pin flash class targets map markers");
assert.doesNotMatch(sharedStyles.match(/@keyframes pin-flash\s*\{[\s\S]*?\n\}/)[0], /transform:/, "locating a marker must not rotate or resize its anchor or touch target");
assert.match(sharedStyles, /\.map-marker-native-icon\s*\{[^}]*max-width:\s*none;/, "native glyphs must not be squeezed by their inverse-scaled button");
assert.match(sharedStyles, /\.map-marker span\s*\{[^}]*transform-origin:\s*bottom center;/, "inverse-scaled labels must stay centered over the anchor");
assert.match(sharedStyles, /\.map-stage\s*\{[\s\S]*?aspect-ratio:\s*1\s*\/\s*1;[\s\S]*?touch-action:\s*pan-y;/, "map stage must retain the complete square native texture and allow vertical touch scrolling");
assert.match(sharedStyles, /\.map-stage\s*\{[^}]*scroll-margin-top:\s*176px;/, "deep links to the map stage must leave both the sticky navigation and the 72px map toolbar visible");
assert.match(sharedStyles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-stage\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10;/, "all embedded maps must use the planned 16:10 viewport without stretching the square texture");
assert.match(sharedStyles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-canvas\s*\{[^}]*left:\s*50%;[^}]*width:\s*auto;[^}]*height:\s*100%;[^}]*aspect-ratio:\s*1\s*\/\s*1;[^}]*translate\(calc\(-50% \+ var\(--map-x, 0%\)\), var\(--map-y, 0%\)\)/, "embedded map framing must keep the base map and markers in one centered square coordinate canvas");
assert.match(sharedStyles, /@media \(max-width:\s*560px\)[\s\S]*?\.map-zone\s*\{\s*display:\s*none;/, "mobile map must rely on the 44px region tabs instead of labels that cover exact anchors");
assert.match(sharedStyles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-stage:not\(\.is-zoomed\) \.map-marker\[data-marker-id="subway"\]::after\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;/, "mobile inline subway overview needs compact visuals while retaining 44px hit targets");
assert.match(sharedStyles, /\.map-stage img\s*\{[\s\S]*?object-fit:\s*contain;/, "map image must not crop its edges");
assert.match(sharedStyles, /\.map-viewer-panel\.is-map-fullscreen \.map-stage\s*\{[\s\S]*?touch-action:\s*none;/, "expanded map owns drag and pinch gestures");
assert.match(sharedStyles, /\.map-viewer-panel\.is-map-fullscreen\s*\{[^}]*background:\s*var\(--cream-100\);/, "expanded map must use a defined opaque surface token");
assert.match(sharedStyles, /\.map-viewer-panel\.is-map-fullscreen\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;/, "expanded mobile map should devote the viewport to the canvas instead of leaving a blank scroll area");
assert.match(sharedStyles, /\.map-viewer-panel\.is-map-fullscreen \.map-stage\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*aspect-ratio:\s*auto;/, "expanded map stage should fill the height left by its toolbar");
assert.match(sharedStyles, /\.map-viewer-panel\.is-map-fullscreen \.map-canvas\s*\{[^}]*height:\s*100%;[^}]*aspect-ratio:\s*1 \/ 1;/, "the square source texture must keep its coordinate system while the full-screen viewport grows vertically");
assert.match(sharedStyles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-pan-controls\s*\{\s*display:\s*none;/, "embedded map should hide redundant pan arrows");
assert.match(sharedStyles, /\.map-viewer-panel\.is-map-fullscreen \.map-pan-controls\s*\{\s*display:\s*flex;/, "fullscreen map should retain pan controls as a fallback");
assert.match(sharedStyles, /\.map-marker\s*\{[^}]*min-width:\s*var\(--map-marker-hit-size, 44px\);[^}]*min-height:\s*var\(--map-marker-hit-size, 44px\);/, "map markers need counter-scaled 44px touch targets");
assert.match(sharedStyles, /\.map-marker::after\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/, "marker visuals must stay smaller than their 44px touch targets");
assert.match(sharedStyles, /\.map-marker\[data-marker-id="subway"\]::after\s*\{[^}]*width:\s*26px;[^}]*height:\s*26px;/, "dense subway pins need a compact visual that preserves the exact center anchor");
assert.match(sharedStyles, /\.map-marker\[data-marker-id="subway"\]\s+\.map-marker-native-icon\s*\{[^}]*width:\s*17px;[^}]*height:\s*17px;/, "dense subway pins need a readable native glyph inside the compact visual");
assert.match(sharedStyles, /\.map-marker\.map-label-edge-left span\s*\{[^}]*left:\s*50%;/, "labels near the left map edge must pin inside the stage");
assert.match(sharedStyles, /\.map-marker\.map-label-edge-right span\s*\{[^}]*right:\s*50%;/, "labels near the right map edge must pin inside the stage");
assert.match(sharedStyles, /\.map-marker\.map-label-edge-top span\s*\{[^}]*top:\s*calc\(50% \+ 18px \* var\(--map-label-scale, 1\)\);/, "labels near the top map edge must flip below the marker with a stable screen-space gap");
assert.match(sharedStyles, /\.map-pin::before\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;/, "the temporary pin should keep a compact visual inside its 44px hit target");
assert.match(sharedStyles, /\.map-progress-summary button\s*\{\s*min-height:\s*44px;/, "progress controls need 44px touch targets");
assert.match(sharedStyles, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.map-marker\.pin-flash\s*\{\s*animation:\s*none;/, "map marker feedback must respect reduced-motion preferences");

for (const pattern of [
  /data-current-map/,
  /data-map-stage/,
  /data-map-region="overview"/,
  /data-map-zoom="in"/,
  /data-map-zoom="out"/,
  /data-map-zoom="reset"/,
  /data-map-pan="left"/,
  /data-map-inspector/,
  /data-map-add-toggle/,
  /data-map-pin-layer/,
  /data-map-pin-form/,
  /data-map-marker-layer/,
  /data-location-category/,
  /data-map-evidence-filter="supported"/,
  /data-map-evidence-filter="reported"/,
  /data-map-evidence-filter="planned"/,
  /data-map-relation-filter="all"/,
  /data-map-relation-filter="npc"/,
  /data-map-relation-filter="quest"/,
  /data-map-relation-filter="service"/,
  /data-map-progress/,
  /data-map-progress-count/,
  /data-map-discovery-toggle/,
  /data-map-progress-reset/,
  /class="map-confidence"/,
  /assets\/js\/map-core\.js/,
  /assets\/js\/map-state-core\.js/,
  /assets\/js\/map-viewer-core\.js/,
  /assets\/js\/map\.js/,
]) {
  assert.match(chineseMapPage, pattern, `Chinese map must match the interactive map contract: ${pattern}`);
}
const chineseMarkers = chineseMapPage.match(/class="map-marker map-marker-[a-z]+ map-marker-exact/g) || [];
const exactMarkers = mapPage.match(/class="map-marker map-marker-[a-z]+ map-marker-exact/g) || [];
assert.equal(exactMarkers.length, 58, "map should carry all current-build exact anchors");
assert.equal(chineseMarkers.length, exactMarkers.length, "English and Chinese maps must expose the same marker set");
assert.doesNotMatch(mapPage, /map-answer[\s\S]*?Submit a missing location/, "map contribution must stay in the secondary collapsed entry");
assert.doesNotMatch(chineseMapPage, /map-answer[\s\S]*?提交缺失地点/, "Chinese map contribution must stay in the secondary collapsed entry");
assert.doesNotMatch(chineseMapPage, /不能证明每个标记的精确坐标|当前外部标记仍需复核|当前分店标记仍需复核/, "Chinese evidence copy must not contradict the verified current-build POI transforms");
assert.match(chineseMapPage, /七个精确分店 POI/, "Chinese Leafy visual reference must describe the verified seven-branch layer");
for (const category of ["shopping", "services", "landmarks"]) {
  assert.ok(
    new RegExp(`map-marker-${category}`).test(mapPage),
    `expected at least one ${category} marker`
  );
}

const locationEntries = mapPage.match(/<article data-location-entry[\s\S]*?<\/article>/g) || [];
assert.ok(locationEntries.length >= 28, "map directory should contain at least 28 location entries");
for (const entry of locationEntries) {
  assert.ok(
    /data-location-map/.test(entry) || /pin-pending/.test(entry) || /evidence-badge/.test(entry),
    "every location entry needs a map link or an explicit status label"
  );
}

for (const image of [
  "map-city-center.webp",
  "map-airport.webp",
  "map-city-hall.webp",
  "map-leafy-market.webp",
]) {
  assert.ok(fs.existsSync(path.join(root, "assets", "img", image)), `${image} must exist`);
  assert.match(mapPage, new RegExp(`/assets/img/${image.replace(".", "\\.")}`));
}
assert.ok(fs.statSync(path.join(root, "assets", "img", "map", "sunvale-native-b24847725.png")).size >= 900000, "the complete native map must retain enough source detail for readable roads and POIs");

const mapScript = read("assets/js/map.js");
assert.doesNotMatch(mapScript, /data\.mapMarkerTypeCount/, "native icon filters should not add a count to every icon type");
assert.doesNotMatch(mapScript, /RanchersMapState\.toggleLayer/, "primary categories should filter to one category instead of maintaining a second hide/show model");
assert.match(mapScript, /category\.addEventListener\("change"[\s\S]*?applyMarkerFilter\(category\.value/, "the finder category should filter the map and directory together");
assert.match(mapScript, /activeMarkerTypeFilter = button\.dataset\.mapMarkerType;[\s\S]*?category\.value = "all";[\s\S]*?render\(\);[\s\S]*?updateQueryUrl\(\);/, "choosing a native icon type should reset the shared category without leaving stale directory state");
assert.doesNotMatch(mapScript, /layoutMarkerOffsets|--marker-offset-[xy]/, "runtime marker rendering must never displace exact coordinate anchors");
assert.match(mapScript, /function updateMarkerLabelPlacement\(\)/, "marker labels need runtime edge placement");
assert.match(mapScript, /function labelOverlapsMarker\(/, "visible labels need collision checks against nearby markers");
assert.match(mapScript, /collisionOffsets\s*=\s*\[\[0, 0\]\]/, "labels must keep a fixed source-relative position instead of jumping between fallback offsets");
assert.match(mapScript, /map-label-collision-hidden/, "irreducibly dense labels need an accessible visual fallback");
assert.match(sharedStyles, /map-label-collision-hidden/, "dense label fallback needs a visible-state CSS rule");
assert.match(sharedStyles, /map-stacks-expanded\.map-labels-visible[\s\S]*?\.map-marker[^}]*span[^{]*\{[^}]*opacity:\s*0\s*!important/, "expanded all-icon view must prioritize readable glyphs over dense labels");
assert.match(mapScript, /map-label-edge-left/);
assert.match(mapScript, /map-label-edge-right/);
assert.match(mapScript, /map-label-edge-top/);
assert.match(mapScript, /requestAnimationFrame\([\s\S]*updateMarkerLabelPlacement/, "fullscreen transitions must recalculate label placement after layout settles");
assert.match(mapScript, /data-map-region/);
assert.match(mapScript, /data-location-map/);
assert.match(mapScript, /data-map-zoom/);
assert.match(mapScript, /data-map-pan/);
assert.match(mapScript, /data-map-inspector/);
assert.match(mapScript, /data-map-add-toggle/);
assert.match(mapScript, /stageToImage/);
assert.match(mapScript, /map-pin/);
assert.match(mapScript, /zoomAt/);
assert.match(mapScript, /getView\("full"\)/, "Fit control must restore the true full-map view after the focused overview loads");
assert.match(sharedStyles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-stage\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10;/, "the embedded map should fit a screen instead of exposing the full square texture height");
assert.match(sharedStyles, /\.map-viewer-panel:not\(\.is-map-fullscreen\)\s*\{[^}]*width:\s*min\(100%,\s*calc\(160svh - 368px\)\);/, "embedded map sizing must reserve space for the actual first-screen heading and finder");
assert.match(sharedStyles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-canvas\s*\{[^}]*left:\s*50%;[^}]*height:\s*100%;[^}]*aspect-ratio:\s*1\s*\/\s*1;/, "the shortened embedded viewport must keep the source map square and centered");
assert.match(mapScript, /panBy/);
assert.match(mapScript, /addEventListener\("wheel"/);
assert.match(mapScript, /data-map-pin-close/);
assert.match(mapScript, /data-map-marker-layer/);
assert.match(mapScript, /data-map-pin-filter/);
assert.match(mapScript, /data-map-evidence-filter/);
assert.match(mapScript, /activeEvidenceFilter/);
assert.match(mapScript, /marker\.dataset\.markerEvidenceLayer/);
assert.match(mapScript, /ranchers-guide-map-progress-v1/);
assert.match(mapScript, /data-map-relation-filter/);
assert.match(mapScript, /markerHasRelation/);
assert.match(mapScript, /buildMarkerStacks/);
assert.match(mapScript, /renderInspectorStack/);
assert.doesNotMatch(mapScript, /viewState && viewState\.scale > 1\.25/, "zooming must not auto-rearrange or disable marker stacks");
assert.doesNotMatch(mapScript, /stackExpanded[^\n]*applyMarkerStackFan/, "zooming must not auto-fan dense marker stacks");
assert.match(mapScript, /applyMapView\(true\)/, "continuous pan and zoom should defer overlay layout work");
assert.match(mapScript, /function scheduleMapOverlayRefresh/, "map overlay refresh should be debounced after interaction");
assert.match(sharedStyles, /\.map-canvas\s*\{[\s\S]*?transition:\s*none;/, "map transforms must not animate during pointer and wheel interaction");
assert.doesNotMatch(mapScript, /event\.target\.closest\(\"\.map-marker-stack-count\"\)/, "stack count badges must not steal marker detail clicks");
assert.match(mapScript, /details panel/, "stack copy must direct nearby-location selection to the stable details panel");
assert.match(mapScript, /RanchersMapViewer\.pickMarker\(/, "overlapping clicks must resolve against painted symbols before target padding");
assert.match(mapScript, /event\.detail === 0 \|\| clickedLabel \? marker/, "keyboard activation must select the focused marker, not a pointer coordinate");
assert.match(mapScript, /marker\.addEventListener\("keydown"[\s\S]*?event\.key !== "Enter"[\s\S]*?selectMarker\(marker\)/, "Enter and Space must activate the focused marker directly");
assert.doesNotMatch(mapScript, /map-marker-stack-count/, "dense stacks must not render numeric overlays on top of native icons");
assert.doesNotMatch(sharedStyles, /map-marker-stack-count/, "numeric stack overlay styles must be removed from the map UI");
assert.doesNotMatch(sharedStyles, /\.map-marker\.is-discovered::before/, "discovery progress must not add a non-native checkmark over the game map");
assert.doesNotMatch(sharedStyles, /content:\s*[\"']✓[\"']/, "map markers must not render invented checkmark artwork");
assert.match(mapScript, /updateMarkerStackBadges/);
assert.match(mapPage, /Nearby locations/);
assert.match(chineseMapPage, /附近地点/);
assert.match(mapScript, /localStorage/);
assert.match(mapScript, /data-map-discovery-toggle/);
assert.match(mapScript, /data-map-progress-reset/);
assert.match(mapScript, /applyMarkerFilter\(hasDirectory \? category\.value : "all", true\)/, "map script should initialize marker categories from the shared finder state");
assert.match(mapScript, /activeEvidenceFilter = "all"/, "show all layers must include reported and planned evidence layers");
assert.match(mapScript, /applyMarkerFilter\(category\.value, category\.value === "all"\)/, "the shared category selector must opt into all evidence when reset to all");
assert.match(mapScript, /focusLocation/, "directory shortcuts should synchronize category, evidence and relation state");
assert.match(mapScript, /markerTarget/);
assert.match(mapScript, /localTargetExists/, "map inspector must not expose a dead locale anchor");
assert.match(mapScript, /inspectorLink\.hidden = !localTargetExists/, "missing Chinese directory entries must not create a cross-language dead link");
assert.match(mapScript, /data-atlas-photo/, "map script wires the photo lightbox");
assert.match(mapScript, /atlas-lightbox/, "map script builds the lightbox overlay");
assert.match(mapScript, /pin-flash/, "locate-on-map flashes the target pin");
assert.match(mapScript, /Escape/, "lightbox closes on Escape");
assert.match(mapScript, /URLSearchParams/, "map directory reads deep-link queries");
assert.match(mapScript, /history\.replaceState/, "map directory keeps the shareable URL in sync");
assert.match(mapScript, /history\[mode\]/, "explicit location selections can create history entries");
assert.match(mapScript, /searchNeedsHistoryBoundary/, "typing a new search from a selected location must preserve a browser Back boundary");
assert.match(mapScript, /if \(hadSelection && !mapInteractionState\.selectedLocationId\)/, "the unified category filter must clear a location it hides");
assert.match(mapScript, /params\.get\("location"\)/, "map accepts location query deep links");
assert.match(mapScript, /knownLocationIds/, "map deep links must accept directory-only task locations as well as marker ids");
assert.match(mapScript, /No verified coordinate/, "directory-only deep links must explain the missing coordinate in the inspector");
assert.match(mapScript, /search\.value\s*=\s*params\.get\("q"\)/, "browser Back must restore the directory search control from the URL");
assert.match(mapScript, /category\.value\s*=\s*restoredCategory/, "browser Back must restore the directory category control from the URL");
assert.match(mapScript, /popstate/, "browser Back restores map location state");
assert.match(mapScript, /is-relation-dimmed/, "relation filters dim unrelated markers instead of hiding them");
assert.doesNotMatch(mapScript, /relationHidden/, "relation filters must not hide unrelated markers");
assert.match(mapScript, /data-map-expand/, "mobile map supports an expanded mode");
assert.match(mapScript, /data-map-label-toggle/, "map should expose a native POI label toggle");
assert.match(mapScript, /map-labels-visible/, "label toggle should only reveal labels through a stage state class");
assert.match(mapScript, /compactMarkerLabels/, "marker labels should use compact point names in the map visual layer");
assert.doesNotMatch(mapScript, /updateMapStageHud/, "removed map HUD should not leave dead counter update code");
assert.match(mapScript, /updateMapStageSelection/, "selected marker details should be visible without leaving the map stage");
assert.match(mapScript, /--map-marker-scale/, "marker visuals must counter-scale with map zoom so icons stay readable");
assert.match(mapScript, /map-stacks-expanded/, "dense marker stacks must expand after zoom so every layer can be inspected");
assert.match(mapScript, /toggleMarkerStack/, "dense marker badges must offer a direct visual expand action");
assert.doesNotMatch(mapScript, /toggleAllMarkerStacks|stackActionButton/, "removed global stack controls must not leave dead interaction code");
assert.match(mapScript, /map-marker-stack-hit/, "fanned native glyphs need their own click targets so overlapping center buttons cannot steal the click");
assert.match(mapScript, /collapseFannedStack/, "dense fan state must have a keyboard-accessible collapse path");
assert.match(mapScript, /map-stack-fan-open/, "expanded dense stacks must expose a fan-open state");
assert.match(mapScript, /markerBaseAriaLabel/, "dense stack markers must announce their expand and cycle affordances");
assert.match(sharedStyles, /scale\(var\(--map-marker-scale, 1\)\)/, "native marker visuals must use the zoom-aware marker scale");
assert.match(sharedStyles, /\.map-stage\.is-zoomed \.map-marker-has-native-icon \.map-marker-native-icon/, "zoomed native icons must retain a compact readable size");
assert.match(sharedStyles, /\.map-marker span \{[\s\S]*?transform:\s*translate\([^;]+\)\s*scale\(var\(--map-label-scale,\s*1\)\)/, "marker labels must scale with the transformed map");
assert.match(mapScript, /RanchersMapViewer\.getMarkerMetrics\(viewState\.scale\)/, "icons and targets must keep their screen size across zoom levels");
assert.match(sharedStyles, /--stack-dx/, "fan-open marker visuals must preserve their exact button anchor while separating the glyphs");
assert.match(sharedStyles, /map-marker-stack-tether/, "fan-open markers must show a subtle tether back to the exact center anchor");
assert.match(sharedStyles, /\.map-marker-stack-hit\s*\{[^}]*min-width:\s*var\(--map-marker-hit-size, 44px\);[^}]*min-height:\s*var\(--map-marker-hit-size, 44px\);/, "fan-open hit targets must also be counter-scaled");
assert.match(sharedStyles, /prefers-reduced-motion: reduce[\s\S]*?\.map-marker-native-icon\s*\{\s*transition:\s*none;/, "marker fan motion must respect reduced-motion preferences");
assert.match(mapScript, /inspector\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/, "stage selection details should jump to the inspector without centering a tall panel off-screen");
assert.match(mapScript, /mapPanel\.setAttribute\("role", "dialog"\)/, "expanded map needs dialog semantics");
assert.match(mapScript, /mapPanel\.scrollTop = 0/, "opening the expanded map must start at the map instead of a stale layer-panel scroll position");
assert.match(mapScript, /mapFocusableElements/, "expanded map needs a bounded keyboard focus loop");
assert.match(mapScript, /lightboxOpener/, "the atlas lightbox restores its opener focus");
assert.match(mapScript, /findBestLocation/, "map directory highlights the best matching location");
assert.match(mapScript, /renderInspectorJourney/, "map inspector consumes audited entity journey routes");
assert.match(sharedStyles, /\.map-inspector-journey-link/, "map journey links need a shared style");

const sitemapForMap = read("sitemap.xml");
for (const route of ["/map", "/zh/map"]) {
  const entry = sitemapForMap.match(/<url>[\s\S]*?<\/url>/g).find(block => block.includes(`<loc>https://theranchersguide.com${route}</loc>`));
  const date = entry?.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
  assert.ok(date && date >= "2026-08-25", `${route}: lastmod must include the released map update`);
}

const viewerCore = require("../assets/js/map-viewer-core.js");
assert.deepEqual(viewerCore.getView("overview"), { scale: 3.2, x: -57.6, y: -76.8 }, "desktop should open on the useful land area instead of the empty sea around the full texture");
assert.deepEqual(viewerCore.getView("overview-mobile"), { scale: 3.2, x: -57.6, y: -76.8 }, "mobile should use the same useful initial map camera");
assert.deepEqual(viewerCore.getView("full"), { scale: 1, x: 0, y: 0 }, "Fit must retain an explicit complete-map camera");
assert.deepEqual(viewerCore.getView("rural"), { scale: 2, x: -8, y: -50 });
assert.deepEqual(viewerCore.getView("city"), { scale: 2, x: -46, y: -50 });
assert.equal(viewerCore.clampZoom(9), 8);
assert.equal(viewerCore.clampZoom(0.2), 1);
assert.deepEqual(viewerCore.pan({ scale: 2, x: 0, y: 0 }, "left"), { scale: 2, x: 3.5, y: 0 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0.5, sy: 0.5 }, { scale: 1, x: 0, y: 0 }), { x: 50, y: 50 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0.5, sy: 0.5 }, { scale: 2, x: 0, y: 0 }), { x: 50, y: 50 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0, sy: 0 }, { scale: 2, x: 0, y: 0 }), { x: 25, y: 25 });
assert.deepEqual(viewerCore.stageToImage({ sx: 0.5, sy: 0.5 }, { scale: 2, x: -8, y: -50 }), { x: 54, y: 75 });
assert.deepEqual(viewerCore.zoomAt({ scale: 1, x: 0, y: 0 }, 2, { sx: 0.25, sy: 0.25 }), { scale: 2, x: 25, y: 25 });
assert.deepEqual(viewerCore.zoomAt({ scale: 2, x: 25, y: 25 }, 0.5, { sx: 0.25, sy: 0.25 }), { scale: 1, x: 0, y: 0 });
assert.deepEqual(viewerCore.panBy({ scale: 1, x: 0, y: 0 }, 0.1, 0.05), { scale: 1, x: 0, y: 0 }, "the overview must not expose blank space around the full map");
assert.deepEqual(viewerCore.panBy({ scale: 2, x: 0, y: 0 }, -0.1, 0), { scale: 2, x: -10, y: 0 });
assert.deepEqual(viewerCore.focus(84.24, 48.71625, 2.6), { scale: 2.6, x: -80, y: 3.33775 }, "edge POIs must be reachable without exposing space beyond the square map");

const mapCore = require("../assets/js/map-core.js");
const mapState = require("../assets/js/map-state-core.js");
const supportedCityHall = { id: "city-hall", category: "services", evidenceLayer: "supported" };
const supportedLeafyMarket = { id: "leafy-market", category: "shopping", evidenceLayer: "supported" };
assert.equal(
  mapState.directoryFilterKeepsSelection(supportedCityHall, "shopping"),
  false,
  "the visible directory category must not leave a hidden location selected"
);
assert.equal(
  mapState.directoryFilterKeepsSelection(supportedCityHall, "all"),
  true,
  "the all-category directory filter must preserve a visible selection"
);
assert.equal(
  mapState.searchNeedsHistoryBoundary("city-hall", "City Hall", "Airport"),
  true,
  "starting a different search from a selected location must preserve a Back-history boundary"
);
assert.equal(
  mapState.searchNeedsHistoryBoundary(null, "City Hall", "Airport"),
  false,
  "ordinary search typing without a selected location must keep using replaceState only"
);
let interactionState = mapState.createState();
interactionState = mapState.selectLocation(interactionState, supportedCityHall);
assert.equal(interactionState.selectedLocationId, "city-hall", "selecting a marker enables location-specific actions");
interactionState = mapState.selectRegion(interactionState, "overview");
assert.equal(interactionState.selectedLocationId, null, "changing regions must clear the old location selection");
interactionState = mapState.selectLocation(mapState.createState(), supportedCityHall);
interactionState = mapState.setCategory(interactionState, "shopping", supportedCityHall);
assert.equal(interactionState.selectedLocationId, null, "a category filter that hides the selection must clear it");
interactionState = mapState.selectLocation(mapState.createState(), supportedCityHall);
interactionState = mapState.setEvidence(interactionState, "reported", supportedCityHall);
assert.equal(interactionState.selectedLocationId, null, "an evidence filter that hides the selection must clear it");
interactionState = mapState.focusLocation(mapState.createState({ relation: "quest" }), supportedCityHall);
assert.deepEqual(
  { category: interactionState.category, evidence: interactionState.evidence, relation: interactionState.relation },
  { category: "services", evidence: "supported", relation: "all" },
  "directory focus must reveal its marker even when earlier filters conflict"
);
assert.equal(
  mapState.resolveLocationId("not-a-place", "airport", ["city-hall", "airport"]),
  "airport",
  "an invalid location query must fall back to a valid legacy marker hash"
);
assert.deepEqual(
  mapState.groupsOpenAfterSearch(false, ["shopping", "landmarks"], ["services"]),
  ["services"],
  "clearing search must restore the directory groups that were open before searching"
);
interactionState = mapState.selectLocation(mapState.createState(), supportedLeafyMarket);
interactionState = mapState.toggleLayer(interactionState, "shopping", supportedLeafyMarket);
assert.equal(mapState.markerVisible(supportedLeafyMarket, interactionState), false, "turning off Shopping must hide shopping markers");
assert.equal(mapState.markerVisible(supportedCityHall, interactionState), true, "turning off Shopping must leave Services visible");
assert.equal(interactionState.selectedLocationId, null, "turning off the selected marker layer must clear the selection");
assert.equal(typeof mapState.layoutMarkerOffsets, "undefined", "map state must not expose collision layout that can move coordinate anchors");
assert.doesNotMatch(sharedStyles, /--marker-offset-[xy]/, "marker CSS must anchor directly to its source percentage");
const locations = [
  { id: "leafy-market", title: "Leafy Market", category: "shopping", keywords: "seeds farming supplies" },
  { id: "city-hall", title: "City Hall 市政厅", category: "services", keywords: "land blueprints mayor zirconite 锆矿 合同" },
  { title: "Subway", category: "transport", keywords: "fast travel station" },
];

assert.deepEqual(mapCore.filterLocations(locations, "seed", "all").map((item) => item.title), ["Leafy Market"]);
assert.deepEqual(mapCore.filterLocations(locations, "", "transport").map((item) => item.title), ["Subway"]);
assert.deepEqual(mapCore.filterLocations(locations, "blueprint", "services").map((item) => item.id), ["city-hall"]);
assert.deepEqual(mapCore.filterLocations(locations, "casino", "all"), []);
assert.equal(mapCore.findBestLocation(locations, "zirconite").id, "city-hall");
assert.equal(mapCore.findBestLocation(locations, "市政厅").id, "city-hall");
assert.equal(mapCore.findBestLocation(locations, "leafy markte").id, "leafy-market");
assert.equal(mapCore.buildQueryString("city hall", "services"), "?q=city%20hall&category=services");
assert.equal(mapCore.buildQueryString("", "all"), "");

const search = read("assets/js/search.js");
assert.match(search, /"\/map"/);
assert.match(search, /ranchers-search-index-v43/);
assert.match(search, /ranchers-search-index-zh-v29/);
assert.match(search, /node\.querySelector\("h2, h3"\)/);

const sitemap = read("sitemap.xml");
assert.match(sitemap, /https:\/\/theranchersguide\.com\/map/);

const homepage = read("index.html");
assert.match(homepage, /href="\/map"/);
assert.match(homepage, /href="\/contribute\?topic=map"/);

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".")) return htmlFiles(target);
    return entry.isFile() && entry.name.endsWith(".html") ? [target] : [];
  });
}

for (const file of htmlFiles(root)) {
  const relative = path.relative(root, file);
  const expectedMapRoute = relative.startsWith(`zh${path.sep}`) ? /href="\/zh\/map"/ : /href="\/map"/;
  assert.match(fs.readFileSync(file, "utf8"), expectedMapRoute, `${relative} needs a locale-matched Map link`);
}

console.log("PASS: searchable map directory, contribution path, site search and discovery links are complete.");
