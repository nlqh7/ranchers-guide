/* R21-R23 NPC story reference renderer (bilingual-safe).
 * Pure string renderer: no fs, no generated-file writes. Read-only access to
 * data/dialogue-scenes.json for the recorded dialogue nodes/edges.
 *
 * Integration contract for the data generator (e.g. build-npc-entries.cjs):
 *
 *   const { renderNpcStory, storyReferenceAssets, storySearchText } = require('./render-npc-story.cjs');
 *   const storyHtml = renderNpcStory(npcRecord, {
 *     locale: 'en' | 'zh',
 *     services: [ // "what the player can do" — from data/dialogue-services.json
 *       { id, name, zhName, summary, zhSummary, evidenceLevel }
 *     ],
 *     quests: [   // related quest links — from data/quests.json records
 *       { id, name, zhName }
 *     ],
 *     dialogue: { // optional spoiler-safe preview; omit to skip the block
 *       status: 'configured' | 'playable',
 *       sourceLabel: 'Site-collected · build configuration · owned-build-dialogue',
 *       zhSourceLabel: '本站整理 · 构建配置 · owned-build-dialogue',
 *       build: '0.8.10.842'
 *     }
 *   });
 *
 * Dialogue lines are rendered exclusively from the recorded scene data
 * (data/dialogue-scenes.json: groups[].nodes[].speaker/zhSpeaker/text/zhText/
 * sourceRef and groups[].edges[].from/to/label/zhLabel). Scene and group
 * summaries are shown only as labelled editorial overviews, never as NPC
 * speech. Conditions are displayed as static choice summaries, never executed.
 *
 * Rules for the embedding generator:
 * - The returned markup contains no <section> and no data-search-entry, so it is
 *   safe to embed inside the existing <section class="entity-profile" data-search-entry>.
 * - Search previews must stay spoiler-free: when a dialogue preview is embedded
 *   inside a search entry, set that entry's data-search-text to storySearchText(npc, locale)
 *   (or keep the dialogue block outside the search entry). Never put dialogue
 *   lines into data-search-tags.
 * - Each page that embeds this block must include storyReferenceAssets(versionToken)
 *   in <head>: story-reference.css plus dialogue-explorer.js (defer). Without JS
 *   the <details> preview still works natively (no-JS static fallback) and the
 *   spoiler gate/toolbar stay hidden.
 * - R21-R28 interaction contract: default view, deep links and refreshes never
 *   auto-expand the preview — a location-driven open first reveals the spoiler
 *   gate; only an explicit confirm opens and locates the linked node. Branch
 *   choices advance to the target node, the in-component back returns to the
 *   previous node, and close/Escape/back stay on the page. Node lines carry an
 *   official-text/editorial provenance tag; unknown conditions are shown as
 *   readable notes, never executed.
 */
function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

