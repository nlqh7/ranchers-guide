const fs = require("node:fs");
const path = require("node:path");
const { decorateReferencePage } = require('./render-database-browser.cjs');
const miscItems = require('../data/build-misc-items.json');
const dialogueServices = require('../data/dialogue-services.json');

const root = path.resolve(__dirname, "..");
const checkOnly = process.argv.includes("--check");

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function localizeRoute(route) {
  const exact = {
    "/guides/animal-guide": "/zh/guides/animal-guide",
    "/guides/gigi-large-egg-quest": "/zh/guides/gigi-large-egg-quest",
    "/guides/roof-quest-stuck": "/zh/guides/roof-quest-stuck",
    "/guides/police-wanted-levels": "/zh/guides/police-wanted-levels",
    "/problems/vehicle-recovery": "/zh/problems/vehicle-recovery",
    "/tools/chicken-troubleshooter": "/zh/tools/chicken-troubleshooter",
    "/database/npcs": "/zh/database/npcs",
    "/database/quests": "/zh/database/quests",
    "/database/crops": "/zh/database/crops",
    "/database/animals": "/zh/database/animals",
    "/database/customization": "/zh/database/customization",
  };
  const base = route.split(/[?#]/)[0];
  const suffix = route.slice(base.length);
  if (exact[base]) return exact[base] + suffix;
  if (base === "/map") return "/zh/map" + suffix;
  if (base === "/problems/failed-quest-replay") return route;
  if (base.startsWith("/guides/") || base.startsWith("/problems/") || base.startsWith("/tools/") || base.startsWith("/updates/")) return `/zh${route}`;
  return route;
}

const copy = {
  npcs: {
    en: { title: "The Ranchers NPC Database — Victor, Angela & Gigi", description: "Current, source-linked The Ranchers NPC records for Victor, Angela and Gigi, connecting services, quests, maps and guides.", heading: "The Ranchers NPC Database", lead: "Use NPC records as junctions: who the person is, what the player can do with them now, and which quest, map or guide continues the answer.", noun: "NPCs", boundary: "Only Victor, Angela and Gigi clear the current publication gate. Historical-only or name-only characters remain held instead of becoming thin entries." },
    zh: { title: "The Ranchers NPC 数据库：Victor、Angela 与 Gigi", description: "查询 The Ranchers 中 Victor、Angela 和 Gigi 的当前证据、服务、任务及关联地图与攻略。", heading: "The Ranchers NPC 数据库", lead: "NPC 条目负责连接人物身份、当前可执行互动，以及后续任务、地图或攻略答案。", noun: "NPC", boundary: "目前只有 Victor、Angela 和 Gigi 达到发布门槛。仅有历史资料或名字的角色继续保留待验证，不生成薄内容。" }
  },
  quests: {
    en: { title: "The Ranchers Quest Database — Objectives, Routes & Stuck Fixes", description: "Browse source-linked The Ranchers quest records, objective routes and stuck-point fixes without confusing community labels with exact tracker names.", heading: "The Ranchers Quest Database", lead: "Start from the quest name or symptom. Exact tracker titles, community labels and descriptive names are separated so an unverified label never becomes invented game text.", noun: "Quests", boundary: "This is an aggregate route index, not a claim that every entry is a complete quest transcript. Rewards, prerequisites and exact titles stay omitted when the evidence does not retain them." },
    zh: { title: "The Ranchers 任务数据库：目标、路线与卡关处理", description: "查询 The Ranchers 任务记录、目标路线和卡关处理，并区分准确任务名、社区称呼和描述性名称。", heading: "The Ranchers 任务数据库", lead: "可从任务名称或卡关症状开始查找。准确追踪器标题、社区称呼和描述性名称会被明确区分，不把未验证称呼伪装成游戏原文。", noun: "任务", boundary: "这是任务路线索引，不代表每条都是完整任务文本。证据未保留的奖励、前置条件和准确标题不会补写。" }
  }
};

const evidenceLabels = {
  en: { official: "Official", "video-observed": "Video-observed", "community-confirmed": "Community-confirmed", "unverified-lead": "Single-source lead", "build-observed": "Game-build configuration" },
  zh: { official: "官方", "video-observed": "视频观测", "community-confirmed": "社区互证", "unverified-lead": "单一线索", "build-observed": "游戏构建配置" },
};

const confidenceLabels = {
  en: { "exact-observed": "Exact tracker title observed", "community-current": "Current community title", "community-label": "Community label", descriptive: "Descriptive name" },
  zh: { "exact-observed": "已观测准确任务名", "community-current": "当前社区任务名", "community-label": "社区称呼", descriptive: "描述性名称" },
};

const relationLabels = {
  en: { "involves-npc": "NPC", "takes-place-at": "Place", "uses-location": "Place" },
  zh: { "involves-npc": "NPC", "takes-place-at": "地点", "uses-location": "地点" },
};

const entityRoutes = {
  npc: (id, locale) => `${locale === "zh" ? "/zh" : ""}/database/npcs#${id}`,
  location: (id, locale) => `${locale === "zh" && zhMapAnchors.has(id) ? "/zh" : ""}/map#${id}`,
};

const relatedRouteLabels = {
  "/guides/beginners-guide": { en: "Getting started", zh: "新手路线" },
  "/guides/crafting-guide#recipe-red_tent": { en: "Red Tent materials", zh: "红色帐篷材料" },
  "/guides/crafting-guide#recipes-tools": { en: "Tools & equipment", zh: "工具与装备" },
  "/guides/crafting-guide#recipe-prop_Scarecrow_00": { en: "Scarecrow materials", zh: "稻草人材料" },
  "/guides/farming-fields": { en: "Planting & watering", zh: "播种与浇水" },
  "/guides/resources-and-materials": { en: "Find materials", zh: "收集材料" },
  "/guides/money-making#cashin": { en: "Cash-In selling", zh: "现金兑换箱出售" },
  "/guides/money-making": { en: "Selling & income", zh: "出售与收入" },
  "/guides/vehicles-transport": { en: "Travel & vehicles", zh: "交通与车辆" },
  "/map#city-hall": { en: "City Hall map", zh: "市政厅地图" },
  "/problems/vehicle-recovery": { en: "Vehicle recovery", zh: "车辆找回" },
  "/guides/electricity-power#two-paths": { en: "Electricity contracts & power", zh: "水电合同与供电" },
  "/guides/electricity-power#solar-quest": { en: "Solar objective checklist", zh: "太阳能目标检查清单" },
  "/guides/animal-guide#getting": { en: "Bring chickens home", zh: "把鸡运回家" },
  "/tools/chicken-troubleshooter": { en: "Chicken troubleshooter", zh: "养鸡排查工具" },
  "/guides/roof-quest-stuck#flow": { en: "Roof objective decision flow", zh: "屋顶目标分类排查" },
  "/guides/building-construction": { en: "Building guide", zh: "建造指南" },
  "/problems/failed-quest-replay": { en: "Failed quest recovery", zh: "失败任务恢复" },
  "/guides/gigi-large-egg-quest": { en: "Gigi large-egg route", zh: "Gigi 大鸡蛋路线" },
  "/guides/police-wanted-levels": { en: "Police chase and wanted levels", zh: "警察追捕与警星" },
  "/database/materials#charcoal": { en: "Charcoal details", zh: "木炭资料" },
  "/database/animals#chicken": { en: "Chicken products", zh: "鸡与产品" },
  "/database/animals#cow": { en: "Cow products", zh: "牛与产品" },
};

function entityRecord(target, locale) {
  const record = entityCatalog.get(`${target.type}:${target.id}`);
  if (!record) throw new Error(`Unknown entity relation target ${target.type}:${target.id}`);
  return {
    href: entityRoutes[target.type](target.id, locale),
    label: target.type === "location" ? record.locale[locale].title : locale === "zh" ? record.zhName : record.name,
  };
}

function relationsHtml(record, locale) {
  if (!record.relations?.length) return "";
  const heading = locale === "zh" ? "人物与地点" : "People & places";
  const items = record.relations.map((relation) => {
    const target = entityRecord(relation.target, locale);
    return `<div class="entity-relation-row"><dt>${relationLabels[locale][relation.predicate]}</dt><dd><a data-entity-ref="${esc(relation.target.type)}:${esc(relation.target.id)}" href="${esc(target.href)}">${esc(target.label)}</a> ${badge(relation, locale)}</dd></div>`;
  }).join("");
  return `<div class="entity-relations"><strong>${heading}</strong><dl>${items}</dl></div>`;
}

function backlinksHtml(recordsKey, record, locale) {
  const entityType = recordsKey === "npcs" ? "npc" : recordsKey === "quests" ? "quest" : null;
  const links = entityType ? entityBacklinks.get(`${entityType}:${record.id}`) || [] : [];
  if (!links.length) return "";
  const heading = locale === "zh" ? "关联任务" : "Related quests";
  const items = links.map(({ source }) => {
    const label = locale === "zh" ? source.zhName : source.name;
    const href = `${locale === "zh" ? "/zh" : ""}/database/quests#${source.id}`;
    return `<a data-derived-backlink="quest:${esc(source.id)}" href="${href}">${esc(label)}</a>`;
  }).join("");
  return `<div class="entity-backlinks"><strong>${heading}</strong><div>${items}</div></div>`;
}

function npcLookupGuide(locale) {
  if (locale === "zh") {
    return `<section class="answer-box npc-lookup-guide"><h2>先按你的目标找 NPC</h2><p>不要只按人物名字浏览。先确定你要办理的事情，再沿着已记录的地图、任务和攻略入口继续。</p><ul><li><strong>水电合同或额外土地：</strong>查 Victor，再打开 <a href="/zh/map#city-hall">市政厅地图</a> 和<a href="/zh/guides/electricity-power#two-paths">水电指南</a>。</li><li><strong>买鸡或把鸡带回家：</strong>查 Angela，再打开<a href="/zh/guides/animal-guide#getting">养鸡流程</a>或<a href="/zh/tools/chicken-troubleshooter">养鸡排查工具</a>。</li><li><strong>大鸡蛋任务或警察追逐：</strong>查 Gigi，再打开<a href="/zh/guides/gigi-large-egg-quest">大鸡蛋路线</a>和<a href="/zh/guides/police-wanted-levels">警星指南</a>。</li></ul></section>`;
  }
  return `<section class="answer-box npc-lookup-guide"><h2>Start from the task, not only the name</h2><p>Choose the service or problem you are trying to solve, then follow the recorded map, quest and guide links for that NPC.</p><ul><li><strong>Utility contracts or extra land:</strong> start with Victor, then open the <a href="/map#city-hall">City Hall map</a> and <a href="/guides/electricity-power#two-paths">electricity guide</a>.</li><li><strong>Buying or bringing home chickens:</strong> start with Angela, then open the <a href="/guides/animal-guide#getting">animal guide</a> or <a href="/tools/chicken-troubleshooter">chicken troubleshooter</a>.</li><li><strong>Large eggs or the police chase:</strong> start with Gigi, then open the <a href="/guides/gigi-large-egg-quest">large-egg route</a> and <a href="/guides/police-wanted-levels">wanted-level guide</a>.</li></ul></section>`;
}

function questLookupGuide(locale) {
  if (locale === "zh") {
    return `<section class="answer-box quest-lookup-guide"><strong>从你正在完成的任务开始：</strong>车辆路线查看<a href="#rust-to-rumbling">Rust to Rumbling!</a>，电力和工作台查看<a href="#power-to-the-bench">Power to the Bench</a>，买鸡后带回家查看<a href="#chicken-coop-mission">养鸡场记录</a>，任务追踪器卡在屋顶时查看<a href="#roof-building">屋顶目标</a>。每张卡都会连接下一步攻略或地图；没有证据的奖励和前置条件继续留空。</section>`;
  }
  return `<section class="answer-box quest-lookup-guide"><strong>Start from the task you are trying to finish:</strong> use <a href="#rust-to-rumbling">Rust to Rumbling!</a> for the observed vehicle route, <a href="#power-to-the-bench">Power to the Bench</a> for electricity and workbench steps, <a href="#chicken-coop-mission">the chicken-coop record</a> for bringing a purchase home, or <a href="#roof-building">the roof objective</a> when the tracker is stuck. Each card links to the next guide or map route; missing rewards and prerequisites stay unfilled.</section>`;
}

function badge(fact, locale) {
  const cls = fact.validity === "historical" ? "historical" : fact.evidenceLevel === "official" ? "evidence-official" : fact.evidenceLevel === "video-observed" ? "evidence-video" : fact.evidenceLevel === "community-confirmed" ? "evidence-corroborated" : "evidence-lead";
  return `<span class="tag ${cls}">${evidenceLabels[locale][fact.evidenceLevel]}</span>`;
}

function sourceHtml(data, ids, locale) {
  const sourceWord = locale === "zh" ? "来源" : "Source";
  return `<strong>${sourceWord}:</strong> ` + ids.map((id) => {
    const source = data.sources[id];
    const label = esc(source.title);
    return source.url ? `<a href="${esc(source.url)}" rel="noopener noreferrer">${label}</a>` : `<span>${label} · ${locale === "zh" ? "本地留档" : "local archive"}</span>`;
  }).join(" · ");
}

function nav(locale) {
  const zh = locale === "zh";
  const links = zh
    ? [["/zh/guides/beginners-guide", "新手"], ["/zh/database", "知识库"], ["/zh/map", "地图"], ["/zh/problems", "问题"], ["/zh/search", "搜索"], ["/contribute", "投稿"]]
    : [["/guides/beginners-guide", "Guides"], ["/database", "Database"], ["/map", "Map"], ["/problems", "Problems"], ["/research", "Research"], ["/search", "Search"], ["/contribute", "Contribute"]];
  return links.map(([href, label], index) => `<li><a${index === 1 ? ' class="active"' : ""} href="${href}">${label}</a></li>`).join("");
}

function questGuideHtml(dataset, record, locale) {
  const zh = locale === "zh";
  const guide = record.buildGuide;
  const title = zh ? guide.zhName : guide.name;
  const steps = guide.steps.map(step => `<li data-quest-objective="${step.entry}">${esc(zh ? step.zhText : step.text)}</li>`).join("");
  const notes = guide.notes.map(note => `<li>${esc(zh ? note.zhText : note.text)}</li>`).join("");
  const flow = guide.flow;
  const triggerLabels = {
    'player-death': zh ? '玩家死亡' : 'Player death',
    'player-pursuit': zh ? '玩家被追捕' : 'Player pursuit',
    'player-imprisonment': zh ? '玩家入狱' : 'Player imprisonment',
    'quest-actor-death': zh ? '主要任务 NPC 死亡' : 'Primary quest NPC death',
    'secondary-quest-actor-death': zh ? '次要任务 NPC 死亡' : 'Secondary quest NPC death',
    'quest-vehicle-destroyed': zh ? '任务车辆损毁' : 'Quest vehicle destroyed',
    'game-time-threshold': zh ? `游戏时间阈值配置值 ${flow.gameTimeThreshold}` : `Game-time threshold configuration value ${flow.gameTimeThreshold}`,
  };
  const failureTriggers = flow.failureTriggers.length
    ? flow.failureTriggers.map(trigger => triggerLabels[trigger]).join(zh ? '、' : ', ')
    : (zh ? '未配置带明确目标的任务级触发项' : 'No quest-level trigger with a named target');
  const failureContinuation = flow.failureContinuation === 'restart-current'
    ? (zh ? '重新启动当前任务' : 'Restarts this quest')
    : flow.failureContinuation === 'follow-up-call'
      ? (zh ? '启动已配置的后续电话' : 'Starts a configured follow-up call')
      : (zh ? '未列出自动后续动作' : 'No automatic follow-up is listed');
  let successContinuation = zh ? '未列出自动后续动作' : 'No automatic follow-up is listed';
  if (flow.successContinuation?.type === 'next-quest') {
    const target = dataset.quests.find(quest => quest.buildGuide?.questId === flow.successContinuation.targetQuestId);
    if (!target) throw new Error(`Missing quest continuation target: ${flow.successContinuation.targetQuestId}`);
    const targetName = zh ? target.buildGuide.zhName : target.buildGuide.name;
    successContinuation = `${zh ? '接续' : 'Starts'} <a href="#${esc(target.id)}">${esc(targetName)}</a>`;
  } else if (flow.successContinuation?.type === 'follow-up-call') {
    successContinuation = zh ? '启动已配置的后续电话' : 'Starts a configured follow-up call';
  } else if (flow.successContinuation?.type === 'message') {
    successContinuation = zh ? '发送已配置的后续消息' : 'Sends a configured follow-up message';
  }
  const configuredRewards = guide.configuredRewards || [];
  let rewardHtml = zh ? '任务表没有独立奖励字段；成功脚本只按后续动作整理，不当作已验证奖励。' : 'The quest table has no explicit reward field; success scripts are treated as continuation actions, not verified rewards.';
  if (configuredRewards.length === 1) {
    rewardHtml = `${zh ? '对话配置奖励：' : 'Configured dialogue reward: '}${configuredRewards[0].currency.toLocaleString('en-US')} C`;
  } else if (configuredRewards.length) {
    const choices = {'ask-for-money':zh ? '选择要钱' : 'Ask for money','decline-money':zh ? '选择不要钱' : 'Decline money'};
    rewardHtml = configuredRewards.map(reward => `${choices[reward.choice]}${zh ? '：' : ': '}${reward.currency.toLocaleString('en-US')} C`).join(zh ? '；' : '; ');
  }
  const rarityLabels = { Bronze: zh ? '铜级' : 'Bronze', Silver: zh ? '银级' : 'Silver', Gold: zh ? '金级' : 'Gold' };
  const configuredRewardActions = guide.configuredRewardActions || [];
  const rewardActionsHtml = configuredRewardActions.length ? `<div class="quest-guide-notes quest-configured-rewards"><strong>${zh ? '对话中的奖励动作' : 'Reward actions in dialogue'}</strong><ul>${configuredRewardActions.map((action, index) => {
    const grants = action.grants.map((grant) => grant.currency
      ? `${Number(grant.currency).toLocaleString('en-US')} C`
      : `${esc(zh ? grant.zhName : grant.name)} × ${grant.quantity}${grant.rarity ? ` · ${esc(rarityLabels[grant.rarity] || grant.rarity)}` : ''}`).join(zh ? '；' : '; ');
    return `<li data-configured-reward-action="${esc(action.sourceNode || index + 1)}"><strong>${esc(zh ? action.zhTriggerText : action.triggerText)}：</strong> ${grants}</li>`;
  }).join('')}</ul><p>${zh ? '这些是与具名任务路径相连的构建脚本动作；尚未逐项运行时实测，不保证实际到账。' : 'These are build-script actions tied to named quest paths. They are not individually runtime-tested and do not guarantee delivery.'}</p></div>` : '';
  const flowHtml = `<div class="quest-guide-flow" data-quest-flow><strong>${zh ? '失败与后续' : 'Failure & continuation'}</strong><dl><div><dt>${zh ? '任务级失败配置' : 'Quest-level failure configuration'}</dt><dd>${esc(failureTriggers)}</dd></div><div><dt>${zh ? '失败后' : 'After failure'}</dt><dd>${esc(failureContinuation)}</dd></div><div><dt>${zh ? '成功后' : 'After success'}</dt><dd>${successContinuation}</dd></div></dl><p>${esc(rewardHtml)}${configuredRewards.length ? (zh ? '。对话文字与金额脚本一致，但尚未运行时实测。' : '. Dialogue text and matching money-action scripts agree, but runtime delivery is untested.') : ''}</p>${rewardActionsHtml}</div>`;
  const facts = record.facts.map(fact => `<li><p>${esc(zh ? fact.zhText : fact.text)} ${badge(fact, locale)}</p><p class="fact-source">${sourceHtml(dataset, fact.sourceIds, locale)} · ${zh ? "证据版本" : "Evidence build"}: ${esc(fact.build || (zh ? "未标注" : "not recorded"))}</p></li>`).join("");
  const links = record.relatedRoutes.map(route => `<a class="btn btn-outline btn-compact" href="${esc(zh ? localizeRoute(route) : route)}">${esc(relatedRouteLabels[route][locale])}</a>`).join("");
  const questVehicle = miscItems.questItems?.find(item => item.relatedQuestId === record.id);
  const questVehicleHtml = questVehicle ? `<div class="quest-guide-notes" data-quest-vehicle-id="${esc(questVehicle.id)}"><strong>${zh ? "任务车辆定义" : "Quest vehicle definition"}</strong><p>${esc(zh ? questVehicle.zhName : questVehicle.name)} · ${zh ? "构建中的名称与物品标志；I2 说明栏为空。3,000 C 是任务资金判定，不是修理价格或任务奖励；此定义也不证明当前可驾驶。" : "Build-defined name and item flags; the I2 description slot is empty. The 3,000 C objective is not a repair price or quest reward, and this definition does not establish current drivability."}</p><a href="${zh ? "/zh" : ""}/guides/vehicles-transport#quest-vehicle-victor-old-car">${zh ? "在车辆指南中查看" : "Open the vehicle guide"} →</a></div>` : "";
  return `<section class="entity-profile quest-guide" id="${record.id}"${guide.sourceKind === 'dialogue-defined' ? ' data-dialogue-defined-quest' : ''} data-search-entry data-search-title="${esc(title)}" data-search-tags="${esc([guide.name, guide.zhName, record.name, record.zhName, zh ? record.zhSearchTags : record.searchTags].join(" "))}" data-search-status="${guide.sourceKind === 'dialogue-defined' ? (zh ? '对话配置线索' : 'Dialogue-defined lead') : (zh ? "任务步骤" : "Quest steps")}">
<h2>${esc(title)}</h2>
<details class="quest-build-guide" data-quest-build-guide="${record.id}"><summary>${zh ? "查看步骤与准备" : "Steps & preparation"}</summary><p class="quest-guide-origin">${guide.sourceKind === 'dialogue-defined' ? (zh ? '站长收集 · 对话配置线索，运行时可用性未知' : 'Site-collected · dialogue-defined lead; runtime availability unknown') : (zh ? "站长收集 · 游戏任务配置整理，未逐项实测" : "Site-collected · interpreted game configuration, not fully play-tested")}</p>${steps ? `<ol>${steps}</ol>` : ''}<div class="quest-guide-notes"><strong>${zh ? "容易漏掉的地方" : "Before you move on"}</strong><ul>${notes}</ul></div>${flowHtml}</details>
${questVehicleHtml}${relationsHtml(record, locale)}<div class="entity-related"><div>${links}</div></div>
<details class="quest-guide-evidence"><summary>${zh ? "玩家记录与资料来源" : "Player reports & sources"}</summary><p>${zh ? "任务标题与上述步骤来自站长持有的游戏构建，按原生字段整理；不代表所有运行时任务已收录，未确认奖励不补写。" : "The title and steps above were interpreted from the editor's owned game build. This is not a complete runtime quest catalog; unverified rewards are omitted."} ${zh ? "版本" : "Build"}: ${esc(guide.build)}.</p><p>${zh ? "非官方网站；游戏内容版权归开发商所有。" : "Unofficial fan resource; game content belongs to its developer."}</p><ul class="evidence-list">${facts}</ul></details></section>`;
}

function questPage(html, locale) {
  const zh = locale === "zh";
  return html.replace("</head>", '<link rel="stylesheet" href="/assets/css/quest-guide.css?v=20260830-1"></head>')
    .replace('class="article entity-directory"', 'class="article entity-directory quest-directory"')
    .replace(/<p class="lead">[\s\S]*?<\/p>/, `<p class="lead">${zh ? "按游戏里的任务名查步骤、准备物品和卡关处理。原有的社区称呼仍可搜索。" : "Find your in-game quest, check what to prepare, and follow the steps or stuck-point guide. Earlier community names remain searchable."}</p>`)
    .replace(/<div class="notice info">[\s\S]*?<\/div>/, "")
    .replace(/<section class="answer-box quest-lookup-guide">[\s\S]*?<\/section>/, "");
}

function serviceDirectory(locale) {
  const zh = locale === "zh";
  const entries = dialogueServices.services.map((service) => {
    const href = zh ? localizeRoute(service.relatedRoute) : service.relatedRoute;
    return `<li id="dialogue-service-${esc(service.id)}" data-dialogue-service="${esc(service.id)}" data-search-entry data-search-title="${esc(zh ? service.zhName : service.name)}" data-search-aliases="${esc(`${service.name}|${service.zhName}`)}" data-search-tags="${esc(zh ? service.zhSummary : service.summary)}" data-search-status="${zh ? '游戏构建对话' : 'Game-build dialogue'}"><p><strong>${esc(zh ? service.zhName : service.name)}</strong> ${badge(service, locale)}</p><p>${esc(zh ? service.zhSummary : service.summary)}</p><p><a class="btn btn-outline btn-compact" href="${esc(href)}">${zh ? "查看相关资料" : "Open related guide"} →</a></p></li>`;
  }).join("");
  return `<details class="database-reference-notes dialogue-service-directory"><summary>${zh ? "NPC 与站点服务" : "NPC & station services"} · ${dialogueServices.services.length}</summary><p>${zh ? "以下内容来自当前构建的双语对话与相符动作脚本。配置数值不等同于已实测价格；未从这些节点推断营业时间、地点、当前可用性或目的地。" : "These entries come from current-build bilingual dialogue and matching action scripts. Configuration values are not verified prices; hours, locations, current availability and destinations are not inferred from these nodes."}</p><ul class="evidence-list">${entries}</ul></details>`;
}

function render(dataset, recordsKey, locale) {
  const zh = locale === "zh";
  const c = copy[recordsKey][locale];
  const records = dataset[recordsKey];
  const route = `${zh ? "/zh" : ""}/database/${recordsKey}`;
  const enUrl = `https://theranchersguide.com/database/${recordsKey}`;
  const zhUrl = `https://theranchersguide.com/zh/database/${recordsKey}`;
  const toc = records.map((record) => `<li><a href="#${record.id}">${esc(zh ? (record.buildGuide?.zhName || record.zhName) : (record.buildGuide?.name || record.name))}</a></li>`).join("");
  const sections = records.map((record) => {
    if (recordsKey === "quests" && record.buildGuide) return questGuideHtml(dataset, record, locale);
    const confidence = recordsKey === "quests" ? `<span class="tag ${record.nameConfidence === "exact-observed" ? "evidence-video" : "evidence-lead"}">${confidenceLabels[locale][record.nameConfidence]}</span>` : "";
    const facts = record.facts.map((fact) => `<li${fact.validity === "historical" ? ' class="fact-historical"' : ""}><p>${esc(zh ? fact.zhText : fact.text)} ${badge(fact, locale)}</p><p class="fact-source">${sourceHtml(dataset, fact.sourceIds, locale)} · <strong>${zh ? "版本" : "Build"}:</strong> ${esc(fact.build)}</p></li>`).join("");
    const relatedLinks = record.relatedRoutes.map((relatedRoute) => {
      const href = zh ? localizeRoute(relatedRoute) : relatedRoute;
      const labels = relatedRouteLabels[relatedRoute];
      if (!labels) throw new Error(`Missing related route label for ${relatedRoute}`);
      return `<a class="btn btn-outline btn-compact" href="${esc(href)}">${esc(labels[locale])}</a>`;
    }).join("");
    const related = `<div class="entity-related"><strong>${zh ? "继续查找" : "Continue with"}</strong><div>${relatedLinks}</div></div>`;
    return `<section class="evidence-ledger entity-profile" id="${record.id}" data-search-entry data-search-title="${esc(zh ? record.zhName : record.name)}" data-search-tags="${esc(zh ? record.zhSearchTags : record.searchTags)}" data-search-status="${zh ? "结构化资料" : "Structured record"}"><div class="section-heading-row"><h2>${esc(zh ? record.zhName : record.name)}</h2>${confidence}</div><p class="lead">${esc(zh ? record.zhSummary : record.summary)}</p><ul class="evidence-list">${facts}</ul>${relationsHtml(record, locale)}${backlinksHtml(recordsKey, record, locale)}${related}</section>`;
  }).join("\n");
  const lookupGuide = recordsKey === "npcs" ? npcLookupGuide(locale) : recordsKey === "quests" ? questLookupGuide(locale) : "";
  const services = recordsKey === "npcs" ? serviceDirectory(locale) : "";
  return `<!DOCTYPE html>\n<!-- GENERATED by scripts/build-knowledge-entities.cjs from data/${recordsKey}.json — do not edit directly. -->\n<html lang="${zh ? "zh-CN" : "en"}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${c.title}</title><meta name="description" content="${c.description}"><link rel="canonical" href="${zh ? zhUrl : enUrl}"><link rel="alternate" hreflang="en" href="${enUrl}"><link rel="alternate" hreflang="zh-CN" href="${zhUrl}"><link rel="alternate" hreflang="x-default" href="${enUrl}"><meta property="og:type" content="website"><meta property="og:site_name" content="The Ranchers Guide"><meta property="og:title" content="${c.title}"><meta property="og:description" content="${c.description}"><meta property="og:url" content="${zh ? zhUrl : enUrl}"><meta property="og:image" content="https://theranchersguide.com/assets/img/guide-barn.webp"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="stylesheet" href="/assets/css/style.css?v=20260902-ui2"><script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4804883741146501" crossorigin="anonymous"></script></head><body><header class="site-header"><nav class="nav-inner" aria-label="${zh ? "主导航" : "Main navigation"}"><a class="logo" href="${zh ? "/zh/" : "/"}"><span class="logo-mark"><img src="/assets/img/logo.png" alt="" width="34" height="34"></span><span>The Ranchers Guide<small>${zh ? "非官方中文玩家指南" : "Unofficial fan resource"}</small></span></a><button class="nav-toggle" aria-expanded="false" aria-label="${zh ? "展开导航" : "Toggle navigation"}">☰</button><ul class="nav-links">${nav(locale)}</ul></nav></header><main><article class="article entity-directory"><nav class="breadcrumb" aria-label="${zh ? "面包屑" : "Breadcrumb"}"><a href="${zh ? "/zh/" : "/"}">${zh ? "首页" : "Home"}</a> / <a href="${zh ? "/zh/database" : "/database"}">${zh ? "知识库" : "Database"}</a> / ${c.noun}</nav><h1>${c.heading}</h1><p class="meta">${zh ? "页面基线" : "Page baseline"}: ${dataset.meta.build} · ${zh ? "更新" : "Updated"} ${dataset.meta.lastUpdated}</p><p class="lead">${c.lead}</p><div class="notice info"><strong>${zh ? "发布边界：" : "Publication boundary:"}</strong> ${c.boundary}</div>${lookupGuide}${services}<nav class="toc" aria-label="${c.noun}"><strong>${c.noun}</strong><ul>${toc}</ul></nav>${sections}</article></main><footer class="site-footer"><div class="container"><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${zh ? "证据不足的实体不会自动发布" : "Evidence gates prevent thin entity pages"}</span></div></div></footer><script src="/assets/js/main.js?v=20260810-nav1" defer></script></body></html>`;
}

const npcData = JSON.parse(fs.readFileSync(path.join(root, "data", "npcs.json"), "utf8"));
const questData = JSON.parse(fs.readFileSync(path.join(root, "data", "quests.json"), "utf8"));
const locationData = JSON.parse(fs.readFileSync(path.join(root, "data", "locations.json"), "utf8"));
const zhMapHtml = fs.readFileSync(path.join(root, "zh", "map.html"), "utf8");
const zhMapAnchors = new Set(Array.from(zhMapHtml.matchAll(/<article\b(?=[^>]*\bdata-location-entry\b)[^>]*\bid="([a-z0-9-]+)"/g), (match) => match[1]));
const entityCatalog = new Map([
  ...npcData.npcs.map((record) => [`npc:${record.id}`, record]),
  ...locationData.locations.map((record) => [`location:${record.id}`, record]),
]);
const entityBacklinks = new Map();
for (const quest of questData.quests) {
  for (const relation of quest.relations || []) {
    const key = `${relation.target.type}:${relation.target.id}`;
    if (!entityBacklinks.has(key)) entityBacklinks.set(key, []);
    entityBacklinks.get(key).push({ source: quest, relation });
  }
}

const jobs = [
  ["npcs", npcData],
  ["quests", questData],
];

let drifted = false;
for (const [recordsKey, dataset] of jobs) {
  for (const locale of ["en", "zh"]) {
    const file = path.join(root, ...(locale === "zh" ? ["zh", "database", `${recordsKey}.html`] : ["database", `${recordsKey}.html`]));
    const page = recordsKey === "quests" ? questPage(render(dataset, recordsKey, locale), locale) : render(dataset, recordsKey, locale);
    const html = decorateReferencePage(page, dataset, recordsKey, locale);
    if (checkOnly) {
      if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== html) drifted = true;
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, html, "utf8");
    }
  }
}

