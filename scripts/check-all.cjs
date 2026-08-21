const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const nodeChecks = [
  ["build-animals.cjs", "--check"],
  ["build-crops.cjs", "--check"],
  ["build-locations.cjs", "--check"],
  ["build-materials.cjs", "--check"],
  ["build-knowledge-entities.cjs", "--check"],
  ["build-knowledge-index.cjs", "--check"],
  ["build-community.cjs", "--check"],
  ["build-player-report.cjs", "--check"],
  ["build-search-index.cjs", "--check"],
  ["check-site-audit.cjs"],
  ["check-content-quality.cjs"],
  ["check-ui-system.cjs"],
  ["check-animals.cjs"],
  ["check-chicken-troubleshooter.cjs"],
  ["check-community.cjs"],
  ["check-player-report.cjs"],
  ["check-ranch-checklist.cjs"],
  ["check-quest-tracker.cjs"],
  ["check-entity-journeys.cjs"],
  ["check-crops.cjs"],
  ["check-field-notes.cjs"],
  ["check-home-card-links.cjs"],
  ["check-i18n.cjs"],
  ["check-knowledge-entities.cjs"],
  ["check-relations.cjs"],
  ["check-local-server.cjs"],
  ["check-locations-data.cjs"],
  ["check-map.cjs"],
  ["check-materials.cjs"],
  ["check-navigation-state.cjs"],
  ["check-page-navigation.cjs"],
  ["check-profit-calculator.cjs"],
  ["check-research-hub.cjs"],
  ["check-search.cjs"],
  ["check-version-semantics.cjs"],
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