const labels = {
  en: {
    heading: 'Story & services at a glance',
    actionsTitle: 'Recorded services & interactions',
    questsTitle: 'Related quests',
    questsAria: 'Related quests',
    dialogueTitle: 'Dialogue preview',
    dialogueHintConfigured: 'Configured build text · may contain spoilers',
    dialogueHintPlayable: 'Player-verified route text · contains spoilers',
    statusConfigured: 'Game-build configuration',
    statusPlayable: 'Player-verified route',
    sourcePrefix: 'Source',
    buildPrefix: 'Build',
    overviewLabel: 'Editorial overview',
    excerptLabel: 'Editorial excerpt',
    nodePrefix: 'Node',
    officialLine: 'Recorded dialogue excerpt',
    officialTranslation: 'Editorial translation of the recorded line',
    fallbackToEnglish: 'no recorded Chinese line — recorded English excerpt shown',
    fallbackToChinese: 'no recorded English line — recorded Chinese excerpt shown',
    conditionLabel: 'Condition (shown as recorded, never executed)',
    exitsTitle: 'Known follow-up exits',
    exitNote: 'not recorded in this preview',
    gateText: 'This link points into recorded dialogue that may contain spoilers. It stays closed until you confirm.',
    gateOpen: 'Show dialogue and jump to the linked line',
    gateDismiss: 'Keep it closed',
    copyNode: 'Copy link to current node',
    copyDone: 'Link copied.',
    copyFailed: 'Automatic copy failed — copy this link manually:',
    copyFieldLabel: 'Dialogue node link for manual copy',
    back: '← Back',
  },
  zh: {
    heading: '人物故事与服务速览',
    actionsTitle: '已记录的服务与互动',
    questsTitle: '相关任务',
    questsAria: '相关任务',
    dialogueTitle: '对话预览',
    dialogueHintConfigured: '构建配置文本 · 可能含剧透',
    dialogueHintPlayable: '玩家实测路线文本 · 含剧透',
    statusConfigured: '游戏构建配置',
    statusPlayable: '玩家实测路线',
    sourcePrefix: '来源',
    buildPrefix: '版本',
    overviewLabel: '编辑概述',
    excerptLabel: '编辑节选',
    nodePrefix: '节点',
    officialLine: '已记录对话节选（非逐字转录）',
    officialTranslation: '编辑翻译（按已记录节点整理）',
    fallbackToEnglish: '暂无中文记录——显示已记录的英文节选',
    fallbackToChinese: '暂无英文记录——显示已记录的中文节选',
    conditionLabel: '条件说明（按记录展示，本站不执行）',
    exitsTitle: '已知后续出口',
    exitNote: '本预览未收录',
    gateText: '此链接指向已记录的对话内容，可能包含剧透。确认之前不会展开。',
    gateOpen: '展开对话并定位到对应节点',
    gateDismiss: '保持关闭',
    copyNode: '复制当前节点位置链接',
    copyDone: '链接已复制。',
    copyFailed: '自动复制失败——请手动复制以下链接：',
    copyFieldLabel: '供手动复制的对话节点链接',
    back: '← 返回',
  },
};

/* Recorded dialogue scenes (read-only). Lines come only from these real
 * nodes/edges; a caller-supplied summary is never rendered as speech. */
let recordedScenes = [];
try {
  const sceneData = require('../data/dialogue-scenes.json');
  recordedScenes = Array.isArray(sceneData.scenes) ? sceneData.scenes : [];
} catch (_) {
  recordedScenes = [];
}

function nodeAnchorId(npcId, ref) {
  return `dialogue-node-${npcId}-${String(ref == null ? '' : ref).replace(/[^A-Za-z0-9_-]+/g, '-')}`;
}

function safeNpcSummary(npc, locale) {
  if (npc && npc.id === 'gigi') {
    return locale === 'zh'
      ? '与当前大鸡蛋任务相关的人物；展开对话预览后查看已记录节点。'
      : 'NPC associated with the current large-egg task; expand the dialogue preview for recorded nodes.';
  }
  return locale === 'zh' ? (npc.zhSummary || npc.summary) : npc.summary;
}

function safeNpcWhenNeeded(npc, locale) {
  if (npc && npc.id === 'gigi') {
    return locale === 'zh'
      ? '需要查找大鸡蛋任务交付或已记录的人物节点时查看 Gigi。'
      : 'Look up Gigi when you need the large-egg hand-off or a recorded NPC node.';
  }
  return locale === 'zh' ? (npc.zhWhenNeeded || npc.whenNeeded) : npc.whenNeeded;
}

