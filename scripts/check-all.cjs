const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const nodeChecks = [
  ["check-table-sorting.cjs"],
  ["build-animals.cjs", "--check"],
  ["check-wildlife-reference.cjs"],
  ["check-enemy-reference.cjs"],
  ["check-native-animal-reference.cjs"],
  ["build-crops.cjs", "--check"],
  ["build-database.cjs", "--check"],
  ["check-database-browser.cjs"],
  ["check-item-icons.cjs"],
  ["build-locations.cjs", "--check"],
  ["build-materials.cjs", "--check"],
  ["build-resource-reference.cjs", "--check"],
  ["check-resource-reference.cjs"],
  ["check-resource-answer-paths.cjs"],
  ["check-material-use-search.cjs"],
  ["check-seed-reference.cjs"],
  ["check-produce-reference.cjs"],
  ["check-placeable-reference.cjs"],
  ["check-misc-item-reference.cjs"],
  ["check-projectile-reference.cjs"],
  ["check-backpack-reference.cjs"],
  ["check-quest-vehicle-reference.cjs"],
  ["check-gigi-quest-search-promise.cjs"],
  ["build-vehicle-reference.cjs", "--check"],
  ["check-vehicle-reference.cjs"],
  ["check-world-service-reference.cjs"],
  ["build-fine-reference.cjs", "--check"],
  ["check-fine-reference.cjs"],
  ["check-police-drone-reference.cjs"],
  ["build-building-requirements.cjs", "--check"],
  ["build-crafting-reference.cjs", "--check"],
  ["build-backpack-reference.cjs", "--check"],
  ["check-crafting-reference.cjs"],
  ["check-recipe-plan.cjs"],
  ["check-recipe-plan-text.cjs"],
  ["build-shop-reference.cjs", "--check"],
  ["check-shop-reference.cjs"],
  ["build-equipment-reference.cjs", "--check"],
  ["check-equipment-reference.cjs"],
  ["build-consumable-reference.cjs", "--check"],
  ["check-consumable-reference.cjs"],
  ["build-farm-equipment.cjs", "--check"],
  ["check-farm-equipment.cjs"],
  ["check-fertilizer-reference.cjs"],
  ["build-customization.cjs", "--check"],
  ["check-customization-database.cjs"],
  ["build-knowledge-entities.cjs", "--check"],
  ["build-npc-entries.cjs", "--check"],
  ["check-npc-entries.cjs"],
  ["check-dialogue-coverage.cjs"],
  ["build-story-reference.cjs", "--check"],
  ["check-story-reference.cjs"],
  ["build-knowledge-index.cjs", "--check"],
  ["build-community.cjs", "--check"],
  ["build-creator-notes.cjs", "--check"],
  ["build-player-report.cjs", "--check"],
  ["build-search-index.cjs", "--check"],
  ["build-game-directory.cjs", "--check"],
  ["check-game-directory.cjs"],
  ["build-fs25.cjs", "--check"],
  ["check-fs25-planner.cjs"],
  ["check-fs25-v1.cjs"],
  ["check-adsense-sprint.cjs"],
  ["check-site-audit.cjs"],
  ["check-content-quality.cjs"],
  ["check-utility-surplus.cjs"],
  ["check-review-currentness.cjs"],
  ["check-key-remapping-answer.cjs"],
  ["check-adsense-content-surfaces.cjs"],
  ["check-beginners-guide.cjs"],
  ["build-beginner-tutorials.cjs", "--check"],
  ["check-animal-care-reference.cjs"],
  ["check-sleep-guide.cjs"],
  ["check-cashin-guide.cjs"],
  ["check-multiplayer-coop-content.cjs"],
  ["check-victor-hours-guide.cjs"],
  ["check-hoe-guide.cjs"],
  ["check-blueprint-building-guide.cjs"],
  ["check-police-pursuit-guide.cjs"],
  ["check-smartphone-guide.cjs"],
  ["check-smartphone-app-reference.cjs"],
  ["check-vehicle-operation-guide.cjs"],
  ["check-vehicle-recovery-guide.cjs"],
  ["check-missing-quest-npc.cjs"],
  ["check-ui-system.cjs"],
  ["check-animals.cjs"],
  ["check-animal-build-reference.cjs"],
  ["check-build-search.cjs"],
  ["build-animal-entries.cjs", "--check"],
  ["check-animal-entries.cjs"],
  ["build-crop-entries.cjs", "--check"],
  ["check-crop-entries.cjs"],
  ["build-building-entries.cjs", "--check"],
  ["check-building-entries.cjs"],
  ["build-b2-entries.cjs", "--check"],
  ["check-b2-entries.cjs"],
  ["check-chicken-troubleshooter.cjs"],
  ["check-chicken-disappearance-checklist.cjs"],
  ["check-community.cjs"],
  ["check-creator-notes.cjs"],
  ["check-player-report.cjs"],
  ["check-ranch-checklist.cjs"],
  ["check-quest-tracker.cjs"],
  ["check-quest-tracker-r29.cjs"],
  ["check-quest-tracker-behavior.cjs"],
  ["check-r31-material-quest-links.cjs"],
  ["check-r32-player-queries.cjs"],
  ["check-scarecrow-workbench-answer.cjs"],
  ["check-update-impact-tracker.cjs"],
  ["check-entity-journeys.cjs"],
  ["check-r9-answers.cjs"],
  ["check-crops.cjs"],
  ["check-field-notes.cjs"],
  ["check-home-card-links.cjs"],
  ["check-i18n.cjs"],
  ["check-bilingual-answers.cjs"],
  ["check-building-window-answer.cjs"],
  ["check-knowledge-entities.cjs"],
  ["check-relations.cjs"],
  ["check-local-server.cjs"],
  ["check-locations-data.cjs"],
  ["check-map.cjs"],
  ["check-native-map.cjs"],
  ["check-map-viewer.cjs"],
  ["check-materials.cjs"],
  ["check-navigation-state.cjs"],
  ["check-language-context.cjs"],
  ["check-page-navigation.cjs"],
  ["check-profit-calculator.cjs"],
  ["check-research-hub.cjs"],
  ["check-search.cjs"],
  ["check-search-game-scope.cjs"],
  ["check-public-release-profiles.cjs"],
  ["check-version-semantics.cjs"],
  ["check-phase2-tools.cjs"],
];

