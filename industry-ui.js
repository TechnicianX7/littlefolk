import {drawLanes,connectionRows} from './lanes-ui.js';
import {laneMetrics,refreshLanes} from './lanes.js';
import {BUILDING_PURPOSE} from './bloom.js';
import {BUILDINGS,TILE,buildingAt} from './world.js';
import {ITEMS,EXTRA_BUILDINGS,RECIPES,RESEARCH,isHub,stock,formatGoods,connect,research,upgradeLogistics,removeRoute,demolish,cargoPosition,statistics,compatible,connectStorage,optimizeStorage,restoreFlowSettings} from './industry.js';
import {drawFoodBuilding,buildingGuideHTML} from './bloom-ui.js';
import {goodsHTML} from './qol-ui.js';
const $=id=>document.getElementById(id);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n>=10000?(n/1000).toFixed(1)+'k':String(Math.floor(n));
const r=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
const poly=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
function gear(c,x,y,color='#dabd76'){r(c,x-4,y-2,8,5,color);r(c,x-2,y-4,5,9,color);r(c,x-5,y-1,10,3,color);r(c,x-1,y-5,3,11,color);r(c,x-1,y-1,3,3,'#6d7960');}
function crate(c,x,y,item,amount=1){r(c,x-4,y+2,3,2,'#555e4b');r(c,x+2,y+2,3,2,'#555e4b');r(c,x-5,y-4,10,6,'#90744e');r(c,x-4,y-4,8,4,ITEMS[item]?.color||'#c6ac75');r(c,x-5,y-1,10,1,'#e6c98a');r(c,x-1,y-4,1,6,'#9c8254');if(amount>=6){r(c,x-3,y-7,6,3,ITEMS[item]?.color||'#c6ac75');}}
export function drawIndustryBuilding(c,type){
  if(drawFoodBuilding(c,type))return true;
  if(!EXTRA_BUILDINGS[type])return false;
  if(type==='windmill'){
    poly(c,[[9,31],[12,1],[23,1],[27,31]],'#b09b72');poly(c,[[11,29],[14,2],[21,2],[24,29]],'#e1cf9d');
    poly(c,[[9,3],[17,-5],[26,3]],'#8f7955');r(c,14,23,7,9,'#695e43');r(c,15,24,5,8,'#42543f');r(c,16,9,4,5,'#719387');r(c,9,31,18,2,'#a79970');
    r(c,15,9,4,4,'#d0b372');return true;
  }
  if(type==='mine'){
    poly(c,[[-2,30],[1,10],[9,1],[25,2],[34,15],[35,32]],'#899080');poly(c,[[1,17],[8,5],[22,4],[30,16]],'#b0b6a2');poly(c,[[4,30],[5,16],[11,11],[22,12],[28,18],[29,31]],'#505e4b');r(c,7,14,3,19,'#a88858');r(c,25,14,3,19,'#a88858');r(c,6,13,23,3,'#c3a773');r(c,14,22,10,7,'#4a5043');crate(c,19,30,'ore');r(c,1,29,5,4,'#adb99d');return true;
  }
  if(type==='kiln'){
    poly(c,[[1,31],[1,14],[6,6],[24,6],[31,16],[31,31]],'#9c7659');poly(c,[[3,24],[3,14],[8,8],[24,8],[29,16],[29,24]],'#c39870');
    for(let y=12;y<27;y+=5)r(c,4,y,24,1,'#a47e5d');r(c,13,23,9,9,'#4e5040');r(c,15,27,5,4,'#f1b46b');r(c,16,28,2,3,'#f4da8a');r(c,12,-2,7,10,'#81735b');r(c,11,-3,9,2,'#b5a285');r(c,25,28,8,4,'#5e6557');return true;
  }
  const isMetal=['smelter','stoneworks'].includes(type),roof=type==='gearworks'?'#749599':type==='skypost'?'#a496b0':type==='forester'?'#809755':isMetal?'#879c8b':'#b18c5e';
  r(c,1,10,30,22,isMetal?'#af957a':'#c4ae80');r(c,1,14,30,1,isMetal?'#947d67':'#a58e64');r(c,1,22,30,1,isMetal?'#947d67':'#a58e64');r(c,1,30,30,2,'#887957');
  poly(c,[[-3,11],[5,1],[25,1],[35,11],[35,15],[-3,15]],roof);r(c,0,11,32,2,'#d1c7a0');r(c,6,3,17,2,'#ffffff26');r(c,1,15,3,18,'#807453');r(c,29,15,3,18,'#807453');r(c,13,23,8,9,'#565f47');
  if(type==='sawmill'){
    r(c,0,24,33,3,'#806945');r(c,1,24,31,1,'#e1bf7a');r(c,8,20,20,4,'#c7975e');r(c,8,20,20,1,'#edc985');gear(c,16,21,'#b7c5b4');r(c,1,28,9,4,'#9f764e');r(c,23,28,9,4,'#d8b581');
  }else if(type==='mason'){
    for(let j=0;j<3;j++){r(c,4+j*7,24+(j%2)*4,6,3,'#b98368');r(c,4+j*7,24+(j%2)*4,6,1,'#e0ac89');}r(c,10,16,12,5,'#d6c59c');r(c,14,17,4,3,'#af8466');
  }else if(type==='smelter'){
    r(c,25,-6,6,19,'#8c806b');r(c,25,-6,6,2,'#b3a28b');r(c,11,20,13,12,'#6e6552');r(c,13,23,9,9,'#4d5142');r(c,15,27,6,4,'#ec9e5c');r(c,17,26,2,4,'#f8d47c');r(c,1,29,9,3,'#bfd1bd');
  }else if(type==='gearworks'){
    gear(c,17,16);r(c,4,25,7,5,'#729789');r(c,25,25,3,7,'#dabd76');
  }else if(type==='forester'){
    poly(c,[[5,16],[0,26],[10,26]],'#62884d');r(c,4,26,2,7,'#9e7e51');r(c,22,26,10,5,'#bb9661');r(c,22,26,10,1,'#e1c18a');
  }else if(type==='stoneworks'){
    gear(c,9,24,'#b1beaf');gear(c,25,24,'#b1beaf');r(c,13,29,9,4,'#91a592');
  }else if(type==='skypost'){
    r(c,5,-7,2,14,'#947c54');poly(c,[[7,-6],[17,-3],[7,0]],'#e7c77c');r(c,9,17,15,8,'#f0dfb3');poly(c,[[9,17],[16,22],[24,17]],'#c6a577');r(c,3,26,6,8,'#9580a4');r(c,2,25,8,2,'#e6ca8a');r(c,25,28,5,4,'#c7b583');
  }
  r(c,3,33,5,1,'#849959');r(c,26,33,4,1,'#849959');return true;
}
const CATEGORIES={Food:['vegetable','kitchen','orchard','fishery'],Village:['hut','path','depot','lumber','quarry','garden','workshop'],Craft:['windmill','sawmill','mason','kiln'],Metal:['mine','smelter','gearworks'],Wonders:['forester','stoneworks','skypost']};
export function installIndustryUI(api){
  let category='Village',tab='guide',linkFrom=null,lastInspect='',inspectId=null,showRoutes=false,postcards=[];
  const S=api.getState;
  const nav=document.createElement('nav');nav.className='workbar';nav.setAttribute('aria-label','Building categories');
  nav.innerHTML=Object.keys(CATEGORIES).map(k=>`<button class="category${k===category?' active':''}" data-category="${k}">${k}</button>`).join('')+'<button class="bookbutton" id="industryBtn">Workshop book <span id="factoryBadge"></span></button>';
  document.querySelector('.dock').prepend(nav);
  const networkButton=document.createElement('button');networkButton.id='networkBtn';networkButton.className='category';networkButton.textContent='⇄ Lanes';networkButton.setAttribute('aria-pressed','false');$('industryBtn').before(networkButton);
  const hint=document.createElement('div');hint.id='routeHint';hint.className='routehint';hint.hidden=true;hint.innerHTML='<span id="routeHintText"></span><button class="secondary" id="cancelRoute">Cancel</button>';
  document.querySelector('.bottombar').prepend(hint);
  const more=document.createElement('div');more.id='factoryInspector';$('inspector').append(more);
  const back=document.createElement('div');back.id='industryBack';back.className='sheetback';back.hidden=true;
  back.innerHTML='<section class="sheet factorybook" role="dialog" aria-modal="true" aria-labelledby="factoryTitle" tabindex="-1"><div class="sheetheader"><div><div class="eyebrow">Village Works · 2.3</div><h2 id="factoryTitle">The workshop book</h2></div><button class="iconbutton" id="closeIndustry" aria-label="Close workshop book">×</button></div><p>A clever little village. Everything has somewhere to go.</p><nav class="booktabs" id="factoryTabs"></nav><div id="factoryContent"></div><div class="villagefooter">The village rests while you read. No rush.</div></section>';
  $('app').append(back);
  const diag=document.createElement('button');diag.className='secondary wide';diag.id='diagnosticsBtn';diag.textContent='Export stability report';$('resetBtn').before(diag);
  diag.onclick=()=>{const blob=new Blob([JSON.stringify({version:'2.3.0',errors:api.diagnostics(),buildings:S().buildings.length,folk:S().folk.length,routes:S().industry.routes.length},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='littlefolk-stability.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
  function cancelLink(){linkFrom=null;$('routeHint').hidden=true;api.onContext?.();}
  function changeCategory(k){category=k;cancelLink();api.clearSelection();for(const b of nav.querySelectorAll('[data-category]')){b.classList.toggle('active',b.dataset.category===category);b.setAttribute('aria-pressed',String(b.dataset.category===category));}for(const b of $('buildings').children)b.hidden=!CATEGORIES[k].includes(b.dataset.build);$('buildings').scrollLeft=0;}
  function title(id){const b=S().buildings.find(b=>b.id===id);return b?`${BUILDINGS[b.type].short} (${b.x},${b.y})`:'Removed building';}
  function startLink(id){api.clearSelection();linkFrom=id;$('routeHint').hidden=false;$('routeHintText').textContent=`From ${title(id)} → tap a highlighted building to receive its goods.`;api.closeModal('industryBack');api.onContext?.();}
  function renderBook(){
    const s=S(),i=s.industry;
    $('factoryTabs').innerHTML=['guide','flow','research','routes'].map(k=>`<button class="secondary${tab===k?' active':''}" data-tab="${k}">${{guide:'Getting started',flow:'Goods & flow',research:'Research',routes:'Cargo routes'}[k]}</button>`).join('');
    let html='';
    if(tab==='guide')html=`<div class="visualGuide"><div class="guideStep"><strong>1 · Add wind</strong><div class="recipebig">Windmill → workshops</div><p>Build close enough to sit inside the windmill’s ring.</p><button class="primary" data-guide-build="windmill">Place a windmill</button></div><div class="guideStep"><strong>2 · Give goods a journey</strong><div class="recipebig">Home → Sawmill → Home</div><p>Tap a workshop, then <b>Connect storage</b>. Wagons do the rest. Manual routes are under More options.</p><button class="secondary" data-guide-build="sawmill">Place a sawmill</button></div><div class="guideStep"><strong>3 · Grow a new chapter</strong><div class="recipebig">12 planks + 8 bricks → new workshops</div><p>Finished goods must arrive home before you spend them.</p><button class="secondary" data-guide-research="1">See the next chapter</button></div></div>`;
    if(tab==='flow'){
      html='<div class="tablewrap"><table class="flowtable"><thead><tr><th>Good</th><th>Home</th><th>Output buffers</th><th>Traveling</th><th>Made / min</th><th>Used / min</th></tr></thead><tbody>';
      for(const [k,d] of Object.entries(ITEMS)){const v=statistics(s,k);html+=`<tr><th><span class="goodsdot" style="background:${d.color}"></span>${d.name}</th><td>${fmt(v.stored)}</td><td>${fmt(v.buffered)}</td><td>${fmt(v.transit)}</td><td>${fmt(v.made)}</td><td>${fmt(v.used)}</td></tr>`;}
      html+='</tbody></table></div><p class="footnote">Factory rates count the last 60 simulation seconds, not a theoretical maximum. Wood/stone gathered by folk are not included in factory production rates. Home stock can be spent; output buffers need a delivery route.</p><div class="chapter"><h3>Save room for home</h3><div class="smallactions">';
      for(const k of ['wood','stone'])html+=`<label class="numberSetting">Keep ${k}<input type="number" min="0" max="1000" step="1" data-reserve-input="${k}" value="${i.reserves[k]}" aria-label="${k} reserved for building"></label>`;
      html+='</div><p>Set the amount to keep for building. Wagons can only take the surplus. Changes save when you leave the field.</p><h3>Stock targets</h3><p>Workshops stop starting batches once this much unallocated product is ready. Ingredients already assigned to other workshops do not count. Supplies set aside for wishes and building are excluded, so a full savings pile cannot starve downstream workshops. Set a target below. Existing batches can finish.</p><div class="smallactions">';
      for(const [k,n] of Object.entries(i.limits))html+=`<label class="numberSetting">${ITEMS[k].name}<input type="number" min="1" max="10000" step="1" data-limit-input="${k}" value="${n}" aria-label="${ITEMS[k].name} stock target"></label>`;
      html+='</div></div><div class="chapter"><h3>Workshop health</h3>';
      const machines=s.buildings.filter(b=>RECIPES[b.type]);if(!machines.length)html+='<p>No workshops yet. Start with Craft → Windmill and Sawmill.</p>';
      for(const b of machines){const m=i.machines[b.id];html+=`<div class="machinerow"><b>${esc(title(b.id))}</b><span>${esc(m?.status||'Ready')}</span></div>`;}html+='</div>';
    }
    if(tab==='research'){
      for(let n=0;n<RESEARCH.length;n++){const q=RESEARCH[n],done=i.tier>n,current=i.tier===n;html+=`<div class="chapter${done?' completed':''}"><div class="eyebrow">Chapter ${n+1}${done?' · Complete':''}</div><h3>${q.name}</h3><p>${q.unlocks}</p><div class="smallactions">${Object.entries(q.cost).map(([k,v])=>`<span class="costpill${stock(s,k)>=v?' enough':''}">${Math.min(v,stock(s,k))} / ${v} ${ITEMS[k].name.toLowerCase()}</span>`).join('')}</div>${current?'<button class="primary wide" id="researchBtn">Build this next chapter</button>':done?'': '<p class="footnote">Finish the earlier chapter first.</p>'}</div>`;}
      html+=`<div class="chapter"><h3>Our little wagons · Level ${i.logistics+1}</h3><p>${3+i.logistics*3} items per wagon · ${1+i.logistics} wagons per route · ${(2.2+i.logistics*.6).toFixed(1)} tiles per second before path bonuses.</p>${i.logistics<2?`<p>Next upgrade: ${12+i.logistics*8} planks + ${8+i.logistics*6} iron. Unlocks after chapter ${i.logistics===0?2:3}.</p><button class="secondary" id="wagonUpgrade">Improve the wagons</button>`:'<p>Our finest little freight department.</p>'}</div>`;
      if(i.tier===3)html+=`<div class="chapter"><h3>The sky has a mailbox.</h3><p>Your star-post office has sent <b>${i.postcards}</b> letters. Feed it planks and gears, give it wind power, and watch the next lantern leave. Every letter brings a new village memory.</p></div>`;
    }
    if(tab==='routes'){
      html=`<p>One-way cargo routes. Each keeps its goods physically in transit until arrival. Maximum: 64 routes.</p><button class="secondary" id="toggleRoutes">${showRoutes?'Hide':'Show'} route tracks on the map</button>`;
      html+='<div class="networkGuide">Packed-earth lanes are built with cargo links. Opposite deliveries share a lane; paved tiles make both faster. Direct workshop links stay yours. Older storage stops can be re-planned with your confirmation.</div><div class="smallactions"><button class="primary" id="optimizeStorage">Re-plan storage links</button><button class="secondary" id="restoreFlow">Restore sensible stock settings</button></div>';
      if(!i.routes.length)html+='<div class="chapter"><h3>No routes, yet.</h3><p>Tap a hut or stockpile on the map → Connect output → tap a sawmill. Then connect the sawmill back home to collect its planks.</p></div>';
      for(const q of i.routes){const cargo=i.shipments.filter(p=>p.route===q.id).map(p=>`${p.amount} ${ITEMS[p.item].name.toLowerCase()}`).join(', ')||'Empty wagons';html+=`<div class="chapter routecard"><h3>${esc(title(q.from))} → ${esc(title(q.to))}</h3><p>${esc(q.status)} · ${q.delivered} delivered · ${laneMetrics(s,q).tiles} tiles · ~${laneMetrics(s,q).seconds.toFixed(1)}s one way</p><p class="footnote">${cargo}</p><div class="smallactions"><button class="secondary" data-route-pause="${q.id}">${q.paused?'Resume':'Pause'}</button><button class="secondary" data-route-filter="${q.id}">Cargo: ${q.filter==='auto'?'Auto':ITEMS[q.filter].name}</button><button class="secondary" data-route-remove="${q.id}">Remove route</button></div></div>`;}
    }
    $('factoryContent').innerHTML=html;
  }
  nav.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='networkBtn'){showRoutes=!showRoutes;networkButton.setAttribute('aria-pressed',String(showRoutes));api.toast(showRoutes?'Delivery arrows on. Select a workshop: blue in, gold out.':'Delivery arrows off. The lanes stay visible.');return;}if(b.dataset.category)changeCategory(b.dataset.category);else if(b.id==='industryBtn'||b.closest('#industryBtn')){renderBook();api.openModal('industryBack');}};
  $('factoryTabs').onclick=e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;renderBook();}};
  $('closeIndustry').onclick=()=>api.closeModal('industryBack');back.onclick=e=>{if(e.target===back)api.closeModal('industryBack');};$('cancelRoute').onclick=cancelLink;
  $('factoryContent').onclick=e=>{
    const b=e.target.closest('button');if(!b)return;const s=S(),i=s.industry;let result;
    if(b.dataset.guideBuild){api.closeModal('industryBack');api.chooseBuild(b.dataset.guideBuild);return;}
    if(b.dataset.guideResearch){tab='research';renderBook();return;}
    if(b.id==='optimizeStorage'){const existing=i.routes.some(q=>!q.managed&&[q.from,q.to].some(id=>isHub(s.buildings.find(b=>b.id===id))));if(existing&&!confirm('Choose faster storage stops? This can change your older or manually chosen storage connections. Direct workshop-to-workshop links and all goods are kept.'))return;const r=optimizeStorage(s,existing);api.changed();renderBook();api.toast(r.count?r.count+' auto links shortened by '+r.saved+' tiles. Direct workshop links kept.':'Auto storage links already use the nearest reachable loading points. Direct workshop links kept.');return;}
    if(b.id==='restoreFlow'){restoreFlowSettings(s);api.changed();renderBook();api.toast('Building reserves and production targets restored. Your goods and custom links are unchanged.');return;}
    if(b.id==='researchBtn')result=research(s);
    if(b.id==='wagonUpgrade')result=upgradeLogistics(s);
    if(b.id==='toggleRoutes'){showRoutes=!showRoutes;networkButton.setAttribute('aria-pressed',String(showRoutes));}
    if(b.dataset.reserve){const k=b.dataset.reserve,options=k==='wood'?[0,12,24,48,96]:[0,8,16,32,64];i.reserves[k]=options[(options.indexOf(i.reserves[k])+1)%options.length];}
    if(b.dataset.limit){const k=b.dataset.limit,options=[16,32,48,64,128,256,512];i.limits[k]=options[(options.indexOf(i.limits[k])+1)%options.length];}
    if(b.dataset.routePause){const r=i.routes.find(r=>r.id===Number(b.dataset.routePause));if(r)r.paused=!r.paused;}
    if(b.dataset.routeRemove&&confirm('Remove this route? Goods already traveling will return to shared storage.'))removeRoute(s,Number(b.dataset.routeRemove));
    if(b.dataset.routeFilter){const q=i.routes.find(q=>q.id===Number(b.dataset.routeFilter));if(q){const from=s.buildings.find(b=>b.id===q.from),to=s.buildings.find(b=>b.id===q.to),out=isHub(from)?Object.keys(ITEMS):[RECIPES[from.type].output],input=isHub(to)?Object.keys(ITEMS):Object.keys(RECIPES[to.type].input),options=['auto',...out.filter(k=>input.includes(k)&&k!=='star')];q.filter=options[(options.indexOf(q.filter)+1)%options.length];}}
    if(result)api.toast(result.ok?'A new little possibility.':result.reason,!!result.ok,5000);api.changed();renderBook();
  };
  $('factoryContent').addEventListener('change',e=>{const el=e.target,k=el.dataset.reserveInput||el.dataset.limitInput;if(!k)return;const bag=el.dataset.reserveInput?S().industry.reserves:S().industry.limits;const low=el.dataset.reserveInput?0:1;const value=Number(el.value);if(!Number.isFinite(value)||!Number.isInteger(value)||value<low||value>(el.dataset.reserveInput?1000:10000)){el.value=bag[k];api.toast('Enter a whole number in the shown range.');return;}bag[k]=value;api.changed();api.toast('Stock setting saved.');});
  more.onclick=e=>{
    const b=e.target.closest('button');if(!b)return;const s=S(),id=Number(more.dataset.id),m=s.industry.machines[id];
    if(b.dataset.inspectLink){api.inspectBuilding(Number(b.dataset.inspectLink));return;}
    if(b.dataset.guide){api.chooseBuild(b.dataset.guide);return;}
    if(b.dataset.action==='connect')startLink(id);
    if(b.dataset.action==='storage'){const r=connectStorage(s,id);api.changed();api.toast(r.ok?(r.count?'Delivery loop connected. Watch the wagons.':'This workshop is already connected to storage.'):r.reason);}
    if(b.dataset.action==='wind'){api.chooseBuild('windmill');return;}
    if(b.dataset.action==='move'){api.move?.(id);return;}
    if(b.dataset.action==='pause'&&m){m.paused=!m.paused;lastInspect='';api.changed();}
    if(b.dataset.action==='routes'){tab='routes';renderBook();api.openModal('industryBack');}
    if(b.dataset.action==='remove'&&confirm('Reclaim this building? Half its building materials return home, plus all buffered, traveling, and in-process goods. Homes cannot be removed.')){const result=demolish(s,id);if(result.ok){api.clearSelection();lastInspect='';api.changed();}else api.toast(result.reason);}
  };
  function inspect(kind,b){
    if(kind!=='building'){more.hidden=true;lastInspect='';return;}more.hidden=false;inspectId=b.id;more.dataset.id=b.id;
    const s=S(),m=s.industry.machines[b.id],recipe=RECIPES[b.type],signature=b.id+':'+b.type+':'+!!m?.paused;
    if(lastInspect!==signature){lastInspect=signature;more.innerHTML=`${m?'<div class="machinestatus" id="machineStatus" role="status"></div><div class="progress"><span id="machineProgress"></span></div><div class="recipeFlow" id="machineRecipe"></div><div class="buffers" id="machineBuffers"></div><div id="machineSuppliers" class="relatedBuildings"></div><button class="primary wide" data-action="wind" id="fixWind">Place a nearby windmill</button><button class="primary wide" data-action="storage">Connect storage</button>':''}${b.type==='windmill'?'<div class="recipeFlow"><b>Wind → nearby workshops</b><span>8 power · 9-tile reach</span></div><p class="taskcopy">The blue ring shows which workshops it powers. Add a second mill when power runs low.</p>':''}<div class="connectionList" id="connectionList"></div><div class="purposeLine">${BUILDING_PURPOSE[b.type]?.[0]||BUILDINGS[b.type].short}</div><div class="smallactions"><button class="secondary" data-action="move">Move building</button>${isHub(b)?'<button class="primary" data-action="connect">Send goods…</button>':''}</div><details class="machineDetails"><summary>More options</summary><div class="smallactions">${recipe&&recipe.output!=='star'?'<button class="secondary" data-action="connect">Send goods…</button>':''}${m?`<button class="secondary" data-action="pause">${m.paused?'Resume':'Pause'}</button>`:''}${isHub(b)||recipe?'<button class="secondary" data-action="routes">Routes</button>':''}${b.type!=='hut'?'<button class="secondary reclaim" data-action="remove">Reclaim building</button>':''}</div></details>`;}
    if(m){
      $('inspectText').hidden=true;$('inspectStats').textContent=`${recipe.power?'Wind '+Math.round(m.power*100)+'%':'No wind needed'} · ${m.cycles} batches made`;
      const incoming=s.industry.routes.filter(q=>q.to===b.id&&!q.paused),outgoing=s.industry.routes.some(q=>q.from===b.id&&!q.paused);
      let message=m.paused?'Paused by you':recipe.power&&m.power<=0?'Needs wind power':!outgoing&&recipe.output!=='star'?'Finished goods need a route home':m.status;
      if(m.status.startsWith('Waiting for')&&!incoming.length)message='Needs supplies. Connect storage below.';
      if(m.status.startsWith('Waiting for')&&incoming.some(q=>isHub(s.buildings.find(v=>v.id===q.from)))){
        const k=Object.keys(recipe.input).find(k=>['wood','stone'].includes(k)&&stock(s,k)<=(s.industry.reserves[k]||0));if(k)message=`${ITEMS[k].name} is kept for building. Wait for more, or lower its reserve in Goods & flow.`;
      }
      const suppliers=[...new Set(Object.keys(recipe.input).flatMap(k=>Object.entries(RECIPES).filter(([,r])=>r.output===k).map(([t])=>t)))];
      $('machineSuppliers').innerHTML=suppliers.length?'<span>Make its ingredients</span>'+suppliers.map(t=>`<button class="chainLink" data-guide="${t}">${BUILDINGS[t].short}</button>`).join(''):'';
      $('machineStatus').textContent=message;$('machineProgress').style.width=Math.min(100,m.progress/recipe.seconds*100)+'%';
      $('machineRecipe').innerHTML=`<div>${Object.keys(recipe.input).length?goodsHTML(recipe.input):'<span class="goodchip">'+(recipe.power?'Wind':'Grows itself')+'</span>'}</div><b class="flowArrow" aria-label="becomes">↓</b><div>${goodsHTML({[recipe.output]:recipe.amount})}</div><small>One batch every ${recipe.seconds}s${recipe.power?' at full wind':''}</small>`;
      $('machineBuffers').innerHTML=`<div><b>Supplies here</b>${goodsHTML(m.input)||'<span>Waiting for a wagon</span>'}</div><div><b>Ready to ship</b>${goodsHTML(m.output)||'<span>Nothing waiting</span>'}</div>`;$('fixWind').hidden=!recipe.power||m.power>0;
    }else{$('inspectText').hidden=false;if(isHub(b)){$('inspectText').textContent='Folk bring materials here. Workshops can collect from here and send finished goods home.';}}
    const rows=connectionRows(s,b.id),list=$('connectionList');if(list){list.hidden=!rows.length;const html=rows.length?'<h4>DELIVERIES · '+rows.length+' connections</h4>'+rows.map(r=>`<button class="connectionRow ${r.out?'out':'in'}" data-inspect-link="${r.other}"><span class="arrow">${r.out?'↑':'↓'}</span><span><b>${r.out?'To':'From'} ${esc(r.label)}</b><small>${esc(r.items)} · ${r.blocked?'Blocked':r.paused?'Paused':r.tiles+' tiles · ~'+r.seconds.toFixed(1)+'s'}</small></span></button>`).join(''):'';if(list._html!==html){list._html=html;list.innerHTML=html;}}
  }
  function update(){
    const s=S(),i=s.industry;const legend=$('laneLegend'),view=api.getView?.();if(legend){legend.hidden=!!document.querySelector('.sheetback:not([hidden])')||!(showRoutes||view?.selection?.kind==='building'&&i.routes.some(r=>r.from===view.selection.id||r.to===view.selection.id));}
if(legend){const html=view?.selection?.kind==='building'?'<b class="in">Blue → in</b> · <b class="out">Gold → out</b> · This building only':'Shared delivery lanes · Select a workshop to trace its goods';if(legend.innerHTML!==html)legend.innerHTML=html;}
for(const b of document.querySelectorAll('.buildcard')){const d=EXTRA_BUILDINGS[b.dataset.build];if(!d)continue;const locked=i.tier<d.tier||s.delivered<d.unlock;b.classList.toggle('locked',locked);b.querySelector('.lockmark').hidden=!locked;
      b.querySelector('small').textContent=i.tier<d.tier?`Research ${d.tier}`:s.delivered<d.unlock?`${d.unlock} delivered`:`${d.wood}w · ${d.stone}s${Object.keys(d.extra).length?' + goods':''}`;
      b.setAttribute('aria-label',`${d.name}. ${locked?'Locked. ':''}${d.desc} Costs ${formatGoods({wood:d.wood,stone:d.stone,...d.extra})}.`);
    }
    $('factoryBadge').textContent=i.postcards?'✦ '+i.postcards:i.tier?'Ch. '+(i.tier+1):'';
    if(s.folk.length>=2&&s.delivered>=28){
      const q=RESEARCH[i.tier];$('goalTag').textContent='Timber & Tinkering';
      if(!s.buildings.some(b=>b.type==='sawmill')){$('goalTitle').textContent='A little industry.';$('goalText').textContent='Craft → Windmill + Sawmill. The Workshop book shows your first cargo loop.';$('goalProgress').style.width='10%';}
      else if(q){$('goalTitle').textContent=q.name;$('goalText').textContent='Bring home '+formatGoods(q.cost)+'. Open Research in the Workshop book.';const ratio=Object.entries(q.cost).reduce((sum,[k,v])=>sum+Math.min(1,stock(s,k)/v),0)/Object.keys(q.cost).length;$('goalProgress').style.width=ratio*100+'%';}
      else{$('goalTitle').textContent='The sky has a mailbox.';$('goalText').textContent=`${i.postcards} letters sent. Feed planks and gears to the star-post office, or make your supply chains a little cleverer.`;$('goalProgress').style.width='100%';}
    }
    if(linkFrom!==null&&!s.buildings.some(b=>b.id===linkFrom))cancelLink();
  }
  function mapTap(x,y){if(linkFrom===null)return false;const b=buildingAt(S(),x,y);if(!b){api.toast('Tap a workshop, hut or stockpile to finish this route.');return true;}const result=connect(S(),linkFrom,b.id);if(result.ok){cancelLink();api.toast('Delivery lane connected. Arrows show which way the goods travel.',true);api.changed();}else api.toast(result.reason,false,5000);return true;}
  function drawBelow(c,selection,selected,hover){
    const s=S(),mill=selection?.kind==='building'?s.buildings.find(b=>b.id===selection.id&&b.type==='windmill'):null;
    if(mill||(selected==='windmill'&&hover)){const p=mill||hover;c.save();c.strokeStyle='#d6f3e5bb';c.fillStyle='#79bfd71a';c.lineWidth=.7;c.setLineDash([3,3]);c.beginPath();c.arc((p.x+1)*TILE,(p.y+1)*TILE,9*TILE,0,Math.PI*2);c.fill();c.stroke();c.restore();}
    if(selected==='fishery'&&hover){c.save();c.strokeStyle='#9dd9e8';c.setLineDash([3,3]);c.lineWidth=1;c.beginPath();c.arc((hover.x+1)*TILE,(hover.y+1)*TILE,5*TILE,0,Math.PI*2);c.stroke();c.restore();}
    drawLanes(c,s,selection,showRoutes);
    if(linkFrom!==null){const from=s.buildings.find(b=>b.id===linkFrom);if(from){c.save();c.strokeStyle='#fff1a8';c.lineWidth=1.5;c.strokeRect(from.x*TILE-2,from.y*TILE-2,36,36);for(const b of s.buildings)if(b.id!==from.id&&!(isHub(from)&&isHub(b))&&compatible(s,from,b).length&&!s.industry.routes.some(q=>q.from===from.id&&q.to===b.id)){c.strokeStyle='#f5f0c477';c.strokeRect(b.x*TILE-1,b.y*TILE-1,34,34);}c.restore();}}
  }
  function drawAbove(c){
    const s=S();
    for(const b of s.buildings){const x=b.x*TILE,y=b.y*TILE;
      if(b.type==='windmill'){c.save();c.translate(x+17,y+11);c.rotate(api.reduced()?0:s.t*.65);r(c,-18,-1,36,2,'#7c7250');r(c,-1,-18,2,36,'#7c7250');r(c,-18,-5,13,4,'#f1e0b3');r(c,5,1,13,4,'#f1e0b3');r(c,-5,5,4,13,'#f1e0b3');r(c,1,-18,4,13,'#f1e0b3');r(c,-2,-2,4,4,'#cdb77a');c.restore();}
      const m=s.industry.machines[b.id];if(!m)continue;
      r(c,x+2,y+35,28,2,'#54664766');if(m.batch)r(c,x+2,y+35,28*Math.min(1,m.progress/RECIPES[b.type].seconds),2,'#f3d795');
      const status=m.paused?'#b5ad91':m.power<=0?'#c89678':m.status==='Working'||m.batch?'#dbe1a4':'#d2bf87';r(c,x+28,y+17,3,3,status);
      if(m.batch&&!api.reduced()){const t=s.t+b.id;for(let j=0;j<2;j++){const v=(t+j*1.6)%3.2;r(c,x+23+Math.sin(t+j)*2,y-1-v*4,2,2,'#f8efcf66');}}
    }
    for(const p of s.industry.shipments){if(!s.industry.routes.find(r=>r.id===p.route)?.path?.length)continue;const pos=cargoPosition(s,p);crate(c,pos.x*TILE,pos.y*TILE-1,p.item,p.amount);}
    postcards=postcards.filter(p=>s.t-p.start<22);for(const p of postcards){const age=s.t-p.start;c.save();c.globalAlpha=Math.max(0,1-age/22);const x=p.x*TILE+Math.sin(age*.45)*7,y=p.y*TILE-age*3;r(c,x-3,y-5,7,8,'#eed492');r(c,x-2,y-4,5,6,'#fff0bd');r(c,x,y+3,1,6,'#ddc99a');r(c,x-1,y-6,3,1,'#b29466');c.restore();}
  }
  function event(e){if(e.type==='industryUnlock')api.toast(e.text,true,6000);if(e.type==='postcard'){postcards.push({...e,start:S().t});api.toast('A little letter to somewhere far away. Check the memory book.',true,6000);api.sound('bell');}}
  changeCategory('Village');return {update,inspect,mapTap,cancelLink,drawBelow,drawAbove,event,startLink,changeCategory,categoryFor:type=>Object.keys(CATEGORIES).find(k=>CATEGORIES[k].includes(type))||'Village',openBook(which='flow'){tab=which;renderBook();api.openModal('industryBack');},get linkActive(){return linkFrom!==null;}};
}
