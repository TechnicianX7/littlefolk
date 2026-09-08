/* Timber & Tinkering: deterministic production, renewable power and physical cargo.
   No network, wall-clock simulation, or external dependencies. */
import {configureLanes,cargoLane,refreshLanes,routeLength,laneMetrics} from './lanes.js';
import {FOOD_ITEMS,FOOD_BUILDINGS,FOOD_RECIPES,fundingPlan} from './bloom.js';
export const ITEMS = {...FOOD_ITEMS,
  wood:{name:'Wood',color:'#bc8855'},stone:{name:'Stone',color:'#9cad9c'},
  plank:{name:'Planks',color:'#e1b578'},brick:{name:'Bricks',color:'#bd816b'},
  ore:{name:'Ore',color:'#a8908b'},coal:{name:'Charcoal',color:'#666967'},
  iron:{name:'Iron',color:'#bdd1ce'},gear:{name:'Gears',color:'#d5b768'},star:{name:'Star mail',color:'#f6d996'}
};
const def=(name,short,wood,stone,unlock,desc,tier=0,extra={})=>({name,short,wood,stone,unlock,desc,tier,extra,w:2,h:2});
export const EXTRA_BUILDINGS = {...FOOD_BUILDINGS,
  windmill:def('Meadow windmill','Windmill',22,12,28,'Clean wind power for workshops within 9 tiles. Each mill shares 8 power fairly. More mills help when the village gets busy.'),
  sawmill:def('Little sawmill','Sawmill',18,8,28,'2 wood → 1 plank. Connect a hut or stockpile to feed it, then connect its output back home. Needs nearby wind power.'),
  mason:def('Brick cottage','Brick cottage',20,12,40,'3 stone → 2 bricks. A warm little beginning for a bigger village.'),
  kiln:def('Charcoal kiln','Kiln',24,16,0,'3 wood → 2 charcoal. The smelter needs this gentle fuel.',1,{brick:6}),
  mine:def('Pebble mine','Mine',28,18,0,'Produces 2 ore per batch. Build within 7 tiles of a stone deposit. Ore must travel to a smelter.',1,{plank:6}),
  smelter:def('Hearth smelter','Smelter',26,18,0,'2 ore + 1 charcoal → 2 iron. Two input routes keep the hearth warm.',1,{brick:8}),
  gearworks:def('Clockwork cottage','Clockworks',30,20,0,'2 iron + 1 plank → 1 gear. A satisfying little meeting of two supply chains.',2,{plank:8,brick:6}),
  forester:def('Clockwork grove','Grove',36,22,0,'Produces wood without replacing your littlefolk. Needs a tree within 7 tiles, power, and an output route.',3,{gear:6,plank:12}),
  stoneworks:def('Pebble polisher','Polisher',32,26,0,'Produces stone beside a stone deposit. Gentle automation for the larger village.',3,{gear:6,brick:12}),
  skypost:def('Star-post office','Star post',40,30,0,'2 planks + 1 gear → a letter to somewhere far away. The whole village gets a postcard when it launches.',3,{gear:8,brick:16})
};
export const RECIPES = {...FOOD_RECIPES,
  sawmill:{input:{wood:2},output:'plank',amount:1,seconds:5,power:1},
  mason:{input:{stone:3},output:'brick',amount:2,seconds:6,power:1},
  kiln:{input:{wood:3},output:'coal',amount:2,seconds:8,power:1},
  mine:{input:{},output:'ore',amount:2,seconds:7,power:2},
  smelter:{input:{ore:2,coal:1},output:'iron',amount:2,seconds:8,power:2},
  gearworks:{input:{iron:2,plank:1},output:'gear',amount:1,seconds:9,power:2},
  forester:{input:{},output:'wood',amount:3,seconds:9,power:2},
  stoneworks:{input:{},output:'stone',amount:3,seconds:10,power:2},
  skypost:{input:{plank:2,gear:1},output:'star',amount:1,seconds:16,power:2}
};
export const RESEARCH = [
  {name:'Warm little hearths',cost:{plank:12,brick:8},unlocks:'Pebble mines, charcoal kilns and iron smelters.'},
  {name:'Clever little clockworks',cost:{iron:12,plank:16},unlocks:'Clockwork cottages and the first wagon upgrade.'},
  {name:'Letters to the stars',cost:{gear:12,brick:20,plank:24},unlocks:'Clockwork groves, pebble polishers, the star-post office and larger wagons.'}
];
const CAP=24, MAX_ROUTES=64;
let E;
export function configureIndustry(engine){ E=engine;configureLanes(engine); }
export const isHub=b=>!!b&&['hut','depot'].includes(b.type);
const getB=(s,id)=>s.buildings.find(b=>b.id===id);
const center=b=>({x:b.x+1,y:b.y+1});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const freshMachine=()=>({input:{},output:{},progress:0,batch:false,paused:false,cycles:0,power:0,status:'Waiting for wind'});
const pushEvent=(s,type,data={})=>{s.events.push({type,...data});if(s.events.length>100)s.events.shift();};
function note(s,who,text){E.remember(s,who,text);}
export function initIndustry(s){
  s.industry={version:1,tier:0,goods:{},machines:{},routes:[],shipments:[],nextId:1,logistics:0,
    reserves:{wood:12,stone:8},limits:{veg:96,berry:72,fish:72,meal:120,wood:160,stone:160,plank:64,brick:64,ore:48,coal:48,iron:64,gear:32},totals:{},history:[],postcards:0,lastRoute:{}};
}
export function stock(s,item){return item==='wood'||item==='stone'?s[item]:(s.industry.goods[item]||0);}
function addStock(s,item,n){if(item==='wood'||item==='stone')s[item]+=n;else s.industry.goods[item]=(s.industry.goods[item]||0)+n;}
export function formatGoods(goods){return Object.entries(goods).filter(([,v])=>v>0).map(([k,v])=>`${v} ${ITEMS[k]?.name.toLowerCase()||k}`).join(' + ')||'Nothing';}
export function industryPlacement(s,type,x,y,ignoreCost=false){
  const d=EXTRA_BUILDINGS[type];if(!d)return null;
  if(!ignoreCost&&s.industry.tier<d.tier)return `Unlock this in the Workshop book: ${RESEARCH[d.tier-1].name}.`;
  for(const [k,n] of Object.entries(d.extra))if(!ignoreCost&&stock(s,k)<n)return `Needs ${formatGoods(d.extra)} in shared storage. Connect outputs back to a hut or stockpile.`;
  if(type==='fishery'&&!s.tiles.some((t,i)=>t.ground==='water'&&distance({x:i%E.W,y:Math.floor(i/E.W)},{x:x+1,y:y+1})<=5))return 'Fishing cottages need water within 5 tiles. Look for the blue shore ring.';
  const resource=type==='mine'||type==='stoneworks'?'stone':type==='forester'?'tree':null;
  if(resource&&!s.tiles.some((t,i)=>t.node?.type===resource&&distance({x:i%E.W,y:Math.floor(i/E.W)},{x,y})<=7))return `Build within 7 tiles of ${resource==='tree'?'a tree':'a stone deposit'}.`;
  return null;
}
export function industryPay(s,type){for(const [k,n] of Object.entries(EXTRA_BUILDINGS[type]?.extra||{}))addStock(s,k,-n);}
export function industryBuilt(s,b){if(RECIPES[b.type])s.industry.machines[b.id]=freshMachine();}
function rim(s,b){const out=[];for(let y=b.y-1;y<=b.y+2;y++)for(let x=b.x-1;x<=b.x+2;x++)if((x===b.x-1||x===b.x+2||y===b.y-1||y===b.y+2)&&E.walkable(s,x,y))out.push(y*E.W+x);return out;}
function routePath(s,from,to){return cargoLane(s,from,to);}

