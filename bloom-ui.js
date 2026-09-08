/* Glanceable building cards, community wishes, and original pixel-art village flourishes. */
import {BUILDINGS,TILE,W,H,walkable,buildingAt} from './world.js';
import {ITEMS,RECIPES,RESEARCH,stock,connectStorage,compatible,isHub} from './industry.js';
import {PROJECTS,BUILDING_PURPOSE,FOOD_BUILDINGS,projectStatus,completeProject,serveSupper,supperInfo,moodName} from './bloom.js';
const $=id=>document.getElementById(id);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ICONS={wood:'🪵',stone:'🪨',veg:'🥕',berry:'🫐',fish:'🐟',meal:'🍲',plank:'▰',brick:'▤',ore:'◆',coal:'●',iron:'▱',gear:'⚙',star:'✦'};
const chip=(k,n)=>`<span class="goodchip"><i aria-hidden="true">${ICONS[k]}</i>${n} ${ITEMS[k]?.name.toLowerCase()||k}</span>`;
export function buildingGuideHTML(type,s,compact=false){
  const d=BUILDINGS[type],r=RECIPES[type],p=BUILDING_PURPOSE[type]||[d.name,d.desc,''];
  const supplies=r&&Object.keys(r.input).length?['hut',...Object.keys(r.input).flatMap(k=>Object.entries(RECIPES).filter(([,v])=>v.output===k).map(([t])=>t))]:[];
  const consumers=r&&r.output!=='star'?['hut',...Object.entries(RECIPES).filter(([,v])=>Object.hasOwn(v.input,r.output)).map(([t])=>t)]:[];
  const locked=s.industry.tier<(d.tier||0)?`Research: ${RESEARCH[d.tier-1].name}`:s.delivered<d.unlock?`${d.unlock} gathered materials to unlock`:'';
  return `<div class="buildingKnowledge"><strong>${p[0]}</strong><p>${p[1]}</p>${r?`<div class="miniChain">${Object.entries(r.input).map(([k,n])=>chip(k,n)).join('')||'<span class="goodchip">'+(r.power?'Wind':'Grows itself')+'</span>'}<b aria-label="makes">→</b>${chip(r.output,r.amount)}</div><small>${r.seconds}s per batch · ${r.power?`${r.power} wind power`:'No windmill needed'}</small>`:''}${!compact?`<p class="connectionHint">${p[2]}</p>${supplies.length?`<div class="relatedBuildings"><span>Suppliers</span>${[...new Set(supplies)].map(t=>`<button class="chainLink" data-guide="${t}">${BUILDINGS[t].short}</button>`).join('')}</div>`:''}${consumers.length?`<div class="relatedBuildings"><span>Useful for</span>${consumers.map(t=>`<button class="chainLink" data-guide="${t}">${BUILDINGS[t].short}</button>`).join('')}</div>`:''}`:''}${locked?`<div class="unlockNote">🔒 ${locked}</div>`:''}</div>`;
}
const CHAINS=[
 ['A warm meal for everyone',[['vegetable'],['kitchen'],['hut']],'Vegetables become meals. Wagons deliver them home. One bowl per resident per day.'],
 ['Color and variety',[['orchard','fishery'],['hut']],'Both deliver straight home as optional side dishes. Neither needs the other to work.'],
 ['Your first landmarks',[['sawmill','mason'],['hut']],'Sawmills take wood; brick cottages take stone. Both need a nearby windmill. Home stock pays for projects.'],
 ['Iron needs two ingredients',[['mine','kiln'],['smelter'],['hut']],'Ore from a mine + charcoal from a kiln = iron. Keep these workshops inside a windmill’s reach.'],
 ['Moving parts',[['smelter','sawmill'],['gearworks'],['hut']],'Iron + planks = gears. Gears pay for the parade, better wagons and the fair.'],
 ['A letter to somewhere far away',[['gearworks','sawmill'],['skypost']],'Gears + planks = star mail. Three letters help unlock the Starlight Fair.']
];
export function installBloomUI(api){
  let tab='wishes',peekType=null;
  const S=api.getState;
  const peekPanel=document.createElement('section');peekPanel.id='buildingPeek';peekPanel.hidden=true;$('contextRail').append(peekPanel);
  const pulse=document.createElement('button');pulse.id='villagePulse';pulse.className='villagePulse';pulse.onclick=()=>open('supper');document.querySelector('.statusrow').insertBefore(pulse,$('noticeSlot'));
  const boardBtn=document.createElement('button');boardBtn.className='category villageBoardBtn';boardBtn.id='villageBoardBtn';boardBtn.textContent='Village wishes';boardBtn.onclick=()=>open();$('industryBtn').before(boardBtn);
  const back=document.createElement('div');back.id='villageBack';back.className='sheetback';back.hidden=true;
  back.innerHTML='<section class="sheet villagebook" role="dialog" aria-modal="true" aria-labelledby="villageTitle" tabindex="-1"><div class="sheetheader"><div><div class="eyebrow">Hearth & Harvest</div><h2 id="villageTitle">A village worth caring for.</h2></div><button class="iconbutton" id="closeVillage" aria-label="Close village board">×</button></div><div class="booktabs" id="villageTabs"></div><div id="villageContent"></div></section>';
  $('app').append(back);$('closeVillage').onclick=()=>api.closeModal('villageBack');back.onclick=e=>{if(e.target===back)api.closeModal('villageBack');};
  $('villageTabs').onclick=e=>{const b=e.target.closest('[data-vtab]');if(b){tab=b.dataset.vtab;renderBoard();}};
  function open(which='wishes'){tab=which;renderBoard();api.openModal('villageBack');}
  function choose(type){api.closeModal('villageBack');api.chooseBuild(type);}
  $('villageContent').onclick=e=>{const b=e.target.closest('button');if(!b)return;let result;
    if(b.dataset.guide){choose(b.dataset.guide);return;}
    if(b.dataset.pin){S().bloom.pinned=b.dataset.pin;api.changed();api.closeModal('villageBack');return;}
    if(b.dataset.project)result=completeProject(S(),b.dataset.project);
    if(b.dataset.theme!==undefined)S().bloom.theme=Number(b.dataset.theme);
    if(b.id==='serveSupper'){result=serveSupper(S());}
    if(b.id==='showResearch'){api.closeModal('villageBack');api.openBook('research');return;}
    if(b.id==='showChains'){tab='chains';renderBoard();return;}
    api.changed();renderBoard();if(result)api.toast(result.ok?(b.id==='serveSupper'?'Supper is served. Close the board to watch the evening.':'A new landmark belongs to your village.'):result.reason,true);
  };
  function renderBoard(){
    const s=S(),care=s.bloom,info=supperInfo(s);
    $('villageTabs').innerHTML=[['wishes','Village wishes'],['supper','Supper & spirit'],['chains','How it connects']].map(([k,t])=>`<button class="secondary ${tab===k?'active':''}" data-vtab="${k}">${t}</button>`).join('');
    let html='';
    if(tab==='wishes'){
      html=`<div class="villageNorthStar"><b>Bring the Starlight Fair to life.</b><span>${care.projects.length} / ${PROJECTS.length} permanent landmarks</span><div class="progress"><span style="width:${care.projects.length/PROJECTS.length*100}%"></span></div><p>Grow food. Connect workshops. Turn their goods into a village that changes before your eyes.</p></div>`;
      for(const p of PROJECTS){const v=projectStatus(s,p),pinned=care.pinned===p.id;html+=`<article class="wishCard ${v.done?'complete':''} ${pinned?'pinned':''}"><div class="wishTitle"><span aria-hidden="true">${p.icon}</span><div><small>${v.done?'STAMP EARNED · '+p.stamp:pinned?'YOUR PINNED WISH':!v.before?'AFTER THE PREVIOUS LANDMARK':'VILLAGE PROJECT'}</small><h3>${p.name}</h3></div>${v.done?'<b aria-label="completed">✓</b>':''}</div><p>${p.reward}</p>${v.done?'':`<div class="costchips">${Object.entries(p.cost).map(([k,n])=>`<span class="goodchip ${stock(s,k)>=n?'enough':'short'}">${ICONS[k]} ${Math.min(n,Math.floor(stock(s,k)))}/${n} ${ITEMS[k].name.toLowerCase()}</span>`).join('')}</div>${p.tier?`<small>${v.research?'✓':'🔒'} Research chapter ${p.tier}</small>`:''}${p.letters?`<small> · ${Math.min(p.letters,s.industry.postcards)}/${p.letters} star letters sent</small>`:''}<div class="smallactions"><button class="primary" data-project="${p.id}" ${v.ready?'':'disabled'}>Build landmark</button><button class="secondary" data-pin="${p.id}" ${!v.before?'disabled':''}>${pinned?'Follow this wish':'Pin this wish'}</button></div>`}</article>`;}
      html+='<button class="secondary wide" id="showChains">Show me the production chains</button><div class="villageNorthStar"><h3>Your village palette</h3><div class="themeOptions">'+['Terracotta','Seaside','Blossom','Meadow'].map((n,i)=>`<button class="secondary ${care.theme===i?'active':''}" data-theme="${i}" aria-pressed="${care.theme===i}">${n}</button>`).join('')+'</div></div>';
    }
    if(tab==='supper'){
      html=`<div class="careHero"><span class="careFace" aria-hidden="true">${care.mood>=80?'✿':care.mood>=50?'☀':'☾'}</span><div><h3>${moodName(s)} · ${Math.round(care.mood)} / 100</h3><p>${care.mood>=80?'Butterflies, bright flower boxes and busy little celebrations.':care.mood>=50?'A comfortable village. Varied suppers bring it further to life.':'A quiet evening. Warm meals and side dishes will bring back its sparkle.'}</p></div></div><div class="progress"><span style="width:${care.mood}%"></span></div><div class="supperGrid"><div><b>🍲 ${info.meals}</b><span>meals at home</span></div><div><b>${info.n}</b><span>bowls per day</span></div><div><b>${info.variety} / 2</b><span>side dishes ready</span></div></div><p class="careRule">One meal per resident, once a day. Berries and fish add variety. Food changes village spirit, <b>never worker speed</b>. Nobody dies or loses their home.</p><div class="smallactions"><button class="primary" id="serveSupper" ${info.served||!info.n||info.ready<info.n?'disabled':''}>${info.served?'Today’s supper is served':info.ready<info.n?`${info.n-info.ready} more meals to serve early`:'Serve today’s supper now'}</button></div><p class="footnote">${info.served?'The next supper is tomorrow at dusk.':`Automatic supper in ${Math.ceil(info.seconds)} simulation seconds.`} Only meals that reached home can be served. New arrivals bring two welcome meals.</p>`;
      if(care.lastSupper)html+=`<div class="lastSupper">Last supper: ${care.lastSupper.count}/${care.lastSupper.total} bowls · ${care.lastSupper.sides.length}/2 side dishes. ${care.lastSupper.count<care.lastSupper.total?'More vegetable patches and cookhouses can help.':''}</div>`;
      html+='<div class="recipebig">🥕 Vegetables → 🍲 Cookhouse → 🏡 Home</div><div class="smallactions">'+['vegetable','kitchen','orchard','fishery','garden'].map(t=>`<button class="secondary" data-guide="${t}">${BUILDINGS[t].short}</button>`).join('')+'</div><p class="footnote">Food producers work without windmillsies. A side-dish portion serves three residents. Flowers add a small spirit bonus. Closing the game freezes the day; there is no absence penalty.</p>';
    }
    if(tab==='chains'){
      html='<p class="careRule"><b>Outputs must match ingredients.</b> New workshops connect to shared storage automatically. You can turn that off before building and make direct factory-to-factory routes instead.</p>';
      for(const [name,stages,text] of CHAINS){html+=`<div class="chainCard"><h3>${name}</h3><div class="chainNodes">${stages.map(types=>'<div class="chainStage">'+types.map(t=>`<button class="chainNode" data-guide="${t}"><canvas width="48" height="44" data-chain-icon="${t}" aria-hidden="true"></canvas><b>${BUILDINGS[t].short}</b><small>${s.buildings.some(b=>b.type===t)?'✓ Built':(BUILDINGS[t].tier||0)>s.industry.tier?'Research '+BUILDINGS[t].tier:'Tap to build'}</small></button>`).join('<span class="chainPlus" aria-label="and">+</span>')+'</div>').join('<span class="chainArrow" aria-label="delivers to">→</span>')}</div><p>${text}</p></div>`;}
      html+='<button class="secondary wide" id="showResearch">Open research chapters</button>';
    }
    $('villageContent').innerHTML=html;for(const c of $('villageContent').querySelectorAll('[data-chain-icon]'))api.drawIcon(c.getContext('2d'),c.dataset.chainIcon);
  }
  function hidePeek(){peekType=null;peekPanel.hidden=true;api.sync();}
  function peek(type){if(api.getView().selection||api.getView().selectedBuild||!$('landPanel').hidden||[...document.querySelectorAll('.sheetback')].some(e=>!e.hidden))return;peekType=type;peekPanel.innerHTML=`<div class="eyebrow">Building guide · click to choose</div><h3>${BUILDINGS[type].name}</h3>${buildingGuideHTML(type,S(),true)}`;peekPanel.hidden=false;api.sync();}
  function afterBuild(type){if(!S().bloom.autoConnect||!RECIPES[type])return;const b=[...S().buildings].reverse().find(b=>b.type===type);if(b)connectStorage(S(),b.id);}
  function update(){const s=S(),i=supperInfo(s);pulse.innerHTML=`<span aria-hidden="true">${s.bloom.mood>=80?'✿':'🍲'}</span> <b>${i.served?'✓ Supper':i.ready+'/'+i.n}</b><span class="pulseLabel">${i.served?'':' bowls'} · ${moodName(s)}</span>`;pulse.setAttribute('aria-label',`${i.ready} of ${i.n} bowls ready. Village spirit ${moodName(s)}. Open supper and village care.`);pulse.classList.toggle('flourishing',s.bloom.mood>=80);boardBtn.textContent=`Village wishes ${s.bloom.projects.length}/5`;if(peekType)api.sync();}
  function event(e){if(e.type==='communityProject')api.toast(`${e.name} is finished. A new piece of your village’s story.`,true,5500);if(e.type==='supper')api.toast(e.count===e.total?`Supper: ${e.count}/${e.total} bowls, ${e.variety}/2 side dishes. A little evening together.`:`Supper: ${e.count}/${e.total} bowls. The village is safe, but a bigger harvest would brighten tomorrow.`,true,5500);}
  return {open,peek,hidePeek,afterBuild,update,event};
}
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
const line=(c,x,y,a,b,color,w=1)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(a,b);c.stroke();};
const poly=(c,p,col)=>{c.fillStyle=col;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
function bloomFlower(c,x,y,col){rect(c,x,y,1,3,'#63925b');rect(c,x-1,y-2,3,3,col);rect(c,x,y-1,1,1,'#f9dc91');}
export function drawFoodBuilding(c,type){
  if(!FOOD_BUILDINGS[type])return false;
  if(type==='vegetable'){
    rect(c,0,4,32,28,'#b5a372');rect(c,2,6,28,24,'#897555');
    for(let y=9;y<30;y+=7)for(let x=5;x<30;x+=7){rect(c,x-1,y+2,5,2,'#6b6345');rect(c,x,y,3,4,'#e6a765');rect(c,x+1,y-3,1,4,'#77a562');rect(c,x-1,y-2,4,2,'#9abb78');}rect(c,0,3,32,2,'#e0c992');rect(c,0,31,32,2,'#cebc8e');
    rect(c,25,-1,1,10,'#a38c5d');rect(c,21,-4,9,5,'#f1d49a');rect(c,25,-3,2,3,'#e19e59');return true;
  }
  if(type==='orchard'){
    rect(c,0,7,32,25,'#819d62');for(const x of [8,24]){rect(c,x,9,3,22,'#947452');poly(c,[[x-8,3],[x-5,-3],[x+4,-4],[x+10,4],[x+8,17],[x-5,18],[x-9,12]],'#659166');rect(c,x-6,4,14,7,'#99b77a');for(let j=0;j<4;j++)rect(c,x-6+(j*5)%13,5+Math.floor(j/2)*7,3,3,['#d283a1','#edabc0'][j%2]);}rect(c,11,26,10,7,'#ad8860');rect(c,12,27,8,3,'#bc7e9d');return true;
  }
  rect(c,1,11,30,21,'#cfb48a');rect(c,1,21,30,1,'#bda076');rect(c,1,30,31,3,'#977d5a');
  poly(c,[[-3,11],[6,0],[25,0],[35,11],[35,14],[-3,14]],type==='kitchen'?'#b77c89':'#759fab');rect(c,2,9,28,2,type==='kitchen'?'#e0a3ac':'#aec9cd');rect(c,4,16,7,7,'#cfe2c8');rect(c,13,22,7,10,'#6d6550');
  if(type==='kitchen'){rect(c,25,-5,5,13,'#a68e79');rect(c,24,-6,7,2,'#c4ad92');rect(c,10,15,13,6,'#f4e2b3');poly(c,[[12,17],[21,17],[19,20],[14,20]],'#bb825d');rect(c,25,26,6,5,'#92ad70');rect(c,0,30,10,3,'#e5cd9c');}
  else{rect(c,2,30,30,4,'#ba9c6b');for(let x=3;x<31;x+=7)rect(c,x,30,1,4,'#8c7957');line(c,26,28,32,12,'#a78a61');line(c,32,12,37,31,'#e6dac0');rect(c,3,16,8,5,'#e7d9ad');poly(c,[[4,18],[8,16],[10,18],[8,20]],'#79a3ac');rect(c,21,28,8,6,'#a67d58');}
  return true;
}
const decorCache=new WeakMap();
function decorSites(s){let c=decorCache.get(s);const key=`${s.topology}:${s.bloom.projects.length}`;if(c?.key===key)return c.sites;const out=[];for(let radius=2;radius<=6;radius++)for(let y=17-radius;y<=17+radius;y++)for(let x=22-radius;x<=22+radius;x++)if(Math.max(Math.abs(x-22),Math.abs(y-17))===radius&&walkable(s,x,y)&&!s.tiles[y*W+x].path)out.push({x:x*TILE+8,y:y*TILE+10});const sites=[out.find(p=>p.x<352&&p.y>272)||out[0],out.find(p=>p.x>380&&p.y>272)||out[1]];decorCache.set(s,{key,sites});return sites;}
export function drawBloomDecor(c,s,reduced){
  const b=s.bloom;if(!b)return;const t=reduced?0:s.t,mood=b.mood,hx=22.5*TILE,hy=17.5*TILE,colors=['#edb4bc','#e9ca78','#9bc2be','#b8a4d5'];
  c.save();
  for(const house of s.buildings.filter(v=>v.type==='hut')){const x=house.x*TILE,y=house.y*TILE;rect(c,x-1,y+31,7,3,'#a5815b');rect(c,x+27,y+31,7,3,'#a5815b');if(mood>=50){bloomFlower(c,x+1,y+29,colors[(house.id+b.theme)%4]);bloomFlower(c,x+30,y+29,colors[(house.id+1+b.theme)%4]);}if(mood>=80){line(c,x+1,y+10,x+31,y+10,'#cdb993');for(let j=0;j<5;j++)poly(c,[[x+3+j*6,y+10],[x+7+j*6,y+10],[x+5+j*6,y+14]],colors[j%4]);}}
  if(b.projects.includes('picnic')){const p=decorSites(s)[0];if(p){rect(c,p.x-9,p.y-5,18,10,'#ddb1a0');for(let j=0;j<18;j+=4)rect(c,p.x-9+j,p.y-5,2,10,'#f1d7b7');rect(c,p.x-9,p.y-1,18,2,'#f5dfc1');rect(c,p.x-3,p.y-3,5,4,'#b6875a');rect(c,p.x-2,p.y-4,3,2,'#e6ca8b');}}
  if(b.projects.includes('arch')){rect(c,hx-15,hy-20,2,27,'#a58c64');rect(c,hx+14,hy-20,2,27,'#a58c64');line(c,hx-15,hy-21,hx+15,hy-21,'#829c65',3);for(let j=0;j<7;j++)bloomFlower(c,hx-15+j*5,hy-22,colors[j%4]);}
  if(b.projects.includes('fountain')){const p=decorSites(s)[1];if(p){poly(c,[[p.x-10,p.y-2],[p.x-6,p.y-7],[p.x+6,p.y-7],[p.x+10,p.y-2],[p.x+7,p.y+3],[p.x-7,p.y+3]],'#b5c5b6');rect(c,p.x-6,p.y-4,12,4,'#86bbb9');rect(c,p.x-1,p.y-12,3,9,'#cedac5');if(mood>=50)for(let j=0;j<6;j++){const a=t*2+j;rect(c,p.x+Math.sin(a)*5,p.y-10+Math.cos(a)*4,1,2,'#def0de');}}}
  if(b.projects.includes('parade')){for(let j=0;j<3;j++){const a=t*.2+j*2.1,x=hx+Math.cos(a)*24,y=hy+Math.sin(a)*16;rect(c,x,y,6,4,'#edcc7e');rect(c,x+4,y-3,4,4,'#f1d68b');rect(c,x+6,y-2,1,1,'#5e654c');rect(c,x+8,y-1,2,1,'#d79a63');}if(mood>=80){const x=hx+45+Math.sin(t)*3,y=hy-49;poly(c,[[x,y-7],[x+5,y],[x,y+7],[x-5,y]],'#d2a0bc');line(c,x,y+7,hx+28,hy-3,'#e1d1a8');}}
  if(b.projects.includes('fair')){line(c,hx-37,hy-30,hx+37,hy-30,'#b3a079');for(let j=0;j<12;j++)poly(c,[[hx-35+j*6,hy-30],[hx-30+j*6,hy-30],[hx-32+j*6,hy-25]],colors[j%4]);}
  // A quieter village keeps its landmarks; thriving adds motion and wildlife, not a speed buff.
  if(!reduced&&mood>=50){const count=mood>=80?12:4;for(let j=0;j<count;j++){const home=s.buildings[j%s.buildings.length];if(!home)break;const x=(home.x+1)*TILE+Math.sin(t*.7+j*2)*23,y=(home.y+1)*TILE+Math.cos(t*.9+j)*17-15;rect(c,x,y,2,Math.sin(t*9+j)>0?2:1,colors[j%4]);rect(c,x+3,y,2,1,colors[(j+1)%4]);}}
  if(!reduced&&b.festUntil>s.t&&(mood>=75||b.projects.length)){for(let j=0;j<5;j++){const age=(s.t+j*7)%40,x=hx-35+j*16+Math.sin(age*.3)*3,y=hy-age*2;poly(c,[[x-3,y-6],[x+3,y-6],[x+5,y-3],[x+3,y+2],[x,y+4],[x-3,y+2],[x-5,y-3]],colors[j%4]);line(c,x,y+4,x-2,y+12,'#d8c79b');}}
  c.restore();
}
