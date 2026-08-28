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
      .replace(/([\u3400-\u9fff])/g, " $1 ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function tokens(value) {
    return Array.from(new Set(normalize(value).split(/\s+/).filter(Boolean)));
  }

  var QUERY_STOP_WORDS = new Set([
    "a", "an", "are", "at", "buy", "can", "do", "does", "find", "for", "get",
    "how", "i", "in", "is", "me", "my", "of", "please", "the", "to", "was", "were", "where", "with",
    "为", "什", "么", "怎", "样", "如", "何", "哪", "里", "在", "多", "久", "的", "了", "是", "要", "能", "可", "以", "我", "被"
  ]);

  var QUERY_ALIASES = {
    hens: "chicken",
    hen: "chicken",
    poultry: "chicken",
    car: "vehicle",
    cars: "vehicle",
    veggies: "crop",
    vegetables: "crop"
  };

  function queryTokens(value) {
    var meaningful = tokens(value).filter(function (token) { return !QUERY_STOP_WORDS.has(token); });
    return Array.from(new Set(meaningful.map(function (token) { return QUERY_ALIASES[token] || token; })));
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
      return { text: section.text || text, score: score };
    }).sort(function (a, b) { return b.score - a.score; });

    var source = candidates.length && candidates[0].score > 0
      ? candidates[0].text
      : document.description || document.title || "";
    source = String(source).replace(/\s+/g, " ").trim();
    return source.length > 190 ? source.slice(0, 187).trimEnd() + "..." : source;
  }

  function scoreDocument(document, query, queryTerms) {
    var title = document.title || "";
    var parentTitle = document.parentTitle || "";
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
        fieldScore(parentTitle, term, 54),
        fieldScore(description, term, 42),
        sectionScore
      );
      if (!termScore) return 0;
      total += termScore;
    }

    var normalizedQuery = normalize(query);
    if (normalize(title) === normalizedQuery) total += 140;
    else if (normalize(title).indexOf(normalizedQuery) !== -1) total += 90;
    else if (normalize(description).indexOf(normalizedQuery) !== -1) total += 50;
    else if (sections.some(function (section) { return normalize(sectionText(section)).indexOf(normalizedQuery) !== -1; })) total += 30;
    return total;
  }

  function entryType(url) {
    if (url === "/zh/database/crops") return "作物数据";
    if (url === "/zh/database/animals") return "动物数据";
    if (url.indexOf("/zh/guides/") === 0) return "攻略步骤";
    if (url.indexOf("/zh/problems") === 0) return "排查步骤";
    if (url === "/zh/map") return "地点条目";
    if (url.indexOf("/zh/") === 0) return "知识条目";
    if (url === "/database/crops") return "Crop data";
    if (url === "/database/animals") return "Animal data";
    if (url.indexOf("/guides/") === 0) return "Guide step";
    if (url.indexOf("/problems") === 0) return "Problem step";
    if (url === "/map") return "Location entry";
    return "Knowledge entry";
  }

  function answerType(type) {
    if (type === "攻略") return "攻略答案";
    if (type === "问题排查") return "排查答案";
    if (type === "地图") return "地点答案";
    if (type === "数据库") return "数据库答案";
    if (type === "Guide") return "Guide answer";
    if (type === "Problem") return "Problem answer";
    if (type === "Map") return "Location answer";
    if (type === "Database") return "Database answer";
    return "Direct answer";
  }

  function sectionDocuments(document) {
    if (document.sectionAnswers === false) return [];
    var grouped = new Map();
    (document.sections || []).forEach(function (section) {
      if (!section.id) return;
      var key = section.id + "::" + (section.heading || document.title);
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: section.id,
          heading: section.heading || document.title,
          texts: []
        });
      }
      grouped.get(key).texts.push(section.text || "");
    });

    return Array.from(grouped.values()).map(function (section) {
      var text = section.texts.join(" ").replace(/\s+/g, " ").trim();
      return {
        title: section.heading,
        parentTitle: document.title,
        url: document.url + "#" + section.id,
        type: answerType(document.type),
        description: text,
        sections: [{ heading: section.heading, text: text }]
      };
    });
  }

  function expandEntryDocuments(document) {
    var page = Object.assign({}, document);
    delete page.entries;
    var entries = Array.isArray(document && document.entries) ? document.entries : [];
    return [page].concat(sectionDocuments(document), entries.map(function (entry) {
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
    var queryTerms = queryTokens(query);
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

  function dossierSupportsExactAnswer(entity, query, matches) {
    var exact = matches.filter(function (match) { return normalize(match.title) === normalize(query); });
    return !exact.length || exact.some(function (match) { return match.url === entity.route; });
  }

  function dossierFacts(entity) {
    var facts = entity.facts || [];
    var useful = facts.filter(function (fact) {
      return fact.validity !== 'unknown' || (fact.evidenceLevel === 'build-observed' && (fact.sourceIds || []).length > 0);
    });
    return (useful.length ? useful : facts).slice(0, 5);
  }

  function evidencePresentation(level, locale) {
    var labels = locale === 'zh'
      ? { official: '官方', 'video-observed': '视频观测', 'community-confirmed': '社区互证', 'unverified-lead': '单一线索', 'build-observed': '构建资料（未实测）' }
      : { official: 'Official', 'video-observed': 'Video-observed', 'community-confirmed': 'Community-confirmed', 'unverified-lead': 'Single-source lead', 'build-observed': 'Build data (not gameplay-tested)' };
    var classes = {official:'official', 'video-observed':'video', 'community-confirmed':'corroborated', 'build-observed':'build'};
    return {label: labels[level] || (locale === 'zh' ? '待验证' : 'Unverified'), className: classes[level] || 'lead'};
  }

  return {
    dossierSupportsExactAnswer: dossierSupportsExactAnswer,
    dossierFacts: dossierFacts,
    evidencePresentation: evidencePresentation,
    normalize: normalize,
    levenshtein: levenshtein,
    queryTokens: queryTokens,
    sectionDocuments: sectionDocuments,
    expandEntryDocuments: expandEntryDocuments,
    searchDocuments: searchDocuments,
  };
});