const outputItems=(s,b)=>isHub(b)?Object.keys(ITEMS).filter(k=>k!=='star'):RECIPES[b?.type]?[RECIPES[b.type].output]:[];
const inputItems=b=>isHub(b)?Object.keys(ITEMS).filter(k=>k!=='star'):Object.keys(RECIPES[b?.type]?.input||{});
export function compatible(s,from,to){return outputItems(s,from).filter(k=>inputItems(to).includes(k));}
export function connect(s,fromId,toId,filter='auto'){
  const from=getB(s,fromId),to=getB(s,toId),i=s.industry;
  if(!from||!to||fromId===toId)return {ok:false,reason:'Choose a different building for the other end.'};
  if(isHub(from)&&isHub(to))return {ok:false,reason:'Huts and stockpiles already share storage. Connect one to a workshop instead.'};
  if(!compatible(s,from,to).length)return {ok:false,reason:`${E.BUILDINGS[from.type].short} sends ${outputItems(s,from).map(k=>ITEMS[k].name.toLowerCase()).join(', ')||'no cargo'}. ${E.BUILDINGS[to.type].short} accepts ${inputItems(to).map(k=>ITEMS[k].name.toLowerCase()).join(', ')||'no cargo'}. Match an output to an ingredient.`};
  if(filter!=='auto'&&!compatible(s,from,to).includes(filter))return {ok:false,reason:'That item is not used by this route.'};
  if(i.routes.some(r=>r.from===fromId&&r.to===toId))return {ok:false,reason:'That route already exists.'};
  if(i.routes.length>=MAX_ROUTES)return {ok:false,reason:'This island supports 64 cargo routes.'};
  const path=routePath(s,from,to);if(!path)return {ok:false,reason:'No walking route. Leave a way between the buildings.'};
  i.routes.push({id:i.nextId++,from:fromId,to:toId,filter,paused:false,cooldown:0,path,revision:s.topology||0,status:'Ready',delivered:0,managed:false,laneVersion:1});
  pushEvent(s,'route');return {ok:true};
}
/** Optional convenience wiring. Nothing is teleported and existing custom routes are retained. */
export function connectStorage(s,id){
  const b=getB(s,id),recipe=RECIPES[b?.type];if(!recipe)return {ok:false,reason:'Choose a production workshop.'};
  refreshLanes(s);
  const hubs=s.buildings.filter(isHub).map(hub=>({hub,path:routePath(s,hub,b)})).filter(v=>v.path).sort((a,c)=>laneMetrics(s,a).seconds-laneMetrics(s,c).seconds||a.hub.id-c.hub.id);
  const hub=hubs[0]?.hub;if(!hub)return {ok:false,reason:'Place a reachable hut or stockpile nearby.'};
  const desired=[];
  // Existing manual suppliers count. A convenience click must not add redundant parallel feeds.
  const hasIn=Object.keys(recipe.input).every(k=>s.industry.routes.some(q=>q.to===id&&!q.paused&&(q.filter==='auto'||q.filter===k)&&compatible(s,getB(s,q.from),b).includes(k)));
  if(!hasIn&&!s.industry.routes.some(q=>q.from===hub.id&&q.to===id))desired.push([hub.id,id]);
  if(recipe.output!=='star'&&!s.industry.routes.some(q=>q.from===id&&!q.paused&&isHub(getB(s,q.to)))&&!s.industry.routes.some(q=>q.from===id&&q.to===hub.id))desired.push([id,hub.id]);
  if(s.industry.routes.length+desired.length>MAX_ROUTES)return {ok:false,reason:'Route limit reached. Re-plan storage links or remove an unused route.'};
  let count=0;for(const [a,c] of desired){const r=connect(s,a,c);if(!r.ok)return r;s.industry.routes.at(-1).managed=true;count++;}
  // A paused storage loop can be repaired without duplicating its route or cargo.
  for(const q of s.industry.routes)if(q.from===hub.id&&q.to===id||q.from===id&&q.to===hub.id){if(q.paused){q.paused=false;count++;}}
  refreshLanes(s);return {ok:true,count,hub:hub.id};
}
/** Explicit player action: only auto-created storage links move. Manual links are never changed. */
export function optimizeStorage(s,includeExisting=false){
  refreshLanes(s);let changed=0,saved=0;
  for(const q of s.industry.routes.filter(q=>q.managed||includeExisting)){
    const from=getB(s,q.from),to=getB(s,q.to),factory=isHub(from)?to:from;if(!factory||!RECIPES[factory.type]||!isHub(from)&&!isHub(to))continue;
    const hubs=s.buildings.filter(isHub).map(hub=>({hub,path:routePath(s,hub,factory)})).filter(v=>v.path).sort((a,b)=>laneMetrics(s,a).seconds-laneMetrics(s,b).seconds||a.hub.id-b.hub.id);
    const best=hubs[0];if(!best)continue;const a=isHub(from)?best.hub.id:factory.id,b=isHub(from)?factory.id:best.hub.id;
    if((a===q.from&&b===q.to)||s.industry.routes.some(r=>r.id!==q.id&&r.from===a&&r.to===b))continue;
    const faster=laneMetrics(s,q).seconds-laneMetrics(s,best).seconds;if(faster<=.01)continue;const gain=Math.max(0,routeLength(q.path)-routeLength(best.path));
    q.from=a;q.to=b;q.managed=true;for(const p of s.industry.shipments.filter(p=>p.route===q.id))p.to=b;changed++;saved+=gain;
  }
  refreshLanes(s);return {ok:true,count:changed,saved:Math.round(saved)};
}
export function restoreFlowSettings(s){
  s.industry.reserves={wood:12,stone:8};
  s.industry.limits={veg:96,berry:72,fish:72,meal:120,wood:160,stone:160,plank:64,brick:64,ore:48,coal:48,iron:64,gear:32};
  s.bloom.fundWish=true;return {ok:true};
}