const powershellChecks = ["check-internal-links.ps1", "check-content-claims.ps1"];
let completed = 0;

const fs25PreviewFiles = [
  "games/fs25/index.html",
  "games/fs25/tools/production-planner/index.html",
  "zh/games/fs25/index.html",
  "zh/games/fs25/tools/production-planner/index.html",
].map((relative) => path.join(root, relative));
const fs25Present = fs25PreviewFiles.filter((file) => fs.existsSync(file));
if (fs25Present.length > 0 && fs25Present.length !== fs25PreviewFiles.length) {
  console.error(`FAIL: FS25 preview scope is incomplete (${fs25Present.length}/${fs25PreviewFiles.length} files present).`);
  process.exit(1);
}
if (fs25Present.length === 0) {
  const optionalFs25 = new Set(["build-fs25.cjs", "check-fs25-planner.cjs", "check-fs25-v1.cjs"]);
  for (let i = nodeChecks.length - 1; i >= 0; i -= 1) {
    if (optionalFs25.has(nodeChecks[i][0])) nodeChecks.splice(i, 1);
  }
  console.log("INFO: public-only scope; local FS25 preview checks are not required because no FS25 preview files are present.");
}

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    console.error(`FAIL: ${label}`);
    process.exit(result.status || 1);
  }
  completed += 1;
}

for (const [script, ...args] of nodeChecks) {
  run(process.execPath, [path.join(__dirname, script), ...args], script);
}

for (const script of powershellChecks) {
  run(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.join(__dirname, script)],
    script,
  );
}

console.log(`PASS: aggregate site QA completed ${completed} checks.`);
