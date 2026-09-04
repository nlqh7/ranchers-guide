const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function pngSize(relativePath) {
  const file = path.join(root, relativePath);
  assert.ok(fs.existsSync(file), `${relativePath} must exist`);
  const buffer = fs.readFileSync(file);
  assert.equal(buffer.toString("ascii", 1, 4), "PNG", `${relativePath} must remain an original PNG asset`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

assert.deepEqual(pngSize("assets/img/map/sunvale-native-b24847725.png"), { width: 4000, height: 4000 });
for (const icon of ["city-hall", "shop-grocery", "subway", "parking", "airport", "museum", "dealer-berrari", "dealer-prestige", "dealer-star", "dealer-utility", "car-paint", "port", "ferris-wheel", "police-station", "casino", "novagen", "vitalis", "fuel-station"]) {
  assert.deepEqual(pngSize(`assets/img/map/icons/${icon}-b24847725.png`), { width: 256, height: 256 });
}

for (const relativePath of ["map.html", "zh/map.html"]) {
  const html = read(relativePath);
  assert.match(html, /src="\/assets\/img\/map\/sunvale-native-b24847725\.png"[^>]*width="4000"[^>]*height="4000"[^>]*draggable="false"[^>]*data-protected-game-art/);
  assert.equal((html.match(/class="map-marker map-marker-[a-z]+ map-marker-exact/g) || []).length, 58, `${relativePath} must expose all 58 exact native POI anchors`);
  assert.match(html, /map-marker-has-native-icon/, `${relativePath} must distinguish native glyph markers from fallback markers`);
  assert.equal((html.match(/map-marker-evidence-supported/g) || []).length, 9, `${relativePath} must default to the nine supported exact anchors`);
  assert.equal((html.match(/data-marker-id="leafy-market"/g) || []).length, 7, `${relativePath} must expose every Leafy Market branch`);
  assert.equal((html.match(/data-marker-id="subway"/g) || []).length, 16, `${relativePath} must expose every cross-checked Subway entrance`);
  assert.equal((html.match(/data-marker-id="overnight-parking"/g) || []).length, 13, `${relativePath} must expose every enumerated current-build SAFE_PARKING tracker`);
  assert.match(html, /\/assets\/img\/map\/icons\/city-hall-b24847725\.png/);
  assert.match(html, /\/assets\/img\/map\/icons\/shop-grocery-b24847725\.png/);
  assert.equal((html.match(/\/assets\/img\/map\/icons\/subway-b24847725\.png/g) || []).length, 16, `${relativePath} must use the native Subway glyph for every entrance`);
  assert.equal((html.match(/\/assets\/img\/map\/icons\/parking-b24847725\.png/g) || []).length, 13, `${relativePath} must use the native Parking glyph for every tracker`);
  assert.match(html, /\/assets\/img\/map\/icons\/airport-b24847725\.png/);
  assert.match(html, /\/assets\/img\/map\/icons\/museum-b24847725\.png/);
  assert.equal((html.match(/\/assets\/img\/map\/icons\/dealer-[a-z]+-b24847725\.png/g) || []).length, 4, `${relativePath} must use each native dealership glyph once`);
  assert.doesNotMatch(html, /used with developer permission|经开发商许可/i, `${relativePath} must keep legal/process copy out of the map workspace`);
  assert.match(html, /class="site-footer"/, `${relativePath} must retain the shared site footer`);
}

const mapScript = read("assets/js/map.js");
assert.match(mapScript, /data-protected-game-art/);
assert.match(mapScript, /contextmenu/);
assert.match(mapScript, /new Set\(markers\.map/, "multiple branch markers must keep one stable location identity");
assert.match(mapScript, /function getStackThreshold\(\)[\s\S]*?getBoundingClientRect\(\)/, "marker stacks must adapt to the rendered map size");
assert.match(mapScript, /addEventListener\("resize"[\s\S]*?buildMarkerStacks\(\)/, "marker stack grouping must stay correct after responsive resizing");
assert.match(mapScript, /dataset\.markerId\s*!==\s*current\.dataset\.markerId/, "compact mobile stacks must not merge unrelated POI types into one misleading badge");

const styles = read("assets/css/style.css");
const mapStyles = styles.slice(styles.indexOf(".map-viewer-layout"), styles.indexOf("/* ---------- Problem finder ---------- */"));
assert.match(styles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-stage\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*10;/, "the embedded viewport must avoid wasting a full screen on the square source texture");
assert.match(styles, /\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-canvas\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1;/, "the source map itself must remain square inside the shortened viewport");
assert.match(styles, /\.map-marker-native-icon\s*\{[\s\S]*?pointer-events:\s*none;/, "native glyphs must not steal marker interaction");
assert.doesNotMatch(styles, /map-marker-stack-count/, "dense native POI stacks must not add a numeric overlay to native icons");
assert.doesNotMatch(styles, /\.map-marker\s*\{[\s\S]*?transform:\s*scale\(calc\(1\s*\/\s*var\(--map-scale/, "map markers must scale with the map instead of shrinking relative to it");
assert.match(styles, /\.map-marker-has-native-icon::after\s*\{[\s\S]*?border-radius:\s*8px;/, "native glyph markers must use a compact badge instead of the generic circle");
assert.match(styles, /\.map-marker-has-native-icon \.map-marker-native-icon\s*\{[\s\S]*?width:\s*27px;[\s\S]*?height:\s*27px;/, "native glyphs must be the primary visible marker");
assert.match(styles, /\.map-stage\.map-labels-visible \.map-marker-has-native-icon span\s*\{[\s\S]*?opacity:\s*1;/, "native POI labels must be opt-in so the overview stays readable");
assert.match(styles, /\.map-stage\.map-labels-visible \.map-marker\[data-marker-stack-size\] span\s*\{[\s\S]*?opacity:\s*0;/, "stacked labels must collapse to one readable label instead of covering the map");
assert.doesNotMatch(styles, /\.map-stage-hud\s*\{/, "removed map HUD must not leave dead styles");
assert.match(styles, /\.map-stage-selection\s*\{[\s\S]*?position:\s*absolute;/, "selected marker summary must stay attached to the map stage");
assert.match(styles, /\.map-inspector\s*\{[\s\S]*?scroll-margin-top:\s*96px;/, "inspector jumps must clear the sticky header");
assert.match(styles, /\.map-stage:not\(\.is-zoomed\) \.map-marker-exact::after\s*\{[\s\S]*?width:\s*22px;[\s\S]*?height:\s*22px;/, "overview markers must use a compact visible symbol while preserving the 44px hit target");
assert.match(styles, /\.map-stage:not\(\.is-zoomed\) \.map-marker-has-native-icon \.map-marker-native-icon[\s\S]*?width:\s*22px;[\s\S]*?height:\s*22px;/, "overview native glyphs must remain readable without hiding nearby exact anchors");
assert.doesNotMatch(styles, /(?:^|\n)\.map-marker-evidence-reported::after\s*\{/, "site-collected exact anchors must not use an approximate-looking dashed ring");
assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.map-region-tabs\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[^}]*\}/, "mobile region controls must fit without an internal horizontal scrollbar");
assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.map-viewer-panel:not\(\.is-map-fullscreen\) \.map-pan-controls\s*\{\s*display:\s*none;/, "inline mobile maps should keep the toolbar compact by hiding pan arrows");
assert.match(styles, /@media \(max-width: 560px\)[\s\S]*?\.map-viewer-panel\.is-map-fullscreen \.map-pan-controls\s*\{\s*display:\s*flex;/, "fullscreen mobile maps must restore pan arrows");
assert.match(styles, /\.map-viewer-panel\.is-map-fullscreen \.map-secondary-actions,[\s\S]*?\.map-viewer-panel\.is-map-fullscreen \.map-source-note\s*\{\s*display:\s*none;/, "full-screen mode must remove secondary submission and source copy from the map workspace");
assert.match(styles, /\.map-region-tabs\s*\{[\s\S]*?border-radius:\s*10px;[\s\S]*?background:/, "region tabs must read as one segmented control");
assert.match(styles, /\.map-pan-controls,\s*\.map-zoom-controls\s*\{[\s\S]*?border-radius:\s*10px;[\s\S]*?background:/, "pan and zoom controls must read as grouped controls");
assert.match(styles, /\.map-expand-toggle\s*\{[\s\S]*?background:\s*var\(--green-700\);[\s\S]*?color:\s*#fff;/, "expand map must be the primary toolbar action");
assert.match(styles, /\.map-type-filters\s*\{[^}]*background:\s*var\(--color-surface\);/, "the unified native-icon filter must use a defined surface token");
assert.match(styles, /\.map-marker-type-filter\s*\{[^}]*background:\s*var\(--color-surface\);/, "native-icon filter buttons must retain a visible surface");
assert.match(styles, /\.map-marker-type-filter:hover,[\s\S]*?\.map-marker-type-filter\.active\s*\{[^}]*background:\s*var\(--cream-100\);/, "the active native-icon filter must use a defined selected surface");
assert.doesNotMatch(mapStyles, /var\(--cream-400\)/, "map controls must not depend on an undefined border token");
assert.match(styles, /-webkit-touch-callout:\s*none;/, "protected game art should deter long-press copying");

console.log("PASS: complete native map, exact POI layers and game-art safeguards are wired.");