function renderDialogueGroup(npcId, group, zh, t) {
  const groupLabel = zh ? (group.zhLabel || group.label) : group.label;
  const overview = zh ? (group.zhOverview || group.overview) : group.overview;
  const heading = groupLabel ? `<h5 class="story-dialogue-group-title">${escapeHtml(groupLabel)}</h5>` : '';
  const overviewHtml = overview
    ? `<p class="story-dialogue-overview"><strong>${t.overviewLabel}:</strong> ${escapeHtml(overview)}</p>` : '';
  const nodes = Array.isArray(group.nodes) ? group.nodes.filter((node) => node && node.id != null) : [];
  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const refByNodeId = new Map(nodes.map((node) => [String(node.id), node.sourceRef || node.id]));
  const outgoing = new Map();
  const exits = [];
  (Array.isArray(group.edges) ? group.edges : []).forEach((edge) => {
    if (!edge || edge.from == null || edge.to == null) return;
    const from = String(edge.from);
    const to = String(edge.to);
    if (!nodeIds.has(from)) return; /* bad edge: unknown origin — skip safely */
    if (nodeIds.has(to)) {
      if (!outgoing.has(from)) outgoing.set(from, []);
      outgoing.get(from).push(edge);
    } else {
      exits.push(edge); /* known follow-up exit beyond the recorded path */
    }
  });

  const lines = nodes.map((node) => {
    const ref = node.sourceRef || node.id;
    const speaker = zh ? (node.zhSpeaker || node.speaker) : node.speaker;
    /* Translation boundary: source strings are labelled as recorded excerpts,
     * not guaranteed verbatim game dialogue. Cross-language fallbacks say so
     * explicitly; site-written material is only shown as labelled overview or
     * excerpt, never as an unqualified speech line. */
    let text;
    let provenance;
    if (zh) {
      if (node.zhText) { text = node.zhText; provenance = t.officialTranslation; }
      else { text = node.text; provenance = t.fallbackToEnglish; }
    } else if (node.text) { text = node.text; provenance = t.officialLine; }
    else { text = node.zhText; provenance = t.fallbackToChinese; }
    /* Unknown runtime conditions are shown as readable notes, never executed. */
    const condition = zh ? (node.zhAvailabilityNote || node.availabilityNote) : node.availabilityNote;
    const conditionHtml = condition
      ? `<p class="story-dialogue-condition"><strong>${t.conditionLabel}:</strong> ${escapeHtml(condition)}</p>` : '';
    const roleClass = node.role === 'player' ? ' story-dialogue-line--player' : '';
    const choices = (outgoing.get(String(node.id)) || [])
      .filter((edge, index, list) => list.length > 1 || edge.label || edge.zhLabel)
      .map((edge) => {
        const label = zh ? (edge.zhLabel || edge.label) : edge.label;
        const caption = label || `${t.nodePrefix} ${edge.to}`;
        const targetRef = refByNodeId.get(String(edge.to)) || edge.to;
        return `<li><a class="story-dialogue-choice" data-dialogue-edge="${escapeHtml(`${edge.from}>${edge.to}`)}" data-dialogue-target="${escapeHtml(String(edge.to))}" href="#${escapeHtml(nodeAnchorId(npcId, targetRef))}">${escapeHtml(caption)}</a></li>`;
      }).join('');
    const choicesHtml = choices ? `<ul class="story-dialogue-choices">${choices}</ul>` : '';
    return `<li class="story-dialogue-line${roleClass}" data-dialogue-node="${escapeHtml(String(node.id))}" id="${escapeHtml(nodeAnchorId(npcId, ref))}"><span class="story-dialogue-speaker">${escapeHtml(speaker)}</span><p class="story-dialogue-text">${escapeHtml(text)}</p>${conditionHtml}<p class="story-dialogue-source">${t.nodePrefix}: ${escapeHtml(ref)} · ${escapeHtml(provenance)}</p>${choicesHtml}</li>`;
  }).join('');
  const linesHtml = lines ? `<ol class="story-dialogue-lines">${lines}</ol>` : '';

  /* Abridged editorial material: recorded exits and known follow-ups are shown
   * as labelled editorial excerpts, never as playable outcomes. Empty lists are safe. */
  const exitItems = exits.map((edge) => {
    const label = zh ? (edge.zhLabel || edge.label) : edge.label;
    const caption = label || `${t.nodePrefix} ${edge.from}`;
    return `<li data-dialogue-edge="${escapeHtml(`${edge.from}>${edge.to}`)}">${escapeHtml(caption)} → ${escapeHtml(edge.to)} (${t.exitNote})</li>`;
  }).join('');
  const followUps = Array.isArray(group.knownFollowUp)
    ? group.knownFollowUp
    : (group.knownFollowUp ? [group.knownFollowUp] : []);
  const followUpItems = followUps.filter((item) => item && (item.label || item.zhLabel || item.targetNode)).map((item) => {
    const label = zh ? (item.zhLabel || item.label) : item.label;
    const caption = label || `${t.nodePrefix} ${item.sourceRef || ''}`;
    return `<li>${escapeHtml(caption)} → ${escapeHtml(item.targetNode || '')} (${t.exitNote})</li>`;
  }).join('');
  const exitsHtml = (exitItems || followUpItems)
    ? `<div class="story-dialogue-exits"><strong>${t.excerptLabel} · ${t.exitsTitle}</strong><ul>${exitItems}${followUpItems}</ul></div>` : '';

  return `<div class="story-dialogue-group" data-dialogue-group="${escapeHtml(group.id || '')}">${heading}${overviewHtml}${linesHtml}${exitsHtml}</div>`;
}

