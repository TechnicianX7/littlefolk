import {plotPlan} from './lanes-ui.js';
/* Room to Grow: direct manipulation, contextual guidance and one non-overlapping panel rail. */
import {W,H,TILE,BUILDINGS,placement,cost,place,markClearing,plantTree,removePath,movePlacement,moveBuilding,quickClear,planPaving,pave} from './world.js';
import {ITEMS,RECIPES,RESEARCH,EXTRA_BUILDINGS,stock,connectStorage,isHub} from './industry.js';
import {bloomGoal} from './bloom.js';
import {buildingGuideHTML,ICONS} from './bloom-ui.js';
const $=id=>document.getElementById(id);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={...ICONS,wood:'🪵',stone:'🪨',plank:'▰',brick:'▤',ore:'◆',coal:'●',iron:'▱',gear:'⚙',star:'✦'};
export const goodsHTML=goods=>Object.entries(goods).filter(([,v])=>v>0).map(([k,n])=>`<span class="goodchip"><i aria-hidden="true">${icons[k]||'◆'}</i><b>${n}</b> ${esc(ITEMS[k]?.name.toLowerCase()||k)}</span>`).join('');
export function installQoL(api){
  let box=null,dragId=null,shape='box',paveFrom=null,paveTo=null,pavePlan=null;
  let site=null,moving=null,land=null,brush=1,resource=null,undo=null,goalTask=null,buildKey='',landKey='';
  const S=api.getState;
  const rail=document.createElement('div');rail.id='contextRail';rail.setAttribute('aria-label','Current task');$('app').append(rail);
  for(const el of [document.querySelector('.goal'),$('inspector'),$('buildHint'),$('routeHint')])rail.append(el);
  const status=document.createElement('div');status.id='statusbar';
  status.innerHTML='<div id="resourceRibbon" aria-label="Crafted goods at home"></div><div id="laneLegend" hidden><b class="in">Blue → in</b> · <b class="out">Gold → out</b> · Arrows show deliveries</div><div class="statusrow"><div id="noticeSlot"></div></div>';
  $('app').append(status);status.querySelector('.statusrow').prepend(document.querySelector('.timepill'));$('noticeSlot').append($('toast'));
  document.querySelector('.floating').remove();
  for(const k of ['plank','brick','ore','coal','iron','gear']){const b=document.createElement('button');b.className='ribbonGood';b.dataset.good=k;b.innerHTML=`<i aria-hidden="true">${icons[k]}</i><b>0</b><span>${ITEMS[k].name}</span>`;b.onclick=()=>api.openBook('flow');$('resourceRibbon').append(b);}
  const action=document.createElement('button');action.id='goalAction';action.className='primary wide';action.onclick=()=>performGoal();document.querySelector('.goal').append(action);
  const landBtn=document.createElement('button');landBtn.id='landBtn';landBtn.className='category';landBtn.textContent='Land';landBtn.onclick=()=>enterLand('clear');$('industryBtn').before(landBtn);$('industryBtn').childNodes[0].textContent='Workshop ';
  const panel=document.createElement('section');panel.id='landPanel';panel.hidden=true;panel.setAttribute('aria-label','Land tools');rail.append(panel);
  panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.land){resource=null;box=null;land=b.dataset.land;landKey='';renderLand();}
    if(b.dataset.shape){shape=b.dataset.shape;box=null;landKey='';renderLand();}
    if(b.id==='cancelArea'){box=null;landKey='';renderLand();}
    if(b.id==='harvestArea'&&box){applyMarks(boxCells(),land!=='keep');box=null;landKey='';renderLand();}
    if(b.id==='clearAreaNow'&&box){fastClear(boxCells());box=null;landKey='';renderLand();}
    if(b.id==='finishClearing'){fastClear(S().tiles.flatMap((t,i)=>t.node?.clear?[i]:[]));}
    if(b.id==='cancelAllClearing'){markClearing(S(),S().tiles.flatMap((t,i)=>t.node?.clear?[i]:[]),false);undo=null;api.changed();landKey='';renderLand();}
    if(b.dataset.brush!==undefined){shape='brush';box=null;brush=Number(b.dataset.brush);landKey='';renderLand();}
    if(b.id==='landClose'){reset();sync();}
    if(b.id==='clearOne'&&resource!==null){applyMarks([resource],!S().tiles[resource]?.node?.clear);renderLand();}
    if(b.id==='landUndo'&&undo){const r=markClearing(S(),undo.ids,!undo.clear);undo=null;api.changed();api.toast(r.changed.length?'Unfinished clearing marks undone.':'Those patches are already clear.');}
  });
  $('buildHint').insertAdjacentHTML('beforeend','<div id="placementTools"></div>');
  $('placementTools').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.id==='confirmPaving'&&paveFrom&&paveTo){const r=pave(S(),paveFrom,paveTo);if(r.ok){paveFrom=null;paveTo=null;pavePlan=null;api.changed();api.toast('Paving laid. Faster trips, one tidy stretch.',true);}else api.toast(r.reason);buildKey='';update();return;}
    if(b.id==='restartPaving'){paveFrom=null;paveTo=null;pavePlan=null;buildKey='';update();return;}
    if(b.dataset.guide){api.chooseBuild(b.dataset.guide);return;}
    if(b.id==='quickSite'&&site){const d=BUILDINGS[api.getView().selectedBuild];fastClear(footprint(site.x,site.y,d.w,d.h));buildKey='';update();}
    if(b.dataset.nudge&&site){const [x,y]=b.dataset.nudge.split(',').map(Number);site.x+=x;site.y+=y;api.setHover(site);buildKey='';update();}
    if(b.id==='confirmBuild')confirmBuild();
    if(b.id==='clearSite'&&site){const d=BUILDINGS[api.getView().selectedBuild];applyMarks(footprint(site.x,site.y,d.w,d.h),true);buildKey='';update();}
  });
  $('placementTools').addEventListener('change',e=>{if(e.target.id==='autoConnect'){S().bloom.autoConnect=e.target.checked;api.changed();}});
  let layoutQueued=false;
  function layout(){layoutQueued=false;const app=$('app'),set=(k,v)=>{const text=Math.ceil(v)+'px';if(app.style.getPropertyValue(k)!==text)app.style.setProperty(k,text);};set('--head-height',document.querySelector('.topbar').getBoundingClientRect().height);set('--dock-height',document.querySelector('.bottombar').getBoundingClientRect().height);set('--status-height',status.getBoundingClientRect().height);api.resize();}
  const observer=new ResizeObserver(()=>{if(!layoutQueued){layoutQueued=true;requestAnimationFrame(layout);}});for(const el of [document.querySelector('.topbar'),document.querySelector('.bottombar'),status])observer.observe(el);
  const footprint=(x,y,w,h)=>{const ids=[];for(let b=y;b<y+h;b++)for(let a=x;a<x+w;a++)if(a>=0&&a<W&&b>=0&&b<H)ids.push(b*W+a);return ids;};
  function reset(){paveFrom=null;paveTo=null;pavePlan=null;box=null;dragId=null;site=null;moving=null;land=null;resource=null;buildKey='';landKey='';panel.hidden=true;$('landBtn').classList.remove('active');}
  function enterLand(tool='clear'){reset();api.cancelContext();land=tool;panel.hidden=false;$('landBtn').classList.add('active');renderLand();sync();}
  function buildChanged(){reset();sync();}
  function preview(type,x,y){site={x,y};api.setHover(site);buildKey='';update();}
  function startMove(id){const b=S().buildings.find(v=>v.id===id);if(!b)return;api.chooseBuild(b.type);moving=id;site=null;buildKey='';update();}
  function testSite(){const v=api.getView();if(!site||!v.selectedBuild)return null;return moving!==null?movePlacement(S(),moving,site.x,site.y):placement(S(),v.selectedBuild,site.x,site.y);}
  function confirmBuild(){const type=api.getView().selectedBuild;if(!site||!type)return;const r=moving!==null?moveBuilding(S(),moving,site.x,site.y):place(S(),type,site.x,site.y);if(!r.ok){api.toast(r.reason);return;}const moved=moving!==null;if(!moved)api.afterBuild?.(type);reset();api.cancelContext();api.changed();api.toast(moved?'Moved. Residents, goods and delivery routes stay with it.':`${BUILDINGS[type].short} is ready.`,true);}
  function applyMarks(ids,clear){const r=markClearing(S(),ids,clear);if(r.changed.length)undo={ids:r.changed,clear};api.changed();api.toast(r.changed.length?`${r.changed.length} ${clear?'patches marked. Your folk will clear them.':'clearing marks canceled.'}${r.protectedCount?' Some resource patches are protected.':''}`:r.reason);landKey='';return r;}
  function fastClear(ids){const r=quickClear(S(),ids);undo=null;api.changed();api.toast(r.ok?`${r.cleared.length} patches cleared now. +${r.wood} wood, +${r.stone} stone.${r.protectedCount?' Essential resource patches kept.':''}`:r.reason);landKey='';}
  function boxCells(){if(!box)return [];return footprint(Math.min(box.x,box.ex),Math.min(box.y,box.ey),Math.abs(box.ex-box.x)+1,Math.abs(box.ey-box.y)+1);}
  function pointerDown(e,convert){if(!['clear','keep'].includes(land)||shape!=='box')return false;const p=convert(e.clientX,e.clientY),x=Math.max(0,Math.min(W-1,Math.floor(p.x/TILE))),y=Math.max(0,Math.min(H-1,Math.floor(p.y/TILE)));box={x,y,ex:x,ey:y};dragId=e.pointerId;landKey='';renderLand();return true;}
  function pointerMove(e,convert){if(dragId!==e.pointerId||!box)return;const p=convert(e.clientX,e.clientY);box.ex=Math.max(0,Math.min(W-1,Math.floor(p.x/TILE)));box.ey=Math.max(0,Math.min(H-1,Math.floor(p.y/TILE)));landKey='';renderLand();}
  function pointerUp(e,convert){if(dragId!==e.pointerId)return;pointerMove(e,convert);dragId=null;landKey='';renderLand();}
  function cancelDrag(discard=false){if(dragId!==null&&discard)box=null;dragId=null;}
  function mapTap(x,y){
    if(x<0||y<0||x>=W||y>=H)return false;
    if(land){if(land==='clear'||land==='keep')applyMarks(footprint(x-brush,y-brush,2*brush+1,2*brush+1),land==='clear');else{const r=land==='plant'?plantTree(S(),x,y):removePath(S(),x,y);api.changed();api.toast(r.ok?(land==='plant'?'A new tree will grow here.':'Path lifted. 1 stone returned.'):r.reason);}renderLand();return true;}
    if(api.getView().selectedBuild==='path'){if(!paveFrom){paveFrom={x:x+.5,y:y+.5};paveTo=null;}else paveTo={x:x+.5,y:y+.5};pavePlan=paveTo?planPaving(S(),paveFrom,paveTo):null;buildKey='';renderBuild();return true;}
    if(api.getView().selectedBuild||api.isLink())return false;
    const n=S().tiles[y*W+x]?.node;
    if(n){api.cancelContext();resource=y*W+x;panel.hidden=false;landKey='';renderLand();sync();return true;}
    if(resource!==null){resource=null;panel.hidden=true;sync();}return false;
  }
  function renderLand(){
    if(!land&&resource===null){panel.hidden=true;return;}
    const s=S(),n=resource!==null?s.tiles[resource]?.node:null,queued=s.tiles.filter(t=>t.node?.clear).length;
    if(resource!==null&&!n){resource=null;panel.hidden=true;sync();return;}
    const key=[JSON.stringify(box),shape,land,brush,resource,!!n?.clear,n?.amount,queued,!!undo].join(':');if(key===landKey)return;landKey=key;panel.hidden=false;
    panel.innerHTML=`<div class="taskhead"><div><div class="eyebrow">Room to grow</div><h3>${n?(n.type==='tree'?'A woodland tree':'A stone patch'):'Shape your village'}</h3></div><button class="iconbutton" id="landClose" aria-label="Close land tools">×</button></div>`;
    if(n)panel.innerHTML+=`<p class="taskcopy">${n.clear?'Marked for permanent clearing.':n.amount?'A renewable resource.': 'Resting. It will replenish.'}</p><button class="primary wide" id="clearOne">${n.clear?'Cancel clearing':`Clear this ${n.type==='tree'?'tree':'rock'}`}</button>`;
    panel.innerHTML+='<div class="landtools">'+[['clear','✂','Clear land'],['keep','↶','Unmark'],['plant','♧','Plant · 2 wood'],['path','▧','Lift path']].map(([k,i,t])=>`<button class="secondary ${land===k?'active':''}" data-land="${k}" aria-pressed="${land===k}"><i aria-hidden="true">${i}</i>${t}</button>`).join('')+'</div>';
    if(land==='clear'||land==='keep')panel.innerHTML+='<div class="brushrow"><button class="secondary '+(shape==='box'?'active':'')+'" data-shape="box">▧ Drag a box</button></div>';
    if(land==='clear'||land==='keep')panel.innerHTML+='<div class="brushrow" aria-label="Brush size">'+[[0,'1 tile'],[1,'3 × 3'],[2,'5 × 5']].map(([k,t])=>`<button class="secondary ${shape==='brush'&&brush===k?'active':''}" data-brush="${k}" aria-pressed="${brush===k}">${t}</button>`).join('')+'</div>';
    panel.innerHTML+=`<p class="taskcopy">${land==='plant'?'Tap empty grass to plant a renewable tree.':land==='path'?'Tap a footpath to remove it and recover its stone.':land==='keep'?'Tap marked patches to keep them.':land==='clear'&&shape==='box'?'Drag a rectangle on the map, then choose how to clear it. Two fingers pan or zoom.':land==='clear'?'Tap a patch. Harvest a whole patch in one trip. With a brush, drag to pan.':'Clear land for building, or keep it for resources.'}</p><div class="queuecount">${queued?`${queued} patches waiting for little hands`:'No clearing jobs waiting'}</div>${undo?'<button class="secondary wide" id="landUndo">Undo unfinished marks</button>':''}`;
    if(box){const count=boxCells().filter(i=>s.tiles[i].node).length;panel.innerHTML+=`<div class="areaChoice"><b>${Math.abs(box.ex-box.x)+1} × ${Math.abs(box.ey-box.y)+1} area · ${count} resource patches</b><div class="smallactions">${land==='keep'?'<button class="primary" id="harvestArea">Cancel clearing in this area</button>':`<button class="primary" id="clearAreaNow" ${!count?'disabled':''}>Clear now</button><button class="secondary" id="harvestArea" ${!count?'disabled':''}>Let folk harvest all</button>`}<button class="secondary" id="cancelArea">Cancel selection</button></div><small>Clear now keeps half the materials. Harvesting keeps all, with much faster clearing trips.</small></div>`;}
    if(queued)panel.innerHTML+='<div class="smallactions"><button class="secondary" id="finishClearing">Finish clearing now</button><button class="secondary" id="cancelAllClearing">Cancel all orders</button></div>';
  }
  function renderBuild(){
    const type=api.getView().selectedBuild;if(!type){buildKey='';return;}
    const s=S(),d=BUILDINGS[type],c=moving!==null?{}:cost(s,type),test=testSite();
    if(type==='path'){
      if(paveFrom&&paveTo)pavePlan=planPaving(s,paveFrom,paveTo);
      const pk=JSON.stringify(['paving',paveFrom,paveTo,pavePlan?.cost,s.stone]);if(pk===buildKey)return;buildKey=pk;
      $('buildTitle').textContent='Lay a paved walk';$('buildText').textContent='Straight runs, neat corners. Faster folk and wagons.';
      $('placementTools').innerHTML='<p class="taskcopy">'+(!paveFrom?'Tap where the paving should start.':!paveTo?'Now tap its other end. The route will avoid obstacles.':'Preview the whole stretch, then confirm.')+'</p>'+(pavePlan?'<div class="siteFacts" id="paveCost">'+(pavePlan.path.length?pavePlan.path.length+' tiles · '+pavePlan.cost+' stone (existing paving is free)':pavePlan.reason)+'</div><button class="primary wide" id="confirmPaving" '+(pavePlan.ok?'':'disabled')+'>Lay this paving</button>':'')+(paveFrom?'<button class="secondary wide" id="restartPaving">Choose a new start</button>':'');return;
    }
    const nodes=site?footprint(site.x,site.y,d.w,d.h).filter(i=>s.tiles[i].node):[],allMarked=nodes.length&&nodes.every(i=>s.tiles[i].node.clear);
    const key=JSON.stringify([type,moving,site,c,Object.keys(c).map(k=>stock(s,k)),test,nodes.length,allMarked]);if(buildKey===key)return;buildKey=key;
    $('buildTitle').textContent=moving!==null?`Move ${d.short.toLowerCase()}`:d.name;
    $('buildText').textContent=RECIPES[type]?`${Object.entries(RECIPES[type].input).map(([k,n])=>`${n} ${ITEMS[k].name.toLowerCase()}`).join(' + ')||(RECIPES[type].power?'Wind':'Grows itself')} → ${RECIPES[type].amount} ${ITEMS[RECIPES[type].output].name.toLowerCase()}`:({hut:'A home brings a new friend.',path:'Tap to lay faster walking routes.',depot:'Shorter trips. Shared village storage.',windmill:'Powers nearby workshops. The circle shows its reach.',lumber:'Helps nearby folk gather wood faster.',quarry:'Helps nearby folk gather stones faster.',garden:'A little place for flowers and quiet breaks.',workshop:'Better tools for all your folk.'}[type]||'Choose a place on the map.');
    let html=moving!==null?'<p class="taskcopy">Free to move. Keeps residents, cargo and production.</p>':'<div class="costchips">'+(Object.entries(c).filter(([,n])=>n>0).map(([k,n])=>`<span class="goodchip ${stock(s,k)>=n?'enough':'short'}"><i aria-hidden="true">${icons[k]}</i>${n} ${ITEMS[k].name.toLowerCase()}${stock(s,k)<n?` <b>(${Math.ceil(n-stock(s,k))} needed)</b>`:' ✓'}</span>`).join('')||'<span class="goodchip enough">Your first home is free</span>')+'</div>';
    if(moving===null)html=buildingGuideHTML(type,s,!!site)+html;
    if(RECIPES[type]&&moving===null)html+='<label class="autoConnect"><input type="checkbox" id="autoConnect" '+(s.bloom.autoConnect?'checked':'')+'> Auto-connect storage <small>Real delivery wagons; you can change routes later.</small></label>';
    if(type==='path'){html+='';}
    else if(site){const plan=plotPlan(s,type,site.x,site.y,moving);html+='<div class="siteLegend"><span><i class="green"></i>Fits</span><span><i class="amber"></i>Clear first</span><span><i class="red"></i>Blocked</span></div>';if(plan.geometry.ok){html+='<div class="siteFacts">'+(plan.hub?'Loading pad → '+BUILDINGS[plan.hub.type].short+' #'+plan.hub.id+(s.bloom.autoConnect?'. A shared delivery lane will be laid.':'. Nearby storage; automatic links are off.'):'One connected entrance stays open.')+(RECIPES[type]?.power?' Wind estimate: '+Math.round(plan.wind*100)+'%.':'')+(plan.geometry.refund?' '+plan.geometry.refund+' covered paving stones will be returned.':'')+'</div>';}html+=`<div class="placementState ${test?.ok?'ready':''}" role="status">${test?.ok?'✓ Ready. Place it here?':nodes.length?(allMarked?`✂ Clearing ${nodes.length} remaining patches…`:`✂ ${nodes.length} resource patches in the way`):esc(test?.reason||'Choose a site.')}</div>`;
      html+='<div class="nudgeRow" aria-label="Adjust building position">'+[['-1,0','←'],['0,-1','↑'],['0,1','↓'],['1,0','→']].map(([k,t])=>`<button class="secondary" data-nudge="${k}" aria-label="Move preview ${ {'←':'left','↑':'up','↓':'down','→':'right'}[t]}">${t}</button>`).join('')+'</div>';
      html+=`<button class="primary wide" id="confirmBuild" ${test?.ok?'':'disabled'}>${moving!==null?'Move here':'Build here'}</button>`;
      if(nodes.length)html+=`<button class="primary wide" id="quickSite">Clear site now · keep half the materials</button><button class="secondary wide" id="clearSite" ${allMarked?'disabled':''}>${allMarked?'Your folk are clearing this site':'Clear this site first'}</button>`;
    }else html+='<p class="taskcopy">Tap a spot on the map to preview. Nothing is placed until you confirm.</p>';
    $('placementTools').innerHTML=html;
  }
  function performGoal(){if(!goalTask)return;const t=goalTask;if(t.build)api.chooseBuild(t.build);else if(t.inspect)api.inspectBuilding(t.inspect);else if(t.book)api.openBook(t.book);else if(t.land)enterLand();else if(t.board)api.openBoard?.();}
  function nextTask(){
    const s=S();if(!s.folk.length)return {title:'A home for Pip',text:'Place your free hut to begin.',button:'Place the free hut',build:'hut',progress:0};
    const wish=bloomGoal(s);if(wish)return wish;
    if(s.delivered<28)return {title:'A friend for Pip',text:'Folk gather wood and stone by themselves.',button:s.folk.length<2?'Build another hut':'Make some room',build:s.folk.length<2?'hut':null,land:s.folk.length>=2,progress:Math.min(1,s.delivered/28)};
    const tier=s.industry.tier;
    const sequence=['windmill','sawmill','mason',...(tier>=1?['mine','kiln','smelter']:[]),...(tier>=2?['gearworks']:[]),...(tier>=3?['skypost']:[])];
    for(const type of sequence){const b=s.buildings.find(b=>b.type===type);if(!b)return {title:`Next: ${BUILDINGS[type].short}`,text:type==='windmill'?'A windmill powers nearby workshops.':'Add the next piece of your little production line.',button:`Place ${BUILDINGS[type].short.toLowerCase()}`,build:type,progress:.2};
      if(RECIPES[type]){const r=RECIPES[type],routes=s.industry.routes,output=r.output==='star'||routes.some(q=>q.from===b.id&&!q.paused),input=Object.keys(r.input).every(k=>routes.some(q=>q.to===b.id&&!q.paused&&(q.filter==='auto'||q.filter===k)));
        if(!input||!output)return {title:`Connect your ${BUILDINGS[type].short.toLowerCase()}`,text:'Supplies go in. Finished goods come home.',button:'Show this workshop',inspect:b.id,progress:.45};
        const m=s.industry.machines[b.id];if(m?.power<=0)return {title:'This workshop needs wind',text:'Place a windmill close enough to cover it.',button:'Show this workshop',inspect:b.id,progress:.5};
      }
    }
    const q=RESEARCH[tier];if(q){const ready=Object.entries(q.cost).every(([k,n])=>stock(s,k)>=n);return {title:ready?'A new chapter is ready':'Your next chapter',text:Object.entries(q.cost).map(([k,n])=>`${Math.min(n,Math.floor(stock(s,k)))}/${n} ${ITEMS[k].name.toLowerCase()}`).join(' · '),button:ready?'Unlock new workshops':'See research',book:'research',progress:Object.entries(q.cost).reduce((a,[k,n])=>a+Math.min(1,stock(s,k)/n),0)/Object.keys(q.cost).length};}
    return {title:'A village of your own',text:`${s.industry.postcards} letters sent. Build, rearrange, or just enjoy the little life.`,button:'Make room to grow',land:true,progress:1};
  }
  function sync(){
    const modal=[...document.querySelectorAll('.sheetback')].some(el=>!el.hidden);
    const active=!!($('buildingPeek')&&!$('buildingPeek').hidden)||!$('inspector').hidden||!$('buildHint').hidden||!$('routeHint').hidden||!panel.hidden;
    document.querySelector('.goal').hidden=active||modal;rail.hidden=modal;
    $('app').classList.toggle('modal-open',modal);
  }
  function update(){
    const s=S();$('resourceRibbon').hidden=s.delivered<28;
    for(const b of $('resourceRibbon').children){const k=b.dataset.good;b.querySelector('b').textContent=Math.floor(stock(s,k));b.setAttribute('aria-label',`${Math.floor(stock(s,k))} ${ITEMS[k].name} at home. Open goods details.`);}
    goalTask=nextTask();$('goalTag').textContent=goalTask.tag||'A little next step';$('goalTitle').textContent=goalTask.title;$('goalText').textContent=goalTask.text;$('goalProgress').style.width=goalTask.progress*100+'%';$('goalAction').textContent=goalTask.button;
    for(const b of document.querySelectorAll('.buildcard')){const type=b.dataset.build,d=BUILDINGS[type],c=cost(s,type),tier=d.tier||0,locked=s.delivered<d.unlock||s.industry.tier<tier,affordable=Object.entries(c).every(([k,n])=>stock(s,k)>=n);b.classList.toggle('unaffordable',!locked&&!affordable);b.classList.toggle('recommended',!activeContext()&&goalTask.build===type);b.querySelector('small').textContent=locked?(s.industry.tier<tier?`Research ${tier}`:`${s.delivered} / ${d.unlock} gathered`):Object.values(c).every(n=>!n)?'FREE':`${c.wood} wood · ${c.stone} stone`;}
    if(api.getView().selectedBuild)renderBuild();if(land||resource!==null)renderLand();sync();
  }
  function activeContext(){return api.getView().selectedBuild||api.getView().selection||land||resource!==null||api.isLink();}
  function draw(c){
    c.save();if(paveFrom){c.strokeStyle='#fae3a0';c.lineWidth=2;c.strokeRect(paveFrom.x*TILE-5,paveFrom.y*TILE-5,10,10);}if(pavePlan?.path?.length){c.strokeStyle=pavePlan.ok?'#f5e0a2':'#d49380';c.lineWidth=5;c.setLineDash([3,2]);c.beginPath();pavePlan.path.forEach((p,j)=>j?c.lineTo(p.x*TILE,p.y*TILE):c.moveTo(p.x*TILE,p.y*TILE));c.stroke();c.setLineDash([]);}for(let i=0;i<S().tiles.length;i++)if(S().tiles[i].node?.clear){const x=i%W*TILE,y=Math.floor(i/W)*TILE;c.fillStyle='#f7d78266';c.fillRect(x,y,TILE,TILE);c.strokeStyle='#fff5ca';c.lineWidth=1;c.strokeRect(x+.5,y+.5,15,15);c.beginPath();c.moveTo(x+5,y+5);c.lineTo(x+11,y+11);c.moveTo(x+11,y+5);c.lineTo(x+5,y+11);c.stroke();}
    if(box){const x=Math.min(box.x,box.ex)*TILE,y=Math.min(box.y,box.ey)*TILE,w=(Math.abs(box.ex-box.x)+1)*TILE,h=(Math.abs(box.ey-box.y)+1)*TILE;c.fillStyle='#f2ce7040';c.fillRect(x,y,w,h);c.strokeStyle='#fff2ad';c.lineWidth=1.5;c.setLineDash([3,2]);c.strokeRect(x,y,w,h);c.setLineDash([]);}
    const h=api.getView().hover;if(land&&h&&shape!=='box'){const r=land==='clear'||land==='keep'?brush:0;c.strokeStyle='#fff6cf';c.lineWidth=1;c.strokeRect((h.x-r)*TILE,(h.y-r)*TILE,(r*2+1)*TILE,(r*2+1)*TILE);}c.restore();
  }
  function modalChanged(){sync();$('toast').hidden=true;}
  layout();return {pointerDown,pointerMove,pointerUp,cancelDrag,update,sync,reset,buildChanged,preview,startMove,testSite,mapTap,draw,modalChanged,get movingId(){return moving;},get hasSite(){return !!site;},get site(){return site;}};
}
