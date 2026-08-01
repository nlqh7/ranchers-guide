const assert = require("node:assert/strict");
const fieldNotes = require("../assets/js/field-notes-core.js");

function testValidation() {
  const missing = fieldNotes.validateNote({
    title: "",
    finding: "",
    version: "",
    sourceType: "official",
    sourceUrl: ""
  });

  assert.deepEqual(missing, {
    title: "Add a short title.",
    finding: "Describe what you observed.",
    version: "Record the game version.",
    sourceUrl: "Official claims need a source URL."
  });

  const valid = fieldNotes.validateNote({
    title: "Offline mode opens",
    finding: "The main menu loaded while Steam was offline.",
    version: "0.8.10.455",
    sourceType: "personal",
    sourceUrl: ""
  });

  assert.deepEqual(valid, {});
}

testValidation();

function testFiltering() {
  const notes = [
    { title: "Corn sale", finding: "Sold at the market", type: "crop", stage: "observed", sourceType: "personal", version: "0.8.10.455" },
    { title: "Friend join", finding: "Worked after updating", type: "coop", stage: "reproduced", sourceType: "personal", version: "0.8.10.455" },
    { title: "Parking rule", finding: "Official notes list overnight parking", type: "transport", stage: "official", sourceType: "official", version: "0.8.10.420" }
  ];

  assert.deepEqual(
    fieldNotes.filterNotes(notes, { query: "market", type: "crop", stage: "observed" }).map(note => note.title),
    ["Corn sale"]
  );
  assert.deepEqual(
    fieldNotes.filterNotes(notes, { sourceType: "personal" }).map(note => note.title),
    ["Corn sale", "Friend join"]
  );
}

testFiltering();

function testCsvExport() {
  const csv = fieldNotes.toCsv([{
    title: "Corn, quality A",
    finding: "Yield was \"four\" items.",
    type: "crop",
    stage: "observed",
    sourceType: "personal",
    version: "0.8.10.455",
    location: "Market",
    sourceUrl: ""
  }]);

  assert.match(csv, /^Title,Type,Stage,Source,Version,Location,Finding,Source URL\r?\n/);
  assert.match(csv, /"Corn, quality A"/);
  assert.match(csv, /"Yield was ""four"" items\."/);
}

testCsvExport();

function testJsonImport() {
  const imported = fieldNotes.parseBundle(JSON.stringify({
    schemaVersion: 1,
    notes: [
      { id: "good", title: "Shop price", finding: "Observed a price.", version: "0.8.10.455", type: "shop", stage: "observed", sourceType: "personal" },
      { id: "bad", title: "", finding: "No title", version: "0.8.10.455", type: "crop", stage: "lead", sourceType: "community" }
    ]
  }));

  assert.equal(imported.notes.length, 1);
  assert.equal(imported.notes[0].id, "good");
  assert.equal(imported.rejected, 1);
}

testJsonImport();
console.log("PASS: Field Notes validates, filters, exports, and imports evidence records.");
