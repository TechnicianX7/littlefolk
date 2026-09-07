from pathlib import Path

def edit(name,a,b):
 p=Path(name);s=p.read_text();assert a in s,(name,a[:150]);p.write_text(s.replace(a,b,1))
edit('industry-ui.js',"statistics} from './industry.js';", "statistics,compatible,connectStorage} from './industry.js';\nimport {goodsHTML} from './qol-ui.js';")
edit('industry-ui.js',"function cancelLink(){linkFrom=null;$('routeHint').hidden=true;}","function cancelLink(){linkFrom=null;$('routeHint').hidden=true;api.onContext?.();}")
edit('industry-ui.js',"${title(id)}. Tap the building that should receive its goods.","${title(id)} → tap a highlighted building to receive its goods.")
edit('industry-ui.js',"api.closeModal('industryBack');}\n  function renderBook", "api.closeModal('industryBack');api.onContext?.();}\n  function renderBook")
p=Path('industry-ui.js');s=p.read_text();start=s.index("    if(tab==='guide')html=");end=s.index("    if(tab==='flow')",start)
s=s[:start]+'''    if(tab==='guide')html=`<div class="visualGuide"><div class="guideStep"><strong>1 · Add wind</strong><div class="recipebig">Windmill → workshops</div><p>Build close enough to sit inside the windmill’s ring.</p><button class="primary" data-guide-build="windmill">Place a windmill</button></div><div class="guideStep"><strong>2 · Give goods a journey</strong><div class="recipebig">Home → Sawmill → Home</div><p>Tap a workshop, then <b>Connect storage</b>. Wagons do the rest. Manual routes are under More options.</p><button class="secondary" data-guide-build="sawmill">Place a sawmill</button></div><div class="guideStep"><strong>3 · Grow a new chapter</strong><div class="recipebig">12 planks + 8 bricks → new workshops</div><p>Finished goods must arrive home before you spend them.</p><button class="secondary" data-guide-research="1">See the next chapter</button></div></div>`;
''' + s[end:];p.write_text(s)
edit('industry-ui.js','<button class="secondary" data-reserve="${k}">Keep ${i.reserves[k]} ${k}</button>', '<label class="numberSetting">Keep ${k}<input type="number" min="0" max="1000" step="1" data-reserve-input="${k}" value="${i.reserves[k]}" aria-label="${k} reserved for building"></label>')
edit('industry-ui.js','Tap to cycle reserves. Factories cannot take the reserved materials from shared storage.','Set the amount to keep for building. Wagons can only take the surplus. Changes save when you leave the field.')
edit('industry-ui.js','Tap a target to cycle it. Existing batches can finish.', 'Set a target below. Existing batches can finish.')
edit('industry-ui.js','<button class="secondary" data-limit="${k}">${ITEMS[k].name}: ${n}</button>', '<label class="numberSetting">${ITEMS[k].name}<input type="number" min="1" max="10000" step="1" data-limit-input="${k}" value="${n}" aria-label="${ITEMS[k].name} stock target"></label>')
edit('industry-ui.js',"if(b.id==='researchBtn')result=research(s);", "if(b.dataset.guideBuild){api.closeModal('industryBack');api.chooseBuild(b.dataset.guideBuild);return;}\n    if(b.dataset.guideResearch){tab='research';renderBook();return;}\n    if(b.id==='researchBtn')result=research(s);")
edit('industry-ui.js',"  more.onclick=e=>{", "  $('factoryContent').addEventListener('change',e=>{const el=e.target,k=el.dataset.reserveInput||el.dataset.limitInput;if(!k)return;const bag=el.dataset.reserveInput?S().industry.reserves:S().industry.limits;const low=el.dataset.reserveInput?0:1;const value=Number(el.value);if(!Number.isFinite(value)||!Number.isInteger(value)||value<low||value>(el.dataset.reserveInput?1000:10000)){el.value=bag[k];api.toast('Enter a whole number in the shown range.');return;}bag[k]=value;api.changed();api.toast('Stock setting saved.');});\n  more.onclick=e=>{")
edit('industry-ui.js',"if(b.dataset.action==='connect')startLink(id);", "if(b.dataset.action==='connect')startLink(id);\n    if(b.dataset.action==='storage'){const r=connectStorage(s,id);api.changed();api.toast(r.ok?(r.count?'Delivery loop connected. Watch the wagons.':'This workshop is already connected to storage.'):r.reason);}\n    if(b.dataset.action==='wind'){api.chooseBuild('windmill');return;}\n    if(b.dataset.action==='move'){api.move?.(id);return;}")
p=Path('industry-ui.js');s=p.read_text();start=s.index('  function inspect(kind,b){');end=s.index('  function update(){',start)
s=s[:start]+'''  function inspect(kind,b){
    if(kind!=='building'){more.hidden=true;lastInspect='';return;}more.hidden=false;inspectId=b.id;more.dataset.id=b.id;
    const s=S(),m=s.industry.machines[b.id],recipe=RECIPES[b.type],signature=b.id+':'+b.type+':'+!!m?.paused;
    if(lastInspect!==signature){lastInspect=signature;more.innerHTML=`${m?'<div class="machinestatus" id="machineStatus" role="status"></div><div class="progress"><span id="machineProgress"></span></div><div class="recipeFlow" id="machineRecipe"></div><div class="buffers" id="machineBuffers"></div><button class="primary wide" data-action="wind" id="fixWind">Place a nearby windmill</button><button class="primary wide" data-action="storage">Connect storage</button>':''}${b.type==='windmill'?'<div class="recipeFlow"><b>Wind → nearby workshops</b><span>8 power · 9-tile reach</span></div><p class="taskcopy">The blue ring shows which workshops it powers. Add a second mill when power runs low.</p>':''}<div class="smallactions"><button class="secondary" data-action="move">Move building</button>${isHub(b)?'<button class="primary" data-action="connect">Send goods…</button>':''}</div><details class="machineDetails"><summary>More options</summary><div class="smallactions">${recipe&&recipe.output!=='star'?'<button class="secondary" data-action="connect">Send goods…</button>':''}${m?`<button class="secondary" data-action="pause">${m.paused?'Resume':'Pause'}</button>`:''}${isHub(b)||recipe?'<button class="secondary" data-action="routes">Routes</button>':''}${b.type!=='hut'?'<button class="secondary reclaim" data-action="remove">Reclaim building</button>':''}</div></details>`;}
    if(m){
      $('inspectText').hidden=true;$('inspectStats').textContent=`Wind ${Math.round(m.power*100)}% · ${m.cycles} batches made`;
      const incoming=s.industry.routes.filter(q=>q.to===b.id&&!q.paused),outgoing=s.industry.routes.some(q=>q.from===b.id&&!q.paused);
      let message=m.paused?'Paused by you':m.power<=0?'Needs wind power':!outgoing&&recipe.output!=='star'?'Finished goods need a route home':m.status;
      if(m.status.startsWith('Waiting for')&&!incoming.length)message='Needs supplies. Connect storage below.';
      if(m.status.startsWith('Waiting for')&&incoming.some(q=>isHub(s.buildings.find(v=>v.id===q.from)))){
        const k=Object.keys(recipe.input).find(k=>['wood','stone'].includes(k)&&stock(s,k)<=(s.industry.reserves[k]||0));if(k)message=`${ITEMS[k].name} is kept for building. Wait for more, or lower its reserve in Goods & flow.`;
      }
      $('machineStatus').textContent=message;$('machineProgress').style.width=Math.min(100,m.progress/recipe.seconds*100)+'%';
      $('machineRecipe').innerHTML=`<div>${Object.keys(recipe.input).length?goodsHTML(recipe.input):'<span class="goodchip">Wind</span>'}</div><b class="flowArrow" aria-label="becomes">↓</b><div>${goodsHTML({[recipe.output]:recipe.amount})}</div><small>One batch every ${recipe.seconds}s at full wind</small>`;
      $('machineBuffers').innerHTML=`<div><b>Supplies here</b>${goodsHTML(m.input)||'<span>Waiting for a wagon</span>'}</div><div><b>Ready to ship</b>${goodsHTML(m.output)||'<span>Nothing waiting</span>'}</div>`;$('fixWind').hidden=m.power>0;
    }else{$('inspectText').hidden=false;if(isHub(b)){$('inspectText').textContent='Folk bring materials here. Workshops can collect from here and send finished goods home.';}}
  }
''' + s[end:];p.write_text(s)
edit('industry-ui.js',"if(b.id!==from.id&&(isHub(b)||RECIPES[b.type]))", "if(b.id!==from.id&&!(isHub(from)&&isHub(b))&&compatible(s,from,b).length&&!s.industry.routes.some(q=>q.from===from.id&&q.to===b.id))")
edit('industry-ui.js',"changeCategory('Village');return {update,inspect,mapTap,cancelLink,drawBelow,drawAbove,event};", "changeCategory('Village');return {update,inspect,mapTap,cancelLink,drawBelow,drawAbove,event,startLink,changeCategory,categoryFor:type=>Object.keys(CATEGORIES).find(k=>CATEGORIES[k].includes(type))||'Village',openBook(which='flow'){tab=which;renderBook();api.openModal('industryBack');},get linkActive(){return linkFrom!==null;}};")
edit('app.js',"let factoryUI=null;", "import {installQoL} from './qol-ui.js';\nlet factoryUI=null,qolUI=null;")
edit('app.js',"dock=document.querySelector('.dock').getBoundingClientRect().height;", "dock=document.querySelector('.bottombar').getBoundingClientRect().height;")
edit('app.js',"origin={x:width/2,y:(head+height-dock-34)/2}", "origin={x:width/2,y:(head+($('statusbar')?.getBoundingClientRect().height||0)+height-dock)/2}")
edit('app.js',"result:placement(s,selectedBuild,hover.x,hover.y)", "result:qolUI?.testSite()||placement(s,selectedBuild,hover.x,hover.y)")
edit('app.js',"  factoryUI?.drawAbove(ctx);", "  factoryUI?.drawAbove(ctx);qolUI?.draw(ctx);")
edit('app.js',"function drawBubble(f){const p=", "function drawBubble(f){if(anyModal()||!$('inspector').hidden||!$('buildHint').hidden||!$('routeHint').hidden||($('landPanel')&&!$('landPanel').hidden))return;const p=")
edit('app.js',"function toast(text,memory=false,duration=3800){", "function toast(text,memory=false,duration=3800){if(anyModal()){const active=modalIds().map($).find(el=>!el.hidden);let note=active.querySelector('.modalFeedback');if(!note){note=document.createElement('div');note.className='modalFeedback';note.setAttribute('role','status');active.querySelector('.sheetheader')?.after(note);if(!note.isConnected)active.querySelector('.sheet').append(note);}note.textContent=text;return;}")
edit('app.js',"if(e.type==='salvage')terrainDirty=true;", "if(['salvage','landCleared','landPlanted','landPath','buildingMoved'].includes(e.type))terrainDirty=true;")
edit('app.js',"if(!s.meeting)toast(e.text,true,5000);", "/* Memories stay in the book; they no longer interrupt construction. */")
edit('app.js',"factoryUI?.update();if(performance.now()>toastEnd)", "factoryUI?.update();qolUI?.update();if(performance.now()>toastEnd)")
edit('app.js',"$('world').style.cursor=selectedBuild?'crosshair':'grab';updateUI();", "$('world').style.cursor=selectedBuild?'crosshair':'grab';qolUI?.buildChanged();previewCache=null;updateUI();")
edit('app.js',"function inspect(kind,id){factoryUI?.cancelLink();", "function inspect(kind,id){qolUI?.reset();$('inspectText').hidden=false;factoryUI?.cancelLink();")
edit('app.js',"  if(factoryUI?.mapTap(tx,ty))return;", "  if(qolUI?.mapTap(tx,ty))return;\n  if(factoryUI?.mapTap(tx,ty))return;\n  if(selectedBuild&&selectedBuild!=='path'&&qolUI){qolUI.preview(selectedBuild,tx,ty);return;}")
edit('app.js',"function openModal(id){focusedBefore=", "function openModal(id){qolUI?.reset();factoryUI?.cancelLink();selection=null;selectedBuild=null;hover=null;$('inspector').hidden=true;$('buildHint').hidden=true;focusedBefore=")
edit('app.js',"$(id).querySelector('[role=dialog]').focus();}", "$(id).querySelector('[role=dialog]').focus();qolUI?.modalChanged();}")
edit('app.js',"focusedBefore?.focus();}", "if(focusedBefore?.isConnected&&!focusedBefore.closest('[hidden]'))focusedBefore.focus();qolUI?.sync();}")
edit('app.js',"hover={x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE)};", "if(!qolUI?.hasSite)hover={x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE)};")
edit('app.js',"hover=null;});canvas.addEventListener('pointerleave',()=>{if(!pointers.size)hover=null;}", "if(!qolUI?.hasSite)hover=null;});canvas.addEventListener('pointerleave',()=>{if(!pointers.size&&!qolUI?.hasSite)hover=null;}")
edit('app.js',"function resetPointers(){pointers.clear();gesture=null;pinch=null;hover=null;}", "function resetPointers(){pointers.clear();gesture=null;pinch=null;if(!qolUI?.hasSite)hover=null;}")
edit('app.js',"if(e.key==='Escape'){factoryUI?.cancelLink();", "if(e.key==='Escape'){qolUI?.reset();factoryUI?.cancelLink();")
edit('app.js',"clearSelection:()=>{selectedBuild=null;", "clearSelection:()=>{qolUI?.reset();selectedBuild=null;")
edit('app.js',"  diagnostics:()=>diagnostics,drawIcon:", "  chooseBuild:type=>{factoryUI.changeCategory(factoryUI.categoryFor(type));selectBuild(type);},move:id=>qolUI?.startMove(id),onContext:()=>qolUI?.sync(),\n  diagnostics:()=>diagnostics,drawIcon:")
edit('app.js',"resize();updateUI();\nif(fresh)", """qolUI=installQoL({getState:()=>s,getView:()=>({selection,selectedBuild,hover}),isLink:()=>factoryUI.linkActive,
  setHover:p=>{hover={...p};previewCache=null;},resize,toast,
  cancelContext:()=>{selectedBuild=null;selection=null;hover=null;previewCache=null;factoryUI.cancelLink();$('inspector').hidden=true;$('buildHint').hidden=true;},
  chooseBuild:type=>{factoryUI.changeCategory(factoryUI.categoryFor(type));selectBuild(type);},
  inspectBuilding:id=>{const b=s.buildings.find(b=>b.id===id);if(b){cam.x=(b.x+1)*TILE;cam.y=(b.y+1)*TILE;inspect('building',id);}},
  openBook:which=>factoryUI.openBook(which),
  changed:()=>{terrainDirty=true;previewCache=null;processEvents();save();updateUI();}});
resize();updateUI();
if(fresh)""")
for file in ['index.html','sw.js','package.json','app.js','industry-ui.js']:
 p=Path(file);p.write_text(p.read_text().replace('2.0.0','2.1.0'))
