(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RanchersSearch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/([a-z0-9])[-–—]([a-z0-9])/g, "$1$2")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function tokens(value) {
    return Array.from(new Set(normalize(value).split(/\s+/).filter(Boolean)));
  }

  function levenshtein(left, right) {
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    var previous = Array.from({ length: right.length + 1 }, function (_, index) { return index; });
    for (var i = 1; i <= left.length; i += 1) {
      var current = [i];
      for (var j = 1; j <= right.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
        );
      }
      previous = current;
    }
    return previous[right.length];
  }

  function editDistance(left, right) {
    var rows = Array.from({ length: left.length + 1 }, function () {
      return Array(right.length + 1).fill(0);
    });
    for (var i = 0; i <= left.length; i += 1) rows[i][0] = i;
    for (var j = 0; j <= right.length; j += 1) rows[0][j] = j;

    for (i = 1; i <= left.length; i += 1) {
      for (j = 1; j <= right.length; j += 1) {
        var cost = left[i - 1] === right[j - 1] ? 0 : 1;
        rows[i][j] = Math.min(
          rows[i - 1][j] + 1,
          rows[i][j - 1] + 1,
          rows[i - 1][j - 1] + cost
        );
        if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
          rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
        }
      }
    }
    return rows[left.length][right.length];
  }

  function wordForms(word) {
    var forms = [word];
    if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) forms.push(word.slice(0, -1));
    if (word.length > 5 && word.endsWith("ies")) forms.push(word.slice(0, -3) + "y");
    return Array.from(new Set(forms));
  }

  function fuzzyWordScore(words, term) {
    var best = 0;
    var termForms = wordForms(term);
    for (var i = 0; i < words.length; i += 1) {
      var forms = wordForms(words[i]);
      for (var f = 0; f < forms.length; f += 1) {
        for (var t = 0; t < termForms.length; t += 1) {
          var word = forms[f];
          var queryWord = termForms[t];
          if (word === queryWord) return 1;
          if (word.indexOf(queryWord) === 0) best = Math.max(best, 0.88);
          else if (queryWord.indexOf(word) === 0 && word.length >= 4) best = Math.max(best, 0.72);

          var allowed = queryWord.length <= 5 ? 1 : queryWord.length <= 8 ? 2 : 3;
          if (Math.abs(word.length - queryWord.length) <= allowed) {
            var distance = editDistance(word, queryWord);
            if (distance <= allowed) {
              best = Math.max(best, 1 - distance / Math.max(word.length, queryWord.length));
            }
          }
        }
      }
    }
    return best >= 0.78 ? best : 0;
  }

  function fieldScore(value, term, weight) {
    var normalized = normalize(value);
    if (!normalized) return 0;
    if (normalized.indexOf(term) !== -1) return weight;
    return fuzzyWordScore(tokens(normalized), term) * weight * 0.72;
  }

  function sectionText(section) {
    return [section.heading || "", section.text || ""].join(" ");
  }

  function bestSnippet(document, queryTerms) {
    var candidates = (document.sections || []).map(function (section) {
      var text = sectionText(section);
      var score = queryTerms.reduce(function (sum, term) {
        return sum + fieldScore(text, term, 1);
      }, 0);
      return { text: text, score: score };
    }).sort(function (a, b) { return b.score - a.score; });

    var source = candidates.length && candidates[0].score > 0
      ? candidates[0].text
      : document.description || document.title || "";
    source = String(source).replace(/\s+/g, " ").trim();
    return source.length > 190 ? source.slice(0, 187).trimEnd() + "..." : source;
  }

  function scoreDocument(document, query, queryTerms) {
    var title = document.title || "";
    var description = document.description || "";
    var sections = document.sections || [];
    var total = 0;

    for (var i = 0; i < queryTerms.length; i += 1) {
      var term = queryTerms[i];
      var sectionScore = sections.reduce(function (best, section) {
        return Math.max(best, fieldScore(sectionText(section), term, 26));
      }, 0);
      var termScore = Math.max(
        fieldScore(title, term, 70),
        fieldScore(description, term, 42),
        sectionScore
      );
      if (!termScore) return 0;
      total += termScore;
    }

    var normalizedQuery = normalize(query);
    if (normalize(title).indexOf(normalizedQuery) !== -1) total += 90;
    else if (normalize(description).indexOf(normalizedQuery) !== -1) total += 50;
    else if (sections.some(function (section) { return normalize(sectionText(section)).indexOf(normalizedQuery) !== -1; })) total += 30;
    return total;
  }

  function entryType(url) {
    if (url === "/database/crops") return "Crop data";
    if (url === "/database/animals") return "Animal data";
    return "Database entry";
  }

  function expandEntryDocuments(document) {
    var page = Object.assign({}, document);
    delete page.entries;
    var entries = Array.isArray(document && document.entries) ? document.entries : [];
    return [page].concat(entries.map(function (entry) {
      var status = entry.status || "Community data";
      var text = [status, entry.text || ""].filter(Boolean).join(": ");
      return {
        title: entry.title || document.title,
        url: document.url + "#" + entry.id,
        type: entryType(document.url),
        description: text,
        sections: [{ heading: entry.tags || entry.title || "Data", text: text }]
      };
    }));
  }

  function searchDocuments(documents, query, limit) {
    var queryTerms = tokens(query);
    if (!queryTerms.length) return [];

    return (documents || []).map(function (document) {
      var score = scoreDocument(document, query, queryTerms);
      if (!score) return null;
      return Object.assign({}, document, {
        score: Math.round(score * 100) / 100,
        snippet: bestSnippet(document, queryTerms),
      });
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score || a.title.localeCompare(b.title);
    }).slice(0, typeof limit === "number" ? limit : 12);
  }

  return {
    normalize: normalize,
    levenshtein: levenshtein,
    expandEntryDocuments: expandEntryDocuments,
    searchDocuments: searchDocuments,
  };
});