function renderDialoguePreview(npc, dialogue, locale) {
  if (!dialogue) return '';
  const scenes = recordedScenes.filter((scene) => scene.npcId === npc.id);
  if (!scenes.length) return '';
  const zh = locale === 'zh';
  const t = labels[zh ? 'zh' : 'en'];
  const playable = dialogue.status === 'playable';
  const statusTag = playable ? t.statusPlayable : t.statusConfigured;
  const hint = playable ? t.dialogueHintPlayable : t.dialogueHintConfigured;
  const sourceLabel = zh ? (dialogue.zhSourceLabel || dialogue.sourceLabel) : dialogue.sourceLabel;
  const meta = [sourceLabel, dialogue.build ? `${t.buildPrefix}: ${dialogue.build}` : ''].filter(Boolean).join(' · ');
  const sceneBlocks = scenes.map((scene) => {
    const title = zh ? (scene.zhTitle || scene.title) : scene.title;
    const summary = zh ? (scene.zhSummary || scene.summary) : scene.summary;
    const note = zh ? (scene.zhSpoiler || scene.spoiler) : scene.spoiler;
    const groups = (Array.isArray(scene.groups) ? scene.groups : [])
      .map((group) => renderDialogueGroup(npc.id, group, zh, t)).join('');
    return `<div class="story-dialogue-scene" data-dialogue-scene="${escapeHtml(scene.id)}"><h4 class="story-dialogue-scene-title">${escapeHtml(title)}</h4>${summary ? `<p class="story-dialogue-overview"><strong>${t.overviewLabel}:</strong> ${escapeHtml(summary)}</p>` : ''}${note ? `<p class="story-dialogue-note">${escapeHtml(note)}</p>` : ''}${groups}</div>`;
  }).join('');
  const detailsId = `npc-dialogue-${npc.id}`;
  /* Spoiler gate (JS-only): deep links/refreshes with a dialogue hash reveal this
   * confirmation instead of auto-opening the preview. Without JS it stays hidden
   * and the native <details> below remains the static fallback. */
  const gate = `<div class="story-dialogue-gate" data-dialogue-gate="${escapeHtml(detailsId)}" hidden><p class="story-dialogue-gate-text">${escapeHtml(t.gateText)}</p><p class="story-dialogue-gate-actions"><button type="button" class="btn btn-compact" data-dialogue-gate-open>${escapeHtml(t.gateOpen)}</button><button type="button" class="btn btn-outline btn-compact" data-dialogue-gate-dismiss>${escapeHtml(t.gateDismiss)}</button></p></div>`;
  /* Explorer toolbar (JS-only): back to the previous node / close, copy the
   * current node link, and the actual clipboard outcome with a manual-copy field. */
  const toolbar = `<div class="story-dialogue-toolbar"><button type="button" class="dialogue-back btn btn-outline btn-compact" data-dialogue-back hidden>${escapeHtml(t.back)}</button><button type="button" class="btn btn-outline btn-compact" data-dialogue-copy hidden>${escapeHtml(t.copyNode)}</button><p class="story-dialogue-copy-status" data-dialogue-copy-status role="status" hidden><span data-dialogue-copy-done hidden>${escapeHtml(t.copyDone)}</span><span data-dialogue-copy-failed hidden>${escapeHtml(t.copyFailed)}</span><input type="text" readonly class="story-dialogue-copy-field" data-dialogue-copy-field aria-label="${escapeHtml(t.copyFieldLabel)}" hidden></p></div>`;
  return `${gate}<details class="story-dialogue" data-dialogue-details id="${escapeHtml(detailsId)}"><summary class="story-dialogue-summary"><span class="story-dialogue-title">${t.dialogueTitle}</span><span class="story-dialogue-hint">${hint}</span></summary><div class="story-dialogue-body"><p class="story-dialogue-status"><span class="tag ${playable ? 'evidence-corroborated' : 'evidence-lead'}">${statusTag}</span>${meta ? ` ${escapeHtml(meta)}` : ''}</p>${sceneBlocks}${toolbar}</div></details>`;
}

