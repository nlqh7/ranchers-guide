const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const locale of ['', 'zh/']){
 const file=locale+'guides/electricity-power.html',html=fs.readFileSync(path.join(root,file),'utf8');
 assert.ok(!/usual cause is simply that no contract|通常只是因为还没签合同|any surplus your ranch generates is|surplus converts automatically|你的牧场发的多余电会在|多余部分在每天结算自动转换/.test(html),file+': do not guarantee payout or diagnose the cause from no income');
 const section=html.match(/<section\b[^>]*id="selling-surplus"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
 assert.ok(section,file+': payout checks need a dedicated answer boundary');
 for(const id of ['two-paths','meter-ui','known-reports'])assert.ok(section.includes('href="#'+id+'"'),file+': missing actionable step '+id);
 assert.ok(section.includes('Energy')&&/same.*day|同一个游戏日/.test(section),file+': compare a same-day bill, not a guaranteed current rate');
 assert.match(section,/0\.8\.10\.455/,file+': keep the historical observation build');
 assert.match(section,/unresolved|未解/,file+': retain the contradictory report');
}
const search=require('../assets/js/search-core.js').searchDocuments;
for(const [locale,query] of [['','electricity surplus not paid'],['','solar panels not paying'],['zh/','卖电没收到钱'],['zh/','太阳能板不赚钱']]){
 const index=JSON.parse(fs.readFileSync(path.join(root,locale,'search-index.json'),'utf8'));
 assert.ok(search(index,query,3).some(r=>r.url==='/'+locale+'guides/electricity-power#selling-surplus'),query+': must reach the actual payout checklist');
}
console.log('PASS: utility surplus answers separate contract eligibility, meter readings and actual settlement.');
