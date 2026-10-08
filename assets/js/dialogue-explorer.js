/* R21-R28 dialogue explorer for the NPC story reference.
 * Progressive enhancement only: without JS the <details> preview works natively
 * and the spoiler gate/toolbar stay hidden. Contains no user-facing strings
 * (labels are server-rendered, so both locales stay correct).
 *
 * Behavior contract (R21-R28 acceptance rework):
 * - Default view, deep links and refreshes NEVER auto-expand the preview. A
 *   location-driven open first reveals the spoiler gate; only an explicit
 *   confirm (gate button or a direct summary click) opens and locates the node.
 *   Confirmation is tracked separately from history state, so a load event
 *   arriving after an early confirmation cannot close or re-gate the preview.
 * - Branch choices advance to the target node; the in-component back button
 *   returns to the previous node (per-details stack) and closes the preview
 *   when no previous node remains. Edge loops and missing targets are safe.
 * - Close/Escape/back stay on the current page: history.back() is only called
 *   when the current entry was pushed by this component (state[STATE_KEY]);
 *   popstate/hashchange only re-sync state, they never push or pop.
 * - The copy button reports the real clipboard Promise outcome and keeps a
 *   manual-copy field on rejection.
 */
(function () {
  'use strict';
  var roots = document.querySelectorAll('[data-dialogue-explorer]');
  if (!roots.length) return;
  var canHistory = Boolean(window.history && history.pushState && history.replaceState);
  var STATE_KEY = 'dialogueExplorer';

  function hashId() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch (_) { return ''; }
  }

  function urlWithoutHash() {
    return location.pathname + location.search;
  }

  function urlWithHash(id) {
    var url = new URL(location.href);
    url.hash = id;
    return url.href;
  }

  roots.forEach(function (root) {
    var detailsList = Array.prototype.slice.call(root.querySelectorAll('[data-dialogue-details]'));
    if (!detailsList.length) return;

    /* Per-details explorer state. */
    var explorers = detailsList.map(function (details) {
      var lines = Array.prototype.slice.call(details.querySelectorAll('[data-dialogue-node]'));
      var byNodeId = {};
      lines.forEach(function (line) {
        var nodeId = line.getAttribute('data-dialogue-node');
        if (nodeId != null && !byNodeId[nodeId]) byNodeId[nodeId] = line;
      });
      var gate = null;
      Array.prototype.forEach.call(root.querySelectorAll('[data-dialogue-gate]'), function (candidate) {
        if (candidate.getAttribute('data-dialogue-gate') === details.id) gate = candidate;
      });
      var backButtons = Array.prototype.slice.call(details.querySelectorAll('[data-dialogue-back]'));
      var copyButton = details.querySelector('[data-dialogue-copy]');
      /* Reveal the JS-only controls. */
      backButtons.forEach(function (button) { button.hidden = false; });
      if (copyButton) copyButton.hidden = false;
      return {
        details: details,
        lines: lines,
        byNodeId: byNodeId,
        gate: gate,
        backButtons: backButtons,
        copyButton: copyButton,
        copyStatus: details.querySelector('[data-dialogue-copy-status]'),
        copyDone: details.querySelector('[data-dialogue-copy-done]'),
        copyFailed: details.querySelector('[data-dialogue-copy-failed]'),
        copyField: details.querySelector('[data-dialogue-copy-field]'),
        stack: [],      /* previously visited line elements, oldest first */
        current: null,  /* currently located line element */
        historyPushed: false,
        confirmed: false /* explicit spoiler confirmation given for this details */
      };
    });

    function explorerFor(element) {
      for (var i = 0; i < explorers.length; i++) {
        if (explorers[i].details === element || explorers[i].details.contains(element)) return explorers[i];
      }
      return null;
    }

    /* True only when the current history entry was pushed by this component
     * for this details element — the only case where history.back() stays
     * on-site and simply undoes our own push. */
    function ownsCurrentEntry(details) {
      return Boolean(canHistory && history.state && history.state[STATE_KEY] === details.id && history.state.dialogueExplorerPush === true);
    }

    function markedState(details, pushed) {
      var state = {};
      state[STATE_KEY] = details.id;
      state.dialogueExplorerPush = Boolean(pushed);
      return state;
    }

    function focusSummary(details) {
      var summary = details.querySelector('summary');
      if (summary) summary.focus();
    }

    /* Resolve the location hash to { exp, line, id } when it targets this root. */
    function targetForHash() {
      var id = hashId();
      if (!id) return null;
      var el = document.getElementById(id);
      if (!el || !root.contains(el)) return null;
      for (var node = el; node && node !== root; node = node.parentElement) {
        if (node.tagName === 'DETAILS' && detailsList.indexOf(node) !== -1) {
          var line = el.hasAttribute && el.hasAttribute('data-dialogue-node') ? el : null;
          return { exp: explorerFor(node), line: line, id: id };
        }
      }
      return null;
    }

    function setCurrent(exp, line, scroll) {
      if (exp.current) exp.current.classList.remove('story-dialogue-line--current');
      exp.current = line || null;
      if (line) {
        line.classList.add('story-dialogue-line--current');
        if (scroll) line.scrollIntoView({ block: 'start' });
      }
    }

    function resetTrail(exp) {
      exp.stack = [];
      setCurrent(exp, null, false);
    }

    function showGate(exp) {
      if (exp.gate) exp.gate.hidden = false;
    }

    function hideGate(exp) {
      if (exp.gate) exp.gate.hidden = true;
    }

    /* Replace the current entry with a component-owned one pointing at the
     * current node, so refresh/copy keep the position without adding entries. */
    function markCurrentHash(exp) {
      if (!canHistory) return;
      var id = exp.current && exp.current.id ? exp.current.id : exp.details.id;
      history.replaceState(markedState(exp.details, exp.historyPushed), '', urlWithHash(id));
    }

    /* Explicit confirmation (gate button or direct summary click): open and
     * locate the linked node, pushing one component-owned history entry. */
    function confirmOpen(exp, scroll) {
      var target = targetForHash();
      var linked = target && target.exp === exp;
      exp.details.open = true;
      exp.confirmed = true;
      hideGate(exp);
      setCurrent(exp, (linked && target.line) || exp.lines[0] || null, Boolean(scroll && linked));
      if (canHistory) {
        var url = linked ? location.href : urlWithHash(exp.details.id);
        if (linked) {
          /* A direct deep link already has the correct hash. Mark it in place;
           * adding the same hash would make close() history.back() return to
           * the previous site, and popstate would immediately re-open it. */
          exp.historyPushed = false;
          history.replaceState(markedState(exp.details, false), '', url);
        } else {
          exp.historyPushed = true;
          history.pushState(markedState(exp.details, true), '', url);
        }
      }
    }

    function closeExplorer(exp, moveFocus) {
      var details = exp.details;
      if (!details.open) {
        if (moveFocus) focusSummary(details);
        return;
      }
      if (moveFocus) focusSummary(details);
      if (ownsCurrentEntry(details)) {
        history.back(); /* the popstate handler performs the close */
        return;
      }
      details.open = false;
      resetTrail(exp);
      if (canHistory) {
        var target = targetForHash();
        if (target && target.exp === exp) {
          /* Deep-linked/refreshed hash we never pushed: clear it in place so
           * the page stays put and a refresh does not re-gate immediately. */
          history.replaceState(history.state, '', urlWithoutHash());
          hideGate(exp);
        }
      }
    }

    /* History navigation (browser/gesture back) and manual hash edits: re-sync
     * only, never push/pop, so popstate/hashchange/refresh cannot recurse.
     * An open preview is kept (bfcache restore, hash edits while open), but a
     * closed one never auto-opens — even a refreshed component-owned entry
     * goes through the spoiler gate again. */
    function syncFromLocation() {
      var target = targetForHash();
      explorers.forEach(function (exp) {
        var isTarget = Boolean(target && target.exp === exp);
        if (isTarget && exp.details.open) {
          hideGate(exp);
          if (target.line) setCurrent(exp, target.line, true);
          return;
        }
        if (isTarget) {
          /* Deep link / refresh / unowned hash: spoiler gate first, never auto-open. */
          exp.details.open = false;
          resetTrail(exp);
          showGate(exp);
          return;
        }
        exp.details.open = false;
        exp.historyPushed = false;
        exp.confirmed = false;
        resetTrail(exp);
        hideGate(exp);
      });
    }

    explorers.forEach(function (exp) {
      var details = exp.details;
      var summary = details.querySelector('summary');
      if (summary) {
        /* Intercept the native toggle so opening/closing always goes through
         * the component's history rules. Keyboard activation of <summary>
         * fires click, so keyboard and screen-reader use stays intact. */
        summary.addEventListener('click', function (event) {
          event.preventDefault();
          if (details.open) closeExplorer(exp, false);
          else confirmOpen(exp, false);
        });
      }

      /* Fragment navigation may toggle <details> after load. If the spoiler
       * gate is still visible, that toggle is browser-driven and must not
       * reveal the content before explicit confirmation. */
      details.addEventListener('toggle', function () {
        if (details.open && exp.gate && !exp.historyPushed && !exp.gate.hidden) {
          details.open = false;
        }
      });

      exp.backButtons.forEach(function (button) {
        button.addEventListener('click', function () {
          if (exp.stack.length) {
            /* Back to the previous node; loop-safe because entries are only
             * ever pushed on explicit choice clicks. */
            setCurrent(exp, exp.stack.pop(), true);
            markCurrentHash(exp);
          } else {
            closeExplorer(exp, true);
          }
        });
      });

      if (exp.copyButton) {
        exp.copyButton.addEventListener('click', function () {
          var id = exp.current && exp.current.id ? exp.current.id : exp.details.id;
          var url = urlWithHash(id);
          var showOutcome = function (copied) {
            if (!exp.copyStatus) return;
            exp.copyStatus.hidden = false;
            if (exp.copyDone) exp.copyDone.hidden = !copied;
            if (exp.copyFailed) exp.copyFailed.hidden = copied;
            if (exp.copyField) {
              exp.copyField.hidden = copied;
              if (!copied) {
                /* Manual-copy access on rejection, with the exact link. */
                exp.copyField.value = url;
                exp.copyField.focus();
                exp.copyField.select();
              }
            }
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () { showOutcome(true); }, function () { showOutcome(false); });
          } else {
            showOutcome(false);
          }
        });
      }

      if (exp.gate) {
        var openButton = exp.gate.querySelector('[data-dialogue-gate-open]');
        var dismissButton = exp.gate.querySelector('[data-dialogue-gate-dismiss]');
        if (openButton) {
          openButton.addEventListener('click', function () { confirmOpen(exp, true); });
        }
        if (dismissButton) {
          dismissButton.addEventListener('click', function () {
            hideGate(exp);
            if (canHistory) {
              var target = targetForHash();
              if (target && target.exp === exp) history.replaceState(null, '', urlWithoutHash());
            }
          });
        }
      }
    });

    /* Branch choice: advance to the target node. Falls back to the plain anchor
     * when the target is not a recorded node (bad data stays a harmless jump). */
    root.addEventListener('click', function (event) {
      var choice = event.target.closest ? event.target.closest('.story-dialogue-choice') : null;
      if (!choice || !root.contains(choice)) return;
      var exp = explorerFor(choice);
      if (!exp || !exp.details.open) return;
      var targetId = choice.getAttribute('data-dialogue-target');
      var line = targetId != null ? exp.byNodeId[targetId] : null;
      if (!line) return;
      event.preventDefault();
      if (exp.current && exp.current !== line && exp.stack.indexOf(exp.current) === -1) {
        exp.stack.push(exp.current);
      }
      setCurrent(exp, line, true);
      markCurrentHash(exp);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      for (var i = explorers.length - 1; i >= 0; i--) {
        if (explorers[i].details.open) {
          event.preventDefault();
          closeExplorer(explorers[i], true);
          return;
        }
      }
    });

    if (canHistory) window.addEventListener('popstate', syncFromLocation);
    window.addEventListener('hashchange', syncFromLocation);
    /* Fragment navigation can make a closed <details> appear open before the
     * script runs. Normalize that browser behavior so a direct hash still
     * shows the spoiler gate first. */
    explorers.forEach(function (exp) {
      exp.details.open = false;
      exp.historyPushed = false;
      exp.confirmed = false;
      resetTrail(exp);
    });
    syncFromLocation();
    /* Some browsers apply fragment-to-details expansion after deferred
     * scripts run. Re-apply the gate on the next task so a direct hash cannot
     * bypass the explicit spoiler confirmation. An explorer the user already
     * confirmed is excluded: a late load must never close or re-gate it
     * (confirmation is tracked separately from historyPushed, which stays
     * false for in-place deep-link marking). */
    function forceInitialGate() {
      explorers.forEach(function (exp) {
        if (!exp.historyPushed && !exp.confirmed) exp.details.open = false;
      });
      syncFromLocation();
    }
    setTimeout(forceInitialGate, 0);
    window.addEventListener('load', function () { setTimeout(forceInitialGate, 0); });
  });
})();
