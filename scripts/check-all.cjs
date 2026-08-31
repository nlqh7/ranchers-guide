const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const nodeChecks = [
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
  ["check-seed-reference.cjs"],
  ["check-produce-reference.cjs"],
  ["check-placeable-reference.cjs"],
  ["check-misc-item-reference.cjs"],
  ["check-projectile-reference.cjs"],
  ["check-backpack-reference.cjs"],
  ["check-quest-vehicle-reference.cjs"],
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
  ["build-knowledge-index.cjs", "--check"],
  ["build-community.cjs", "--check"],
  ["build-creator-notes.cjs", "--check"],
  ["build-player-report.cjs", "--check"],
  ["build-search-index.cjs", "--check"],
  ["check-site-audit.cjs"],
  ["check-content-quality.cjs"],
  ["check-ui-system.cjs"],
  ["check-animals.cjs"],
  ["check-animal-build-reference.cjs"],
  ["check-build-search.cjs"],
  ["check-chicken-troubleshooter.cjs"],
  ["check-chicken-disappearance-checklist.cjs"],
  ["check-community.cjs"],
  ["check-creator-notes.cjs"],
  ["check-player-report.cjs"],
  ["check-ranch-checklist.cjs"],
  ["check-quest-tracker.cjs"],
  ["check-scarecrow-workbench-answer.cjs"],
  ["check-update-impact-tracker.cjs"],
  ["check-entity-journeys.cjs"],
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
  ["check-page-navigation.cjs"],
  ["check-profit-calculator.cjs"],
  ["check-research-hub.cjs"],
  ["check-search.cjs"],
  ["check-version-semantics.cjs"],
  ["check-phase2-tools.cjs"],
];

const powershellChecks = ["check-internal-links.ps1", "check-content-claims.ps1"];
let completed = 0;

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