function incoming(s,id,item){return s.industry.shipments.reduce((n,p)=>n+(p.to===id&&p.item===item?p.amount:0),0);}
const wishBudgets=new WeakMap();
function sourceStock(s,b,item){return isHub(b)?Math.max(0,stock(s,item)-Math.max(s.industry.reserves[item]||0,(wishBudgets.get(s)||{})[item]||0)):(s.industry.machines[b.id]?.output[item]||0);}
function takeSource(s,b,item,n){if(isHub(b))addStock(s,item,-n);else s.industry.machines[b.id].output[item]-=n;}
function room(s,b,item){return isHub(b)?999999:Math.max(0,CAP-(s.industry.machines[b.id]?.input[item]||0)-incoming(s,b.id,item));}
function storeDelivery(s,p){const to=getB(s,p.to);if(isHub(to)||!to){addStock(s,p.item,p.amount);return;}const m=s.industry.machines[p.to];if(m)m.input[p.item]=(m.input[p.item]||0)+p.amount;else addStock(s,p.item,p.amount);}
export function removeRoute(s,id){
  const i=s.industry;if(!i.routes.some(r=>r.id===id))return;
  for(const p of i.shipments.filter(p=>p.route===id))addStock(s,p.item,p.amount);
  i.shipments=i.shipments.filter(p=>p.route!==id);i.routes=i.routes.filter(r=>r.id!==id);
}
export function research(s){
  const r=RESEARCH[s.industry.tier];if(!r)return {ok:false,reason:'All village chapters are unlocked. The star-post office has plenty more letters to send.'};
  if(Object.entries(r.cost).some(([k,n])=>stock(s,k)<n))return {ok:false,reason:`Needs ${formatGoods(r.cost)} delivered to shared storage.`};
  for(const [k,n] of Object.entries(r.cost))addStock(s,k,-n);s.industry.tier++;
  note(s,'The village',`${r.name}. A new chapter, built by very small hands.`);pushEvent(s,'industryUnlock',{text:r.unlocks});return {ok:true};
}
export function upgradeLogistics(s){
  const i=s.industry,max=i.tier>=3?2:i.tier>=2?1:0;
  if(i.logistics>=max)return {ok:false,reason:i.logistics>=2?'These are our finest little wagons.':'Unlock the next research chapter first.'};
  const c={plank:12+i.logistics*8,iron:8+i.logistics*6};if(Object.entries(c).some(([k,n])=>stock(s,k)<n))return {ok:false,reason:`Needs ${formatGoods(c)} in shared storage.`};
  for(const [k,n] of Object.entries(c))addStock(s,k,-n);i.logistics++;return {ok:true};
}
export function demolish(s,id){
  const b=getB(s,id);if(!b)return {ok:false,reason:'That building is already gone.'};
  if(b.type==='hut')return {ok:false,reason:'We do not evict littlefolk. Their homes stay.'};
  const i=s.industry,m=i.machines[id];
  for(const r of [...i.routes])if(r.from===id||r.to===id)removeRoute(s,r.id);
  if(m){for(const bag of [m.input,m.output])for(const [k,n] of Object.entries(bag))addStock(s,k,n);if(m.batch)for(const [k,n] of Object.entries(RECIPES[b.type].input))addStock(s,k,n);delete i.machines[id];}
  const d=E.BUILDINGS[b.type];s.wood+=Math.floor(d.wood/2);s.stone+=Math.floor(d.stone/2);for(const [k,n] of Object.entries(d.extra||{}))addStock(s,k,Math.floor(n/2));
  s.buildings=s.buildings.filter(g=>g.id!==id);s.topology=(s.topology||0)+1;
  for(const f of s.folk){f.path=[];f.mode='idle';f.timer=.2;f.target=null;}
  pushEvent(s,'salvage');return {ok:true};
}
function countEverywhere(s,item){const i=s.industry;return stock(s,item)+Object.values(i.machines).reduce((n,m)=>n+(m.output[item]||0),0)+i.shipments.reduce((n,p)=>n+(p.item===item?p.amount:0),0);}
export function statistics(s,item){const i=s.industry;return {stored:stock(s,item),buffered:Object.values(i.machines).reduce((n,m)=>n+(m.output[item]||0),0),transit:i.shipments.reduce((n,p)=>n+(p.item===item?p.amount:0),0),made:i.history.filter(h=>h.item===item&&h.time>s.t-60&&h.amount>0).reduce((n,h)=>n+h.amount,0),used:-i.history.filter(h=>h.item===item&&h.time>s.t-60&&h.amount<0).reduce((n,h)=>n+h.amount,0)};}
function history(s,item,amount){s.industry.history.push({time:s.t,item,amount});}
const POSTCARDS=[
  'To whoever needs a little light: this one is from us.',
  'A letter came back from a village across the sea. They also have a Pip. Our Pip is delighted.',
  'Someone far away put our lantern in their window. The world feels a little smaller tonight.',
  'The envelope contained a drawing of our windmill. They gave it a very nice hat.',
  'A reply arrived: “We saw your light. We left ours on, too.”',
  'The village sent a spare gear and a note: “For whatever you are trying to fix.”'
];
export function stepIndustry(s,dt){
  const i=s.industry;if(!i)return;refreshLanes(s);wishBudgets.set(s,fundingPlan(s));
  const activity=s.meeting?.2:1;dt*=activity;
  const machines=s.buildings.filter(b=>RECIPES[b.type]),mills=s.buildings.filter(b=>b.type==='windmill');
  for(const b of machines){const m=i.machines[b.id]||(i.machines[b.id]=freshMachine());m.power=RECIPES[b.type].power===0?1:0;}
  for(const mill of mills){const served=machines.filter(b=>RECIPES[b.type].power>0&&!i.machines[b.id].paused&&distance(center(b),center(mill))<=9),load=served.reduce((n,b)=>n+RECIPES[b.type].power,0);if(load)for(const b of served)i.machines[b.id].power+=8/load;}
  for(const b of machines){
    const m=i.machines[b.id],r=RECIPES[b.type];m.power=Math.min(1,m.power);
    if(m.paused){m.status='Taking a break';continue;}
    if(m.power<=0){m.status='Needs nearby windmill';continue;}
    if(!m.batch){
      if((m.output[r.output]||0)+r.amount>CAP){m.status='Output full · add a route';continue;}
      if(r.output!=='star'&&countEverywhere(s,r.output)-Math.min(stock(s,r.output),Math.max(i.reserves[r.output]||0,(wishBudgets.get(s)||{})[r.output]||0))>=(i.limits[r.output]||64)){m.status='Stock target reached';continue;}
      const missing=Object.entries(r.input).filter(([k,n])=>(m.input[k]||0)<n);
      if(missing.length){m.status=`Waiting for ${missing.map(([k])=>ITEMS[k].name.toLowerCase()).join(' + ')}`;continue;}
      for(const [k,n] of Object.entries(r.input)){m.input[k]-=n;history(s,k,-n);}m.batch=true;m.progress=0;
    }
    m.status=m.power<.99?`Working · ${Math.round(m.power*100)}% wind`:s.meeting?'A quiet lantern-time hum':'Working';m.progress+=dt*m.power;
    if(m.progress+1e-8>=r.seconds){
      m.progress=0;m.batch=false;m.cycles++;i.totals[r.output]=(i.totals[r.output]||0)+r.amount;history(s,r.output,r.amount);
      if(r.output==='star'){
        i.postcards++;i.goods.star=i.postcards;const text=POSTCARDS[(i.postcards-1)%POSTCARDS.length];note(s,s.folk[(i.postcards-1)%s.folk.length]?.name||'The star post',text);pushEvent(s,'postcard',{x:b.x+1,y:b.y,text});
      }else{m.output[r.output]=(m.output[r.output]||0)+r.amount;if(i.totals[r.output]===r.amount)note(s,'The workshop',`The first ${ITEMS[r.output].name.toLowerCase()} came off the line. Everyone stopped to admire the result.`);}
      pushEvent(s,'factoryCraft',{x:b.x+1,y:b.y+1,item:r.output,amount:r.amount});
    }
  }
  // Arrivals are credited before dispatch. Reservations prevent simultaneous input overflow.
  const remaining=[];
  for(const p of i.shipments){
    const r=i.routes.find(r=>r.id===p.route);if(!r){addStock(s,p.item,p.amount);continue;}if(!r.path?.length){remaining.push(p);continue;}
    const pos=cargoPosition(s,p),tile=s.tiles[Math.floor(pos.y)*E.W+Math.floor(pos.x)];
    p.travel+=dt*(2.2+i.logistics*.6)*(tile?.path?1.65:1);
    if(p.travel>=p.length){storeDelivery(s,p);r.delivered+=p.amount;}else remaining.push(p);
  }i.shipments=remaining;
  // Round-robin per source prevents an early route from starving later consumers.
  const dispatch=[];
  for(const source of new Set(i.routes.map(r=>r.from))){
    const group=i.routes.filter(r=>r.from===source),last=group.findIndex(r=>r.id===i.lastRoute[source]),start=(last+1)%group.length;
    dispatch.push(...group.slice(start),...group.slice(0,start));
  }
  for(const r of dispatch){
    const from=getB(s,r.from),to=getB(s,r.to);if(!from||!to){r.status='Endpoint missing';continue;}
    if(!r.path?.length){r.status='Lane blocked';continue;}
    if(r.paused){r.status='Paused';continue;}
    r.cooldown-=dt;if(r.cooldown>0)continue;
    if(i.shipments.filter(p=>p.route===r.id).length>=1+i.logistics){r.status='Wagon on its way';continue;}
    const kinds=compatible(s,from,to).filter(k=>r.filter==='auto'||r.filter===k);
    if(!kinds.length){r.status='No matching goods';continue;}
    const sorted=kinds.sort((a,b)=>{const m=i.machines[to.id];return ((m?.input[a]||0)+incoming(s,to.id,a))/(RECIPES[to.type]?.input[a]||1)-((m?.input[b]||0)+incoming(s,to.id,b))/(RECIPES[to.type]?.input[b]||1);});
    let sent=false,waiting='Waiting for goods';
    for(const item of sorted){const available=sourceStock(s,from,item),space=room(s,to,item);if(space<=0){waiting='Destination full';continue;}if(available<=0){waiting=isHub(from)&&stock(s,item)>0&&(wishBudgets.get(s)||{})[item]>0?`Setting aside ${ITEMS[item].name.toLowerCase()} for your village wish`:isHub(from)&&['wood','stone'].includes(item)?`Protecting ${item} reserve`:`Waiting for ${ITEMS[item].name.toLowerCase()}`;continue;}
      const amount=Math.min(3+i.logistics*3,available,space),length=pathLength(r.path);takeSource(s,from,item,amount);i.shipments.push({id:i.nextId++,route:r.id,to:r.to,item,amount,travel:0,length});i.lastRoute[r.from]=r.id;r.cooldown=2.5;r.status='Carrying '+ITEMS[item].name.toLowerCase();sent=true;break;
    }if(!sent)r.status=waiting;
  }
  i.history=i.history.filter(h=>h.time>s.t-60).slice(-800);
}
function pathLength(path){return routeLength(path);}
export function cargoPosition(s,p){const path=s.industry.routes.find(r=>r.id===p.route)?.path;if(!path?.length)return {x:22,y:17};let d=p.travel;for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j],n=distance(a,b);if(d<=n)return {x:a.x+(b.x-a.x)*d/(n||1),y:a.y+(b.y-a.y)*d/(n||1)};d-=n;}return path[path.length-1];}
export function restoreIndustry(s,raw){
  const v=raw.industry;initIndustry(s);if(!v)return;
  const num=(x,lo=0,hi=1e12)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
  const integer=(x,lo,hi)=>num(x,lo,hi)&&Number.isInteger(x);
  const fail=()=>{throw new Error('Invalid workshop or cargo data. The existing village has not been replaced.');};
  if(v.version!==1||!integer(v.tier,0,3)||!integer(v.logistics,0,2)||!integer(v.postcards,0,1e9)||!integer(v.nextId,1,1e12))fail();
  const bag=(source,allowed=Object.keys(ITEMS),cap=1e12)=>{if(!source||typeof source!=='object'||Array.isArray(source))fail();const out={};for(const [k,n] of Object.entries(source)){if(!allowed.includes(k)||!num(n,0,cap)||!Number.isInteger(n))fail();out[k]=n;}return out;};
  const i=s.industry;i.tier=v.tier;i.logistics=v.logistics;i.postcards=v.postcards;i.nextId=v.nextId;i.goods=bag(v.goods);i.reserves=bag(v.reserves,['wood','stone'],1000);i.limits={...i.limits,...bag(v.limits,Object.keys(ITEMS),1000000)};i.totals=bag(v.totals);
  if(!v.machines||typeof v.machines!=='object'||!Array.isArray(v.routes)||v.routes.length>MAX_ROUTES||!Array.isArray(v.shipments)||v.shipments.length>MAX_ROUTES*3)fail();
  for(const b of s.buildings.filter(b=>RECIPES[b.type])){const m=v.machines[b.id],r=RECIPES[b.type];if(!m){i.machines[b.id]=freshMachine();continue;}if(!num(m.progress,0,r.seconds)||!integer(m.cycles,0,1e12)||typeof m.batch!=='boolean'||typeof m.paused!=='boolean')fail();i.machines[b.id]={...freshMachine(),input:bag(m.input,Object.keys(r.input),CAP),output:bag(m.output,[r.output],CAP),progress:m.progress,batch:m.batch,paused:m.paused,cycles:m.cycles};}
  const seen=new Set();
  for(const r of v.routes){if(!integer(r.id,1,1e12)||seen.has(r.id)||typeof r.paused!=='boolean'||!num(r.delivered)||!num(r.cooldown,-1e6,3))fail();seen.add(r.id);const from=getB(s,r.from),to=getB(s,r.to);if(!from||!to||from.id===to.id||isHub(from)&&isHub(to))fail();const kinds=compatible(s,from,to);if(!kinds.length||r.filter!=='auto'&&!kinds.includes(r.filter))fail();const path=routePath(s,from,to);if(!path)fail();i.routes.push({id:r.id,from:r.from,to:r.to,filter:r.filter,paused:r.paused,cooldown:r.cooldown,delivered:r.delivered,path,revision:s.topology||0,status:'Ready',managed:r.managed===true,laneVersion:1});}
  for(const p of v.shipments){const r=i.routes.find(r=>r.id===p.route);if(!r||!integer(p.id,1,1e12)||seen.has(p.id)||p.to!==r.to||!compatible(s,getB(s,r.from),getB(s,r.to)).includes(p.item)||!integer(p.amount,1,9)||!num(p.travel)||!num(p.length,.1,1e6)||p.travel>p.length)fail();seen.add(p.id);const length=pathLength(r.path);i.shipments.push({id:p.id,route:r.id,to:r.to,item:p.item,amount:p.amount,length,travel:p.travel/p.length*length});}
  for(const b of s.buildings.filter(b=>RECIPES[b.type]))for(const item of Object.keys(RECIPES[b.type].input))if((i.machines[b.id].input[item]||0)+incoming(s,b.id,item)>CAP)fail();
  i.nextId=Math.max(i.nextId,...seen)+1;i.history=[];refreshLanes(s);
}
