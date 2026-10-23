const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),cp=require('node:child_process');
const preview=path.resolve(__dirname,'..');
const cli=require.main===module;
const script=(cli&&process.argv[2])||preview+'/assets/js/community.js';
const mode=(cli&&process.argv[3])||'all';
const source=fs.readFileSync(script,'utf8');
const unhandled=[];const onUnhandled=error=>unhandled.push(error);process.on('unhandledRejection',onUnhandled);
function fixture(locale,clipboard){
  const node=()=>({listeners:{},textContent:'',value:'',addEventListener(type,fn){this.listeners[type]=fn;},focus(){this.focused=true;},select(){this.selected=true;}});
  const form=node(),copy=node(),open=node(),send=node(),previewNode=node(),status=node();
  const values={topic:'Animals / coop',build:'',platform:'Windows',observation:'A chicken stopped eating after loading.',tried:'Checked the trough and recorded the count.'};
  form.querySelector=s=>({'[data-copy-question]':copy,'[data-open-steam]':open,'[data-send-report]':send}[s]||null);
  const selectors={'[data-question-builder]':form,'[data-question-preview]':previewNode,'[data-question-status]':status};
  const navigation={href:''},opened=[];
  vm.runInNewContext(source,{document:{documentElement:{lang:locale},querySelector:s=>selectors[s]||null,querySelectorAll:()=>[]},navigator:clipboard?{clipboard:{writeText:clipboard}}:{},window:{location:navigation,open:(...args)=>opened.push(args)},FormData:function(){this.get=name=>values[name];},Promise,console},{filename:script});
  return{form,copy,send,preview:previewNode,status,values,navigation,opened,click(){copy.listeners.click();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 if(mode==='all'){
  for(const scenario of ['denied','throw','missing','pending','success','race','version']){
   const output=cp.execFileSync(process.execPath,[__filename,script,scenario,preview+'/scripts/build-community.cjs'],{encoding:'utf8',maxBuffer:1024*1024});
   process.stdout.write(output);
  }
  return;
 }
 if(mode==='version'){
  const builderPath=process.argv[4]||preview+'/scripts/build-community.cjs';
  const builder=fs.readFileSync(builderPath,'utf8');
  const start=builder.indexOf('function renderQuestionBuilder(zh) {'),end=builder.indexOf('\nfunction renderPage(zh)',start);
  assert.ok(start>=0&&end>start,'Test the real generator function, not a hand-written form');
  const render=vm.runInNewContext('('+builder.slice(start,end).trim()+')',{data:{build:'0.8.10.842'},escapeHtml:value=>String(value??'')});
  for(const locale of ['en','zh-CN']){
   const html=render(locale==='zh-CN');
   const field=html.match(/<input\b[^>]*name="build"[^>]*>/)?.[0];
   assert.ok(field&&field.includes('value=""'),'A source snapshot build must not be guessed as the player report build');
   const rig=fixture(locale,()=>Promise.resolve());
   assert.match(rig.preview.value,locale==='en'?/Build: Not provided/:/版本: 未填写/);
   rig.values.build='0.8.10.871';rig.form.listeners.input();
   assert.ok(rig.preview.value.includes('0.8.10.871'),'An explicitly entered player build must be preserved exactly');
  }
  console.log('PASS: real EN/ZH template starts blank and controller preserves unknown or explicitly supplied report builds.');return;
 }
 if(mode==='race'){
  for(const locale of ['en','zh-CN']){
   let failFirst,calls=0;
   const rig=fixture(locale,()=>++calls===1?new Promise((_resolve,reject)=>{failFirst=reject;}):Promise.resolve());
   rig.click();rig.values.observation='A newer draft with a corrected observation.';rig.click();await flush();
   const latestStatus=rig.status.textContent;
   assert.match(latestStatus,/draft copied|草稿已复制/);
   failFirst(new Error('Old request denied'));await flush();
   assert.equal(rig.status.textContent,latestStatus,'An old clipboard failure must not overwrite the result of a newer copy');
   assert.ok(!rig.preview.selected,'A stale request must not steal focus or selection');
  }
  assert.equal(unhandled.length,0);console.log('PASS: older clipboard failures cannot overwrite a newer successful copy.');return;
 }
 for(const locale of ['en','zh-CN']){
  let copied='',release;
  const clipboard=mode==='missing'?null:mode==='denied'?()=>Promise.reject(new Error('Permission denied')):mode==='throw'?()=>{throw new Error('Clipboard unavailable');}:mode==='pending'?text=>{copied=text;return new Promise(resolve=>{release=resolve;});}:text=>{copied=text;return Promise.resolve();};
  const rig=fixture(locale,clipboard);rig.click();
  if(mode==='pending'){assert.doesNotMatch(rig.status.textContent,/draft copied|已复制/);release();}
  await flush();
  if(['denied','missing','throw'].includes(mode)){
   assert.ok(rig.preview.focused&&rig.preview.selected,locale+': failed copy must leave a selected manual-copy draft');
   assert.match(rig.status.textContent,/Ctrl|manual|手动|复制失败/);
   assert.doesNotMatch(rig.status.textContent,/draft copied|草稿已复制/);
   assert.ok(rig.preview.value.includes(rig.values.observation));
  }else{assert.match(rig.status.textContent,/draft copied|草稿已复制/);assert.equal(copied,rig.preview.value);}
 }
 assert.equal(unhandled.length,0,'Clipboard failures must not create unhandled rejections');
 console.log('PASS: EN/ZH shipped-controller boundary '+mode+' reports the real clipboard result.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>process.removeListener('unhandledRejection',onUnhandled));
