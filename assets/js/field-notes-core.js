(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RanchersFieldNotesCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function validateNote(note) {
    var errors = {};
    if (!clean(note.title)) errors.title = "Add a short title.";
    if (!clean(note.finding)) errors.finding = "Describe what you observed.";
    if (!clean(note.version)) errors.version = "Record the game version.";
    if (note.sourceType === "official" && !clean(note.sourceUrl)) {
      errors.sourceUrl = "Official claims need a source URL.";
    }
    return errors;
  }

  function filterNotes(notes, filters) {
    filters = filters || {};
    var query = clean(filters.query).toLowerCase();
    return notes.filter(function (note) {
      var searchable = [note.title, note.finding, note.version, note.location]
        .map(clean)
        .join(" ")
        .toLowerCase();
      return (!query || searchable.indexOf(query) !== -1) &&
        (!filters.type || note.type === filters.type) &&
        (!filters.stage || note.stage === filters.stage) &&
        (!filters.sourceType || note.sourceType === filters.sourceType);
    });
  }

  function csvCell(value) {
    var text = clean(value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function toCsv(notes) {
    var columns = [
      ["Title", "title"],
      ["Type", "type"],
      ["Stage", "stage"],
      ["Source", "sourceType"],
      ["Version", "version"],
      ["Location", "location"],
      ["Finding", "finding"],
      ["Source URL", "sourceUrl"]
    ];
    var lines = [columns.map(function (column) { return column[0]; }).join(",")];
    notes.forEach(function (note) {
      lines.push(columns.map(function (column) { return csvCell(note[column[1]]); }).join(","));
    });
    return lines.join("\r\n");
  }

  function normalizeNote(note, fallbackId) {
    var types = ["crop", "animal", "shop", "quest", "transport", "coop", "bug", "other"];
    var stages = ["lead", "observed", "reproduced", "official"];
    var sources = ["personal", "official", "community"];
    return {
      id: clean(note.id) || clean(fallbackId),
      title: clean(note.title),
      finding: clean(note.finding),
      type: types.indexOf(note.type) !== -1 ? note.type : "other",
      stage: stages.indexOf(note.stage) !== -1 ? note.stage : "lead",
      sourceType: sources.indexOf(note.sourceType) !== -1 ? note.sourceType : "personal",
      version: clean(note.version),
      location: clean(note.location),
      sourceUrl: clean(note.sourceUrl),
      createdAt: clean(note.createdAt)
    };
  }

  function parseBundle(raw) {
    var data = JSON.parse(raw);
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.notes)) {
      throw new Error("This is not a Field Notes version 1 export.");
    }
    var accepted = [];
    var rejected = 0;
    data.notes.forEach(function (candidate, index) {
      var note = normalizeNote(candidate || {}, "imported-" + index);
      if (Object.keys(validateNote(note)).length) rejected++;
      else accepted.push(note);
    });
    return { notes: accepted, rejected: rejected };
  }

  return {
    validateNote: validateNote,
    filterNotes: filterNotes,
    toCsv: toCsv,
    normalizeNote: normalizeNote,
    parseBundle: parseBundle
  };
});