p=Path('industry-ui.js');p.write_text(p.read_text().replace('Timber & Tinkering · 2.0','Room to Grow · 2.1'))
if 'Littlefolk 2.1.0 · Timber &amp; Tinkering' in Path('index.html').read_text():
 edit('index.html','Littlefolk 2.1.0 · Timber &amp; Tinkering','Littlefolk 2.1.0 · Room to Grow')
else:
 edit('index.html','Littlefolk 2.1.0 · Timber & Tinkering','Littlefolk 2.1.0 · Room to Grow')
edit('index.html','<link rel="stylesheet" href="./industry.css">','<link rel="stylesheet" href="./industry.css">\n<link rel="stylesheet" href="./qol.css">')
edit('index.html','Choose a building, then tap empty grass. Paths stay selected for repeated placement. Buildings need walking space.','Choose a building, tap a spot, then confirm Build here. Use the arrows to adjust. Clear site marks obstacles for your folk. Paths place with one tap.')
edit('index.html','Trees and stones replenish. Your folk balance wood and stone automatically.','Unmarked resources replenish. Land tools mark trees and stones for permanent clearing; your folk gather their materials and remove the roots. Plant trees to replenish the woodland.')
edit('index.html','Tap a hut or workshop for upgrades.','Tap a hut or workshop for upgrades. Move building preserves residents and goods. Connect storage adds a workshop delivery loop.')
edit('sw.js',"'./industry.css',", "'./industry.css', './qol-ui.js', './qol.css',")
edit('package.json','node --check industry-ui.js','node --check industry-ui.js && node --check qol-ui.js')