function renderNpcStory(npc, options = {}) {
  const locale = options.locale === 'zh' ? 'zh' : 'en';
  const zh = locale === 'zh';
  const t = labels[locale];
  const summary = safeNpcSummary(npc, locale);
  const whenNeeded = safeNpcWhenNeeded(npc, locale);

  const services = Array.isArray(options.services) ? options.services : [];
  const actionItems = services.map((service) => {
    const name = zh ? (service.zhName || service.name) : service.name;
    const text = zh ? (service.zhSummary || service.summary) : service.summary;
    const tag = service.evidenceLevel === 'build-observed' ? `<span class="tag evidence-lead">${t.statusConfigured}</span>` : '';
    return `<li class="story-reference-action" data-story-service="${escapeHtml(service.id)}"><p><strong>${escapeHtml(name)}</strong> ${tag}</p><p>${escapeHtml(text)}</p></li>`;
  }).join('');
  const actions = services.length
    ? `<ul class="story-reference-action-list">${actionItems}</ul>`
    : (whenNeeded ? `<p class="story-reference-when">${escapeHtml(whenNeeded)}</p>` : '');

  const quests = Array.isArray(options.quests) ? options.quests : [];
  const questLinks = quests.map((quest) => {
    const name = zh ? (quest.zhName || quest.name) : quest.name;
    return `<li><a class="btn btn-outline btn-compact" href="${zh ? '/zh' : ''}/database/quests#${escapeHtml(quest.id)}">${escapeHtml(name)}</a></li>`;
  }).join('');
  const questNav = quests.length
    ? `<nav class="story-reference-quests" aria-label="${t.questsAria}"><h4 class="story-reference-subtitle">${t.questsTitle}</h4><ul class="story-reference-quest-list">${questLinks}</ul></nav>` : '';

  const dialogue = renderDialoguePreview(npc, options.dialogue, locale);

  return `<div class="story-reference" data-dialogue-explorer><h3 class="story-reference-heading">${t.heading}</h3><p class="story-reference-summary">${escapeHtml(summary)}</p><div class="story-reference-actions"><h4 class="story-reference-subtitle">${t.actionsTitle}</h4>${actions}</div>${questNav}${dialogue}</div>`;
}

/* Spoiler-free search text for the embedding entry's data-search-text attribute. */
function storySearchText(npc, locale) {
  const zh = locale === 'zh';
  if (npc.id === 'gigi') {
    return zh ? 'Gigi 吉吉 大鸡蛋任务 人物资料' : 'Gigi large-egg task NPC profile';
  }
  return [zh ? (npc.zhName || npc.name) : npc.name, zh ? (npc.zhSummary || npc.summary) : npc.summary, zh ? (npc.zhWhenNeeded || npc.whenNeeded) : npc.whenNeeded].filter(Boolean).join(' ');
}

/* Head assets the embedding page must include (with the release cache token). */
function storyReferenceAssets(version) {
  const v = version ? `?v=${escapeHtml(`${version}.5`)}` : '';
  return `<link rel="stylesheet" href="/assets/css/story-reference.css${v}"><script src="/assets/js/dialogue-explorer.js${v}" defer></script>`;
}

module.exports = { renderNpcStory, renderDialoguePreview, storySearchText, storyReferenceAssets, safeNpcSummary, safeNpcWhenNeeded };
