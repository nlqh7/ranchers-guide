/* The Ranchers Guide - local Field Notes workspace */
(function () {
  "use strict";

  var core = window.RanchersFieldNotesCore;
  var form = document.getElementById("field-note-form");
  var list = document.getElementById("field-note-list");
  if (!core || !form || !list) return;

  var STORAGE_KEY = "ranchers-field-notes-v1";
  var notes = [];
  var editingId = "";
  var filters = {
    query: document.getElementById("notes-search"),
    type: document.getElementById("notes-type-filter"),
    stage: document.getElementById("notes-stage-filter")
  };
  var stageLabels = {
    lead: "Lead",
    observed: "Observed once",
    reproduced: "Reproduced",
    official: "Official"
  };
  var typeLabels = {
    crop: "Crop",
    animal: "Animal",
    shop: "Shop / price",
    quest: "Quest",
    transport: "Transport",
    coop: "Co-op",
    bug: "Bug / workaround",
    other: "Other"
  };
  var sourceLabels = {
    personal: "Personal observation",
    official: "Official source",
    community: "Community lead"
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function load() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      notes = Array.isArray(stored) ? stored.map(function (note, index) {
        return core.normalizeNote(note, "stored-" + index);
      }) : [];
    } catch (error) {
      notes = [];
      setStatus("Saved notes could not be read. A new local notebook has started.", true);
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      setStatus("This browser could not save the notebook. Export a backup before leaving.", true);
    }
  }

  function setStatus(message, isError) {
    var status = document.getElementById("field-note-status");
    status.textContent = message || "";
    status.classList.toggle("error", Boolean(isError));
  }

  function clearErrors() {
    ["title", "finding", "version", "sourceUrl"].forEach(function (field) {
      document.getElementById("note-" + field + "-error").textContent = "";
      var input = field === "sourceUrl" ? form.elements.sourceUrl : form.elements[field];
      input.removeAttribute("aria-invalid");
    });
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach(function (field) {
      document.getElementById("note-" + field + "-error").textContent = errors[field];
      var input = field === "sourceUrl" ? form.elements.sourceUrl : form.elements[field];
      input.setAttribute("aria-invalid", "true");
    });
    var firstField = Object.keys(errors)[0];
    if (firstField) {
      (firstField === "sourceUrl" ? form.elements.sourceUrl : form.elements[firstField]).focus();
    }
  }

  function readForm() {
    return core.normalizeNote({
      id: editingId || "note-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      title: form.elements.title.value,
      finding: form.elements.finding.value,
      type: form.elements.type.value,
      stage: form.elements.stage.value,
      sourceType: form.elements.sourceType.value,
      version: form.elements.version.value,
      location: form.elements.location.value,
      sourceUrl: form.elements.sourceUrl.value,
      createdAt: editingId ? (notes.find(function (note) { return note.id === editingId; }) || {}).createdAt : new Date().toISOString()
    });
  }

  function resetForm() {
    editingId = "";
    form.reset();
    form.elements.version.value = "0.8.10.562";
    document.getElementById("field-note-form-title").textContent = "Add a field note";
    document.getElementById("field-note-submit").textContent = "Save field note";
    document.getElementById("field-note-cancel").hidden = true;
    clearErrors();
  }

  function updateStats() {
    document.getElementById("stat-total").textContent = notes.length;
    document.getElementById("stat-leads").textContent = notes.filter(function (note) { return note.stage === "lead"; }).length;
    document.getElementById("stat-tested").textContent = notes.filter(function (note) { return note.stage === "observed" || note.stage === "reproduced"; }).length;
    document.getElementById("stat-official").textContent = notes.filter(function (note) { return note.stage === "official"; }).length;
  }

  function render() {
    updateStats();
    var visible = core.filterNotes(notes, {
      query: filters.query.value,
      type: filters.type.value,
      stage: filters.stage.value
    });

    if (!visible.length) {
      list.innerHTML = notes.length
        ? '<div class="field-note-empty"><strong>No matching notes</strong><p>Clear a filter or try a broader search.</p></div>'
        : '<div class="field-note-empty"><strong>No evidence recorded yet</strong><p>Add one observation from your current build. A careful single note is more useful than a copied list.</p></div>';
      return;
    }

    list.innerHTML = visible.map(function (note) {
      var source = note.sourceUrl
        ? '<a href="' + esc(note.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(sourceLabels[note.sourceType]) + '</a>'
        : esc(sourceLabels[note.sourceType]);
      return '<article class="field-note-card">' +
        '<div class="field-note-card-head"><div>' +
          '<span class="evidence-stage ' + esc(note.stage) + '">' + esc(stageLabels[note.stage]) + '</span>' +
          '<span class="field-note-type">' + esc(typeLabels[note.type]) + '</span>' +
          '<h3>' + esc(note.title) + '</h3>' +
        '</div><div class="field-note-card-actions">' +
          '<button type="button" class="icon-btn" data-action="edit" data-id="' + esc(note.id) + '" title="Edit note" aria-label="Edit ' + esc(note.title) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>' +
          '</button>' +
          '<button type="button" class="icon-btn destructive" data-action="delete" data-id="' + esc(note.id) + '" title="Delete note" aria-label="Delete ' + esc(note.title) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>' +
          '</button>' +
        '</div></div>' +
        '<p>' + esc(note.finding) + '</p>' +
        '<dl class="field-note-meta">' +
          '<div><dt>Build</dt><dd>' + esc(note.version) + '</dd></div>' +
          (note.location ? '<div><dt>Conditions</dt><dd>' + esc(note.location) + '</dd></div>' : '') +
          '<div><dt>Source</dt><dd>' + source + '</dd></div>' +
        '</dl>' +
      '</article>';
    }).join("");
  }

  function editNote(id) {
    var note = notes.find(function (candidate) { return candidate.id === id; });
    if (!note) return;
    editingId = id;
    Object.keys(note).forEach(function (key) {
      if (form.elements[key]) form.elements[key].value = note[key];
    });
    document.getElementById("field-note-form-title").textContent = "Edit field note";
    document.getElementById("field-note-submit").textContent = "Update field note";
    document.getElementById("field-note-cancel").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.elements.title.focus({ preventScroll: true });
  }

  function downloadFile(filename, content, mimeType) {
    var url = URL.createObjectURL(new Blob([content], { type: mimeType }));
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var note = readForm();
    var errors = core.validateNote(note);
    if (Object.keys(errors).length) {
      showErrors(errors);
      setStatus("Fix the highlighted evidence fields.", true);
      return;
    }

    if (editingId) {
      notes = notes.map(function (candidate) { return candidate.id === editingId ? note : candidate; });
      setStatus("Field note updated.", false);
    } else {
      notes.unshift(note);
      setStatus("Field note saved on this device.", false);
    }
    save();
    resetForm();
    render();
  });

  form.elements.sourceType.addEventListener("change", function () {
    if (form.elements.sourceType.value === "official") form.elements.stage.value = "official";
  });

  document.getElementById("field-note-cancel").addEventListener("click", function () {
    resetForm();
    setStatus("Edit cancelled.", false);
  });

  list.addEventListener("click", function (event) {
    var button = event.target.closest("[data-action]");
    if (!button) return;
    var id = button.getAttribute("data-id");
    if (button.getAttribute("data-action") === "edit") editNote(id);
    else {
      notes = notes.filter(function (note) { return note.id !== id; });
      save();
      render();
      setStatus("Field note deleted.", false);
    }
  });

  Object.keys(filters).forEach(function (key) {
    filters[key].addEventListener(key === "query" ? "input" : "change", render);
  });

  document.getElementById("export-json").addEventListener("click", function () {
    downloadFile("the-ranchers-field-notes.json", JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      notes: notes
    }, null, 2), "application/json");
  });

  document.getElementById("export-csv").addEventListener("click", function () {
    downloadFile("the-ranchers-field-notes.csv", core.toCsv(notes), "text/csv;charset=utf-8");
  });

  document.getElementById("import-json").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var imported = core.parseBundle(reader.result);
        var existingIds = new Set(notes.map(function (note) { return note.id; }));
        imported.notes.forEach(function (note) {
          if (existingIds.has(note.id)) note.id = "imported-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
          notes.push(note);
          existingIds.add(note.id);
        });
        save();
        render();
        setStatus("Imported " + imported.notes.length + " notes" + (imported.rejected ? "; rejected " + imported.rejected + " incomplete records." : "."), false);
      } catch (error) {
        setStatus(error.message || "The selected file could not be imported.", true);
      }
      event.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("clear-field-notes").addEventListener("click", function () {
    if (!notes.length) return;
    if (!window.confirm("Delete every local field note? Export a backup first if you need one.")) return;
    notes = [];
    save();
    resetForm();
    render();
    setStatus("All local field notes were deleted.", false);
  });

  load();
  render();
})();
