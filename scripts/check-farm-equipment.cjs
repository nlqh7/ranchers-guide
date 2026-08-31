const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'data/build-farm-equipment.json');
assert.ok(fs.existsSync(file),'Farm equipment source values must reach website data');
const data=JSON.parse(fs.readFileSync(file));
assert.equal(data.equipment.length,7);
assert.deepEqual(data.equipment.find(i=>i.id==='sprinkler_n1').water.consumption,[4,4,4,4]);
assert.deepEqual(data.equipment.find(i=>i.id==='sprinkler_ceiling_n1').water.consumption,[8,8,8,8]);
assert.equal(data.equipment.find(i=>i.id==='prop_Outdoor_Well').water,null,'An absent water field does not mean zero use or zero output');
assert.equal(data.interval,null);
assert.deepEqual(data.sharedConfiguration,{
  type:'Placeable',classification:'OTHER',rarity:'Bronze',equippable:false,bodySlot:'NONE',stackable:true,droppable:true,sellableFlag:true,hasInteriorFeatures:false,interiorConsumesFarmEnergy:false,
});
assert.deepEqual(Object.fromEntries(data.equipment.map(item=>[item.id,item.objectCategory])),{
  sprinkler_n1:'SPRINKLERS',sprinkler_n2:'SPRINKLERS',prop_Scarecrow_01:'SCARECREWS',prop_Scarecrow_00:'SCARECREWS',prop_Outdoor_Well:null,sprinkler_ceiling_n1:'SPRINKLERS',prop_Trough_01:null,
});
assert.ok(data.equipment.every(item=>Number.isFinite(item.building.defaultHealth)&&Number.isFinite(item.building.buildSteps)));
assert.ok(data.equipment.filter(item=>item.grid).every(item=>item.grid.showGrid===true));
const recipes=require('../data/build-recipes.json');
const searchCore=require('../assets/js/search-core.js');
for(const prefix of ['','zh/']) {
  const html=fs.readFileSync(path.join(root,prefix,'guides/farming-fields.html'),'utf8');
  const search=JSON.parse(fs.readFileSync(path.join(root,prefix,'search-index.json'),'utf8'));
  const crafting=fs.readFileSync(path.join(root,prefix,'guides/crafting-guide.html'),'utf8');
  for(const item of data.equipment) {
    const profile=html.split(`id="farm-${item.id}"`)[1]?.split('</section>')[0];
    assert.ok(profile,`Missing farm equipment profile: ${prefix}${item.id}`);
    assert.ok(profile.includes(prefix?item.zhName:item.name));
    for(const material of recipes.recipes.find(r=>r.id===item.id).materials) {
      const name=recipes.ingredients.find(i=>i.id===material.id);
      assert.ok(profile.includes(prefix?name.zhName:name.name));
      assert.ok(profile.includes(`× ${material.quantity}`));
    }
    if(item.water) {
      for(const [key,labels] of [['water',['Water use','耗水']],['electricity',['Power use','耗电']]]) {
        assert.ok(profile.includes(`<th scope="row">${labels[prefix?1:0]}</th>${item[key].consumption.map(n=>`<td>${n}</td>`).join('')}`));
      }
    } else assert.ok(profile.includes(prefix?'水电字段未收录':'Water/power fields not listed'));
    assert.ok(!profile.includes('#offer-'),'None of these seven definitions has a matched vendor reference');
    assert.ok(profile.includes('data-farm-native-settings'));
    assert.ok(profile.includes(`${prefix?'默认健康字段':'Default-health field'}: ${item.building.defaultHealth}`));
    assert.ok(profile.includes(`${prefix?'建造步数字段':'Build-step field'}: ${item.building.buildSteps}`));
    assert.ok(profile.includes(`${prefix?'来源对象分类':'Source object category'}: ${item.objectCategory|| (prefix?'未收录':'Not listed')}`));
    if(item.grid) assert.ok(profile.includes(prefix?'显示格网标志：是':'Show-grid flag: Yes'));
    assert.match(profile,prefix?/健康与建造步数字段不是已实测耐久或施工次数/:/Health and build-step fields are not measured durability or construction actions/);
    assert.ok(search.some(e=>e.url.endsWith(`#farm-${item.id}`)),`Missing searchable farm equipment: ${item.id}`);
    const result=searchCore.searchDocuments(search,prefix?item.zhName:item.name,12)[0];
    assert.ok(result.url.endsWith(`#farm-${item.id}`),'An exact equipment name must outrank a longer variant');
    if(item.water) assert.ok(result.snippet.includes(prefix?'春/夏/秋/冬':'Spring/Summer/Autumn/Winter'),'Season values need labeled, readable search summaries');
    assert.ok(!search.some(e=>e.url.endsWith(`#recipe-${item.id}`)),'The more complete equipment profile must not compete with a duplicate recipe answer');
    assert.ok(crafting.split(`id="recipe-${item.id}"`)[1]?.split('</tr>')[0].includes(`#farm-${item.id}`),'Keep the old recipe anchor and link it to the equipment profile');
  }
  assert.ok(fs.readFileSync(path.join(root,prefix,'database.html'),'utf8').includes('farming-fields#farm-equipment'));
}
console.log('PASS: farm equipment keeps source values and absent fields distinct.');
