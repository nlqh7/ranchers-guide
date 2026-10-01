/* Shared bilingual footer for generated pages. Keep route ownership here so
 * builders cannot drift back to the English legal pages on Chinese output. */
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

function linkList(items) {
  return items.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('');
}

function renderSiteFooter(locale, taglines = {}) {
  const zh = locale === 'zh';
  const tagline = zh ? (taglines.zh || '非官方玩家资源') : (taglines.en || 'Unofficial fan-made guide');
  const brand = zh
    ? '<p>按版本和证据整理的非官方中文玩家资料。</p><p class="disclaimer">不隶属于 RedPilz Studio 或 Trophy Games。</p>'
    : '<p>An unofficial, fan-made guide hub for The Ranchers — an open-world ranch life sim from RedPilz Studio, published by Trophy Games.</p><p class="disclaimer">Unofficial fan-made guide. Not affiliated with or endorsed by the developers.</p>';
  const help = zh
    ? [['/zh/guides/beginners-guide', '新手指南'], ['/zh/map', '地图'], ['/zh/problems', '问题排查'], ['/zh/community', '社区雷达']]
    : [['/guides/release-time-checklist', 'Early Access Status'], ['/guides/beginner-mistakes', 'Beginner Mistakes'], ['/guides/beginners-guide', "Beginner's Guide"], ['/guides/money-making', 'Money Making'], ['/guides/multiplayer-coop', 'Multiplayer & Co-op']];
  const data = zh
    ? [['/zh/database', '知识库'], ['/zh/database/crops', '作物'], ['/zh/database/animals', '动物'], ['/zh/tools/ranch-checklist', '牧场清单'], ['/zh/search', '搜索']]
    : [['/search', 'Search'], ['/database/crops', 'Crop Database'], ['/database/animals', 'Animal Database'], ['/tools/field-notes', 'Field Notes'], ['/tools/profit-calculator', 'Profit Calculator'], ['/tools/ranch-checklist', 'Ranch Checklist']];
  const site = zh
    ? [['/contribute', '投稿'], ['/zh/about', '关于'], ['/zh/contact', '联系'], ['/zh/privacy', '隐私政策'], ['/zh/terms', '服务条款'], ['/zh/methodology', '方法说明']]
    : [['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms of Service'], ['/methodology', 'Methodology']];
  const labels = zh
    ? { help: '帮助', data: '数据', site: '站点', helpAria: '中文帮助', dataAria: '中文数据', siteAria: '中文站点' }
    : { help: 'Guides', data: 'Data & Tools', site: 'Site', helpAria: 'Footer guides', dataAria: 'Footer databases and tools', siteAria: 'Footer site links' };
  return `<footer class="site-footer"><div class="container"><div class="footer-grid"><div><h4>The Ranchers Guide</h4>${brand}</div><nav aria-label="${labels.helpAria}"><h4>${labels.help}</h4><ul>${linkList(help)}</ul></nav><nav aria-label="${labels.dataAria}"><h4>${labels.data}</h4><ul>${linkList(data)}</ul></nav><nav aria-label="${labels.siteAria}"><h4>${labels.site}</h4><ul>${linkList(site)}</ul></nav></div><div class="footer-bottom"><span>&copy; <span data-year></span> The Ranchers Guide</span><span>${escapeHtml(tagline)}</span></div></div></footer>`;
}

module.exports = { renderSiteFooter };