for (const locale of ['en', 'zh']) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const file = path.join(root, zh ? 'zh/map.html' : 'map.html');
  const before = fs.readFileSync(file, 'utf8');
  const native = questData.quests.filter(q => q.buildGuide);
  const renderTaskCard = q => {
    const place = q.relations.find(r => r.target.type === 'location');
    const status = place ? 'directory' : 'unresolved';
    const text = zh ? (place ? '配置关联地点；不代表任务步骤的精确坐标。' : '查看任务步骤与准备；暂无可靠任务坐标。') : (place ? 'A configured related place, not an exact objective coordinate.' : 'Read the steps and preparation; no reliable objective coordinate is recorded.');
    return `<article class="map-task-relation-card" data-map-task-relation-card data-native-task data-map-task-id="${q.id}" data-map-task-status="${status}"><div class="map-task-relation-copy"><span class="map-task-status is-${status}">${zh ? (place ? '关联地点' : '暂无任务坐标') : (place ? 'Related place' : 'No task coordinate')}</span><h3>${esc(zh ? q.buildGuide.zhName : q.buildGuide.name)}</h3><p>${text}</p></div><div class="map-task-relation-actions">${place ? `<button type="button" data-map-task-action="directory" data-map-task-target="${place.target.id}">${zh ? '查看关联地点' : 'Open related place'}</button>` : ''}<a href="${prefix}/database/quests#${q.id}">${zh ? '任务详情' : 'Task details'}&nbsp;→</a></div></article>`;
  };
  const taskBlocks = before.match(/<details\b[^>]*data-map-task-relations[^>]*>[\s\S]*?<\/details>/g) || [];
  if (taskBlocks.length !== 1) throw new Error(`Expected one task-location directory in ${locale} map, found ${taskBlocks.length}.`);
  const newline = taskBlocks[0].includes('\r\n') ? '\r\n' : '\n';
  const listOpen = '<div class="map-task-relation-list">';
  const listStart = taskBlocks[0].indexOf(listOpen);
  const listEnd = taskBlocks[0].lastIndexOf('</div>');
  if (listStart < 0 || listEnd <= listStart) throw new Error(`Task-location list boundary missing in ${locale} map.`);
  const bodyStart = listStart + listOpen.length;
  const retained = taskBlocks[0].slice(bodyStart, listEnd)
    .replace(/\s*<article\b[^>]*\bdata-native-task\b[\s\S]*?<\/article>/g, '')
    .trimEnd();
  const retainedIds = new Set(Array.from(retained.matchAll(/data-map-task-id="([^"]+)"/g), match => match[1]));
  const cards = native.filter(q => !retainedIds.has(q.id)).map(renderTaskCard).join(newline);
  const summary = `<summary>${zh ? '任务地点' : 'Task locations'}</summary>`;
  const rebuiltBlock = `${taskBlocks[0].slice(0, listStart).replace(/<summary>[\s\S]*?<\/summary>/, summary)}${listOpen}${retained}${newline}${cards}${newline}${taskBlocks[0].slice(listEnd)}`;
  const taskIds = Array.from(rebuiltBlock.matchAll(/data-map-task-id="([^"]+)"/g), match => match[1]);
  const expectedTaskIds = new Set(questData.quests.map(q => q.id));
  if (taskIds.length !== expectedTaskIds.size || new Set(taskIds).size !== taskIds.length || taskIds.some(id => !expectedTaskIds.has(id))) {
    throw new Error(`Task-location directory in ${locale} map must contain each quest exactly once.`);
  }
  const after = before.replace(taskBlocks[0], rebuiltBlock);
  if (!after.includes('<!-- MAP_MARKERS:START -->') || !after.includes('<!-- MAP_MARKERS:END -->')) {
    throw new Error(`Map marker boundaries were lost while updating ${locale} task locations.`);
  }
  if (checkOnly) { if (before !== after) drifted = true; }
  else fs.writeFileSync(file, after);
}

if (checkOnly && drifted) {
  console.error("NPC or quest pages are out of sync with their JSON source.");
  process.exit(1);
}
if (!checkOnly) console.log("Wrote bilingual NPC and quest database pages.");
