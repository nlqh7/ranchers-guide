const fs = require('node:fs');
const path = require('node:path');
const vehicles = require('../data/build-vehicles.json');
const shops = require('../data/build-shops.json');
const miscItems = require('../data/build-misc-items.json');
const worldServices = require('../data/build-world-services.json');
const dialogueServices = require('../data/dialogue-services.json');

const root = path.resolve(__dirname, '..');
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const groups = { 'dealer-listed': ['Dealer-listed definitions', '有经销商记录'], 'no-dealer': ['No matched dealer record', '无匹配经销商记录'] };

function render(locale) {
  const zh = locale === 'zh';
  const prefix = zh ? '/zh' : '';
  const name = item => zh ? item.zhName : item.name;
  const description = item => zh ? item.zhDescription : item.description;
  const yesNo = value => value ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No');
  const questVehicle = miscItems.questItems.find(item => item.id === 'CarToRepair_Cimka');
  const shopName = id => {
    const shop = shops.shops.find(entry => entry.id === id);
    return shop ? (zh ? shop.zhName : shop.name) : id;
  };
  const transportDialogueIds = ['bicycle-rental-actions', 'taxi-rental-actions', 'vehicle-repair-actions', 'subway-travel-actions', 'remote-portal-action'];
  const transportDialogueServices = transportDialogueIds.map(id => {
    const service = dialogueServices.services.find(entry => entry.id === id);
    if (!service) throw new Error(`Missing dialogue transport service: ${id}`);
    return service;
  });
  const renderDialogueTransportServices = () => `<details class="recipe-item-settings" id="dialogue-transport-services"><summary>${zh ? '租赁、维修与出行条件' : 'Rental, repair & travel terms'}</summary><p class="recipe-boundary">${zh ? '以下内容来自当前构建的双语对话与相符动作。金额是对话列出的条件，不代表已逐项实测；营业状态与完整目的地仍未知。' : 'These terms come from current-build bilingual dialogue and matching actions. Listed amounts are not individually gameplay-tested; current operation and complete destinations remain unknown.'}</p><ul class="evidence-list">${transportDialogueServices.map(service => `<li data-dialogue-transport-service="${esc(service.id)}"><strong>${esc(zh ? service.zhName : service.name)}</strong><p>${esc(zh ? service.zhSummary : service.summary)}</p></li>`).join('')}</ul></details>`;
  const renderWorldServices = () => `<!-- BEGIN WORLD SERVICE REFERENCE -->
  <section class="world-service-reference" id="transport-service-objects" aria-labelledby="transport-service-objects-title">
    <h3 id="transport-service-objects-title">${zh ? '交通服务对象' : 'Transport service objects'}</h3>
    <p class="recipe-boundary">${zh ? `NetEnvObj 的 186 条环境定义中，只有 4 条带有可供玩家查阅的交通名称；其余 ${worldServices.audit.nonPublicRecords} 条是内部标识或缺少本地化，不发布成地点。环境对象名称本身不证明精确坐标、价格、当前营业或可用性；对话条件在下方单独列出。` : `Only 4 of 186 NetEnvObj environment definitions have player-readable transport names. The other ${worldServices.audit.nonPublicRecords} are internal identifiers or lack localization, so they are not promoted to places. Environment-object names alone do not establish exact coordinates, prices, current operation or availability; dialogue terms are listed separately below.`}</p>
    ${renderDialogueTransportServices()}
    <div class="world-service-grid">${worldServices.services.map(service => {
      const serviceName = zh ? service.zhName : service.name;
      const descriptionText = zh ? service.zhDescription : service.description;
      const serviceSearchTitle = service.relatedVehicleId ? `${serviceName}${zh ? '服务对象' : ' service object'}` : serviceName;
      const serviceAliases = service.relatedVehicleId
        ? `${service.id}|${service.name} service object|${service.zhName}服务对象`
        : `${service.id}|${service.name}|${service.zhName}`;
      const related = service.mapLocationId
        ? `<a href="${prefix}/map#${service.mapLocationId}">${zh ? '查看待核验坐标的地图目录' : 'Open the map directory entry with pending coordinates'} →</a>`
        : `<a href="#vehicle-${service.relatedVehicleId}">${zh ? '查看同级出租车车型定义' : 'Open the matching taxi-class vehicle definition'} →</a>`;
      return `<article id="world-service-${service.id}" data-search-entry data-search-title="${esc(serviceSearchTitle)}" data-search-aliases="${esc(serviceAliases)}" data-search-tags="${zh ? '交通 服务对象 构建资料' : 'transport service object build data'}" data-search-status="${zh ? '构建内交通服务名称' : 'Build-defined transport service name'}"><h4>${esc(serviceName)}</h4><code>${esc(service.id)}</code>${descriptionText ? `<p>${esc(descriptionText)}</p>` : `<p class="recipe-muted">${zh ? '此构建的 I2 说明栏为空。' : 'The I2 description slot is empty in this build.'}</p>`}${related}</article>`;
    }).join('')}</div>
  </section>
<!-- END WORLD SERVICE REFERENCE -->`;
  const renderRow = item => {
    const offers = item.shopOfferIds.map(id => shops.offers.find(offer => offer.id === id)).filter(Boolean);
    const dealerLinks = offers.length
      ? offers.map(offer => `<a class="shop-recipe-link" href="${prefix}/guides/resources-and-materials#offer-${offer.id}">${esc(shopName(offer.shopId))} →</a>`).join('')
      : `<span class="recipe-muted">${zh ? '当前商店表没有匹配记录；不等于无法获得。' : 'No match in the current shop tables; this does not mean unavailable.'}</span>`;
    const copy = description(item)
      ? `<p class="recipe-muted"><strong>${zh ? '游戏内说明：' : 'In-game description: '}</strong>${esc(description(item))}</p>`
      : `<p class="recipe-muted">${zh ? '此构建的 I2 说明栏为空。' : 'The I2 description slot is empty in this build.'}</p>`;
    const query = [item.name, item.zhName, item.description, item.zhDescription, ...offers.map(offer => shopName(offer.shopId))].filter(Boolean).join(' ');
    return `<tr id="vehicle-${item.id}" data-recipe-row data-query="${esc(query)}" data-search-entry data-search-title="${esc(name(item))}" data-search-tags="${esc(`${query} vehicle car transport 车辆 汽车 交通`)}" data-search-status="${zh ? '构建资料（未实测）' : 'Build data (not gameplay-tested)'}"><th scope="row"><a href="#vehicle-${item.id}">${esc(name(item))}</a><small>${offers.length ? (zh ? `${offers.length} 条经销商记录` : `${offers.length} dealer listing${offers.length > 1 ? 's' : ''}`) : (zh ? '无匹配经销商记录' : 'No matched dealer record')}</small></th><td>${copy}${dealerLinks}<details class="recipe-item-settings"><summary>${zh ? '原生物品配置' : 'Native item settings'}</summary><p class="recipe-muted">${zh ? '可装备' : 'Equippable'}: ${yesNo(item.equippable)} · ${zh ? '可堆叠' : 'Stackable'}: ${yesNo(item.stackable)} · ${zh ? '可丢弃' : 'Droppable'}: ${yesNo(item.droppable)} · ${zh ? '可出售标志' : 'Sellable flag'}: ${yesNo(item.sellable)}</p><p class="recipe-muted">${zh ? '这些标志不证明可驾驶、当前库存、性能或售价。' : 'These flags do not establish drivability, current stock, performance or price.'}</p></details></td></tr>`;
  };
  return `<!-- BEGIN VEHICLE REFERENCE -->
<section class="crafting-reference vehicle-reference" id="vehicle-catalog" data-vehicle-reference data-crafting-reference aria-label="${zh ? '车型目录' : 'Vehicle catalogue'}">
  <h2>${zh ? '车型目录' : 'Vehicle catalogue'}</h2>
  <p class="recipe-boundary">${zh ? '站长整理 · build 0.8.10.842 的 40 条车辆定义。名称和短说明来自游戏双语文本；经销商链接来自独立商店表。目录存在不等于当前可驾驶或可购买。' : 'Editor-collected vehicle definitions from build 0.8.10.842. Names and short descriptions come from the bilingual game text; dealer links come from separate shop tables. Catalogue presence does not establish current drivability or availability.'}</p>
  <aside class="recipe-note" id="quest-vehicle-victor-old-car" data-quest-vehicle-id="${esc(questVehicle.id)}"><strong>${zh ? '任务车辆：' : 'Quest vehicle: '}${esc(zh ? questVehicle.zhName : questVehicle.name)}</strong><p>${zh ? '该名称来自独立 Misc 构建定义，不属于下方 40 条通用车辆目录。I2 说明栏为空，物品标志也不证明当前可驾驶、性能、修理价格或任务奖励。' : 'This name comes from a separate Misc build definition and is not one of the 40 general vehicle catalogue records below. Its I2 description slot is empty, and its item flags do not establish current drivability, performance, a repair price or a quest reward.'}</p><a href="${prefix}/database/quests#rust-to-rumbling">${zh ? '查看 Rust to Rumbling! 步骤' : 'Open the Rust to Rumbling! steps'} →</a></aside>
  ${renderWorldServices()}
  <div class="recipe-controls"><label>${zh ? '查找车型' : 'Find a vehicle'}<input type="search" data-recipe-query placeholder="${zh ? '例如：Vespa、出租车、皮卡' : 'e.g. Vespa, taxi, pickup'}"></label><label>${zh ? '记录类型' : 'Record type'}<select data-recipe-category><option value="all">${zh ? '全部' : 'All'}</option>${Object.entries(groups).map(([id, labels]) => `<option value="${id}">${labels[zh ? 1 : 0]}</option>`).join('')}</select></label></div>
  <p data-recipe-empty hidden role="status">${zh ? '没有匹配的车型。' : 'No matching vehicle.'}</p>
  ${Object.entries(groups).map(([id, labels]) => `<section data-recipe-group="${id}"><h3>${labels[zh ? 1 : 0]}</h3><div class="recipe-table-wrap" role="region" aria-label="${labels[zh ? 1 : 0]}" tabindex="0"><table class="recipe-table"><thead><tr><th scope="col">${zh ? '车型' : 'Vehicle'}</th><th scope="col">${zh ? '说明、经销商与配置' : 'Description, dealer & settings'}</th></tr></thead><tbody>${vehicles.items.filter(item => (item.shopOfferIds.length ? 'dealer-listed' : 'no-dealer') === id).map(renderRow).join('\n')}</tbody></table></div></section>`).join('\n')}
  <details class="recipe-sources"><summary>${zh ? '资料来源与边界' : 'Sources & limits'}</summary><p>${zh ? '非官方资料。40 个名称与 40 个说明栏逐项核对 I2 原始字节；空说明保持为空。内部价格和原始开发字段不公开。' : 'Unofficial reference. All 40 names and 40 description slots were checked against the raw I2 bytes; empty descriptions remain empty. Internal prices and raw developer fields are not published.'} ${esc(vehicles.build)} · Steam ${esc(vehicles.steamBuild)}.</p><p>${zh ? '经销商记录不保证当前库存或完整售价；无匹配记录也不证明无法获得。' : 'A dealer record does not guarantee current stock or a complete price; no matched record does not prove unavailability.'}</p></details>
</section>
<!-- END VEHICLE REFERENCE -->`.replace(/[ \t]+$/gm, '');
}

let stale = false;
for (const locale of ['en', 'zh']) {
  const file = path.join(root, locale === 'zh' ? 'zh' : '', 'guides/vehicles-transport.html');
  const before = fs.readFileSync(file, 'utf8');
  if (!before.includes('<!-- BEGIN VEHICLE REFERENCE -->')) throw new Error(`Missing vehicle block: ${file}`);
  const after = before.replace(/<!-- BEGIN VEHICLE REFERENCE -->[\s\S]*?<!-- END VEHICLE REFERENCE -->/, render(locale));
  if (before !== after) {
    if (process.argv.includes('--check')) { console.error(`STALE: ${file}`); stale = true; }
    else fs.writeFileSync(file, after);
  }
}
if (stale) process.exitCode = 1;
else console.log('PASS: bilingual vehicle catalogue is synchronized.');
