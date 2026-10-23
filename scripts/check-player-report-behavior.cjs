const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const topics=JSON.parse(fs.readFileSync(path.join(root,'data/player-report.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'assets/js/player-report.js'),'utf8');
function fixture(zh,query='',clipboard){
  const html=fs.readFileSync(path.join(root,zh?'zh/tools/player-report.html':'tools/player-report.html'),'utf8');
  const node=(value='')=>({value,textContent:'',innerHTML:'',hidden:false,listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},focus(){this.focused=true;},select(){this.selected=true;}});
  const fields=Object.fromEntries(['topic','build','platform','context','observation','steps','expected','screenshot'].map(name=>[name,node()]));
  fields.topic.value=topics[0].id;fields.platform.value='Windows';
  fields.build.value=html.match(/<input\b[^>]*name="build"[^>]*value="([^"]*)"/)?.[1]??'';
  const form=node(),empty=node(),output=node(),preview=node(),route=node(),routeLabel=node(),prompt=node(),checklist=node(),status=node(),copy=node(),steam=node(),email=node(),hint=node(),nav=node(),alternate=node();
  const location=new URL('https://theranchersguide.com/'+(zh?'zh/':'')+'tools/player-report'+query),events={},timers=[];
  nav.href='https://theranchersguide.com/'+(zh?'':'zh/')+'tools/player-report';alternate.href=nav.href;
  const elements={'[data-player-report-form]':form,'[data-report-empty]':empty,'[data-report-output]':output,'[data-report-case]':hint};
  const outputs={'[data-report-preview]':preview,'[data-report-route]':route,'[data-report-route-label]':routeLabel,'[data-report-prompt]':prompt,'[data-report-checklist]':checklist,'[data-report-status]':status,'[data-report-copy]':copy,'[data-report-steam]':steam,'[data-report-email]':email};
  form.elements={namedItem:name=>fields[name]};form.querySelector=selector=>fields[selector.match(/name=["']?([^"'\]]+)/)?.[1]]||null;
  output.querySelector=selector=>outputs[selector]||null;
  const sharedNavigation=require('../assets/js/main.js');
  const history={replaceState(_state,_title,url){location.href=new URL(url,location).href;nav.href=sharedNavigation.languageContextHref(nav.href,location.pathname,location.search,location.hash);}};
  vm.runInNewContext(source,{document:{documentElement:{lang:zh?'zh-CN':'en'},querySelector:selector=>elements[selector]||null,querySelectorAll:()=>[nav,alternate],getElementById:id=>id==='player-report-config'?{textContent:JSON.stringify(topics)}:null},FormData:function(){this.get=name=>fields[name]?.value;},window:{location,history,addEventListener(type,fn){(events[type]??=[]).push(fn);},setTimeout(fn){timers.push(fn);},open(){}},location,history,URL,URLSearchParams,navigator:clipboard?{clipboard:{writeText:clipboard}}:{},Promise,console},{filename:'assets/js/player-report.js'});
  const fire=(element,type,event={})=>(element.listeners[type]||[]).forEach(fn=>fn(event));
  return{fields,form,output,preview,route,status,copy,hint,nav,alternate,location,events,timers,fire,ready(){fields.observation.value='The roof disappeared after removing a piece.';fields.steps.value='Recorded the piece and attached equipment.';fire(form,'input');}};
}
async function run(mode='all'){
  for(const zh of [false,true]){
    if(mode==='all'||mode==='version'){
      const rig=fixture(zh);assert.equal(rig.fields.build.value,'','Player build must not default to a source snapshot');
      rig.ready();assert.ok(rig.preview.value.includes(zh?'版本: 未填写':'Build: Not provided'),'Unknown player version must be explicit');
      rig.fields.build.value='0.8.10.871';rig.fire(rig.form,'input');assert.ok(rig.preview.value.includes('0.8.10.871'),'Preserve explicit player version');
      rig.fields.build.value='';rig.fire(rig.form,'input');assert.ok(!rig.preview.value.includes('0.8.10.842'),'Clearing must never reinsert the source baseline');
    }
    if(mode==='all'||mode==='topic'){
      const rig=fixture(zh,'?topic=building&case=demolition');
      assert.equal(rig.fields.topic.value,'building','A demolition handoff must not start as an animal report');
      rig.ready();assert.equal(new URL(rig.route.href,rig.location).pathname,(zh?'/zh':'')+'/guides/building-construction');
      assert.equal(new URL(rig.route.href,rig.location).hash,'#remodelling-safety','Known case needs the actual safety answer, not generic power help');
      assert.equal(rig.hint.hidden,false,'The existing answer should be available before drafting a report');
      for(const link of [rig.nav,rig.alternate]){const url=new URL(link.href,rig.location);assert.equal(url.searchParams.get('topic'),'building');assert.equal(url.searchParams.get('case'),'demolition');assert.ok(!url.searchParams.has('observation'));}
      rig.fields.build.value='0.8.10.871';rig.fields.topic.value='animals';rig.fire(rig.form,'change',{target:rig.fields.topic});
      assert.equal(rig.fields.build.value,'0.8.10.871');assert.ok(rig.fields.observation.value.includes('roof disappeared'));
      assert.equal(rig.location.searchParams.get('topic'),'animals');assert.equal(rig.location.searchParams.get('case'),null,'Changing topic removes incompatible case');
      assert.equal(rig.hint.hidden,true);assert.equal(new URL(rig.nav.href).searchParams.get('case'),null);
      rig.location.search='?topic=building&case=demolition';(rig.events.popstate||[]).forEach(fn=>fn());
      assert.equal(rig.fields.topic.value,'building');assert.equal(rig.fields.build.value,'0.8.10.871');assert.ok(rig.preview.value.includes('roof disappeared'));
      const invalid=fixture(zh,'?topic=unrecognised&case=demolition');invalid.ready();assert.equal(invalid.fields.topic.value,'animals');assert.equal(invalid.hint.hidden,true);
      const base=fixture(zh,'?topic=building&case=unrecognised');base.ready();assert.ok(base.route.href.endsWith('/guides/electricity-power'),'Unknown case must retain the original building/power route');
    }
    if(mode==='all'||mode==='minimum'){
      const rig=fixture(zh);rig.ready();assert.equal(rig.output.hidden,false);
      rig.fields.steps.value='';rig.fire(rig.form,'input');
      assert.equal(rig.output.hidden,true);assert.equal(rig.preview.value,'','Invalidated drafts must not remain exportable');
    }
    if(mode==='all'||mode==='copy'){
      const rig=fixture(zh,'',()=>{throw new Error('Clipboard unavailable');});rig.ready();rig.fire(rig.copy,'click');
      assert.ok(rig.preview.focused&&rig.preview.selected,'Synchronous clipboard failure must leave a manually copyable draft');
      assert.ok(/Ctrl|手动|manual/.test(rig.status.textContent));
      const rejected=fixture(zh,'',()=>Promise.reject(new Error('Denied')));rejected.ready();rejected.fire(rejected.copy,'click');await new Promise(resolve=>setImmediate(resolve));
      assert.ok(rejected.preview.focused&&rejected.preview.selected);
      const missing=fixture(zh);missing.ready();missing.fire(missing.copy,'click');assert.ok(missing.preview.selected);
    }
    if(mode==='all'||mode==='race'){
      let failFirst,calls=0;
      const rig=fixture(zh,'',()=>++calls===1?new Promise((_resolve,reject)=>{failFirst=reject;}):Promise.resolve());
      rig.ready();rig.fire(rig.copy,'click');
      rig.fields.observation.value='A corrected report with an additional observed detail.';rig.fire(rig.form,'input');rig.fire(rig.copy,'click');
      await new Promise(resolve=>setImmediate(resolve));const status=rig.status.textContent;
      assert.ok(/Report copied|报告已复制/.test(status));
      failFirst(new Error('Old copy denied'));await new Promise(resolve=>setImmediate(resolve));
      assert.equal(rig.status.textContent,status,'A late failed copy must not overwrite the newer report result');
      assert.ok(!rig.preview.selected,'A stale copy must not steal focus');
    }
    if(mode==='all'||mode==='restore'){
      const rig=fixture(zh,'?topic=building&case=demolition');
      (rig.events.pageshow||[]).forEach(fn=>fn({persisted:false}));
      rig.fields.observation.value='Browser-restored observation after history return.';rig.fields.steps.value='Browser-restored steps without a new input event.';
      rig.fields.build.value='0.8.10.871';
      rig.timers.splice(0).forEach(fn=>fn());
      assert.equal(rig.output.hidden,false,'Browser-restored valid fields must regenerate output without another keystroke');
      assert.ok(rig.preview.value.includes('Browser-restored observation'));assert.ok(rig.preview.value.includes('0.8.10.871'));
    }
  }
  console.log('PASS: real bilingual player-report controller '+mode+'.');
}
module.exports=run;
if(require.main===module)run(process.argv[2]||'all').catch(error=>{console.error(error.message);process.exitCode=1;});
