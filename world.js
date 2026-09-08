/* Littlefolk simulation. Pure JavaScript: no browser, network, or runtime dependencies. */
import { EXTRA_BUILDINGS, configureIndustry, initIndustry, industryPlacement, industryPay, industryBuilt, stepIndustry, restoreIndustry } from './industry.js';
import {initBloom,stepBloom,restoreBloom,welcomeBloom,configureBloom} from './bloom.js';
import {gridLane,laneNetwork} from './lanes.js';
import {RECIPES,RESEARCH,ITEMS,compatible} from './industry.js';
export const VERSION = 2;
export const W = 44, H = 34, TILE = 16;
export const BUILDINGS = {
  hut: { name: 'Wooden hut', short: 'Hut', w: 2, h: 2, wood: 18, stone: 8, unlock: 0, desc: 'A snug home. A new littlefolk moves in and finds their own work.' },
  path: { name: 'Footpath', short: 'Path', w: 1, h: 1, wood: 0, stone: 1, unlock: 0, desc: 'Small stepping stones. Walking here is 65% faster.' },
  depot: { name: 'Stockpile', short: 'Stockpile', w: 2, h: 2, wood: 12, stone: 5, unlock: 12, desc: 'A shared drop-off point. Shorter walks mean more time for little things.' },
  lumber: { name: 'Woodcutter cabin', short: 'Woodcutter', w: 2, h: 2, wood: 24, stone: 10, unlock: 28, desc: 'Nearby woodcutters work faster and bring back an extra log. Range: 7 tiles.' },
  quarry: { name: 'Stone shed', short: 'Stone shed', w: 2, h: 2, wood: 26, stone: 16, unlock: 55, desc: 'Nearby stone gatherers work faster and carry an extra stone. Range: 7 tiles.' },
  garden: { name: 'Wildflower garden', short: 'Garden', w: 2, h: 2, wood: 20, stone: 12, unlock: 80, desc: 'Flowers, butterflies, and somewhere to take a tiny, well-earned break.' },
  workshop: { name: 'Tool workshop', short: 'Workshop', w: 2, h: 2, wood: 45, stone: 30, unlock: 115, desc: 'Unlocks better tools for everyone. Tap the finished workshop to upgrade.' }
};
Object.assign(BUILDINGS, EXTRA_BUILDINGS);
export const COLORS = ['#f1b16f', '#92c5ac', '#b6a0d4', '#edca70', '#91bbd7', '#e99eac', '#c4ce82', '#daa385'];
const NAMES = ['Pip', 'Moss', 'Fig', 'Clover', 'Pebble', 'Tansy', 'Nim', 'Button', 'Fern', 'Mochi', 'Poppy', 'Bramble', 'Mallow', 'Wisp', 'Juniper', 'Bean', 'Luma', 'Acorn', 'Basil', 'Bumble', 'Fennel', 'Nori', 'Dew', 'Maple'];
export const idx = (x, y) => y * W + x;
export const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
function hash(x, y, seed) { let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 11, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
function rand(s) { let n = s.rng | 0; n ^= n << 13; n ^= n >>> 17; n ^= n << 5; s.rng = n >>> 0; return s.rng / 4294967296; }
const at = (s, x, y) => s.tiles[idx(x, y)];
export function createWorld(seed = 41728) {
  seed = (seed >>> 0) || 41728;
  const s = { version: VERSION, seed, rng: seed, t: 0, wood: 0, stone: 0, delivered: 0, tools: 0, nextId: 1, tiles: [], buildings: [], folk: [], memories: [], events: [], meeting: null, lastBell: -1000, lastDusk: -1, hearth: { x: 22, y: 17 }, knownUnlocks: [], firstLog: false };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const r = hash(x, y, seed), edge = Math.pow((x - 22) / 21, 2) + Math.pow((y - 17) / 16, 2);
    const pond = Math.pow((x - 32) / 5.4, 2) + Math.pow((y - 8) / 3.5, 2) < 1;
    const water = edge > 0.96 + Math.sin(x * .8 + y * .35) * .035 || pond;
    const clear = x >= 13 && x <= 28 && y >= 12 && y <= 25;
    const grove = ((x<13||x>29)&&(y<14||y>20)) || y<10 || y>26;
    let node = null;
    if (!water && !clear && r > (grove?.80:.97)) node = { type: r > .93 ? 'stone' : 'tree', amount: r > .93 ? 16 : 18, rest: 0 };
    s.tiles.push({ ground: water ? 'water' : 'grass', detail: hash(x + 99, y, seed), node, path: false });
  }
  [[16,17,'tree'],[19,12,'tree'],[27,19,'tree'],[25,23,'tree'],[18,23,'stone'],[27,16,'stone']].forEach(([x,y,type]) => { at(s,x,y).ground = 'grass'; at(s,x,y).node = {type,amount:18,rest:0}; });
  s.topology=0;initIndustry(s);initBloom(s);return s;
}
export function buildingAt(s, x, y) { return s.buildings.find(b => { const d = BUILDINGS[b.type]; return x >= b.x && y >= b.y && x < b.x + d.w && y < b.y + d.h; }); }
const spatial = new WeakMap();
function blockedAt(s,x,y){
  let cache=spatial.get(s);
  if(!cache||cache.revision!==s.topology||cache.count!==s.buildings.length){
    const cells=new Uint8Array(W*H);
    for(const b of s.buildings){const d=BUILDINGS[b.type];for(let y=b.y;y<b.y+d.h;y++)for(let x=b.x;x<b.x+d.w;x++)cells[idx(x,y)]=1;}
    cache={cells,revision:s.topology,count:s.buildings.length};spatial.set(s,cache);
  }return cache.cells[idx(x,y)]===1;
}
export function walkable(s, x, y, extra = null) {
  if (!inside(x,y)) return false;
  if (extra && x >= extra.x && y >= extra.y && x < extra.x + extra.w && y < extra.y + extra.h) return false;
  const t = at(s,x,y);
  return t.ground !== 'water' && !t.node && !blockedAt(s,x,y) && !(x === s.hearth.x && y === s.hearth.y);
}
function neighbors(x,y) { return [[x,y+1],[x+1,y],[x-1,y],[x,y-1]].filter(([a,b]) => inside(a,b)); }
function rim(s, x,y,w=1,h=1,extra=null) {
  const out=[];
  for(let a=x; a<x+w; a++) for(const b of [y-1,y+h]) if(walkable(s,a,b,extra)) out.push(idx(a,b));
  for(let b=y; b<y+h; b++) for(const a of [x-1,x+w]) if(walkable(s,a,b,extra)) out.push(idx(a,b));
  return out;
}
function flood(s, start, extra=null) {
  const seen = new Uint8Array(W*H), q=[start]; seen[start]=1;
  for(let head=0;head<q.length;head++) { const i=q[head],x=i%W,y=Math.floor(i/W); for(const [a,b] of neighbors(x,y)) { const j=idx(a,b); if(!seen[j] && walkable(s,a,b,extra)) {seen[j]=1;q.push(j);} } }
  return seen;
}
export function findPath(s, from, goals) {
  if(!goals.length) return null;
  const x=Math.max(0,Math.min(W-1,Math.floor(from.x))),y=Math.max(0,Math.min(H-1,Math.floor(from.y))),start=idx(x,y);
  const target=new Set(goals), prev=new Int32Array(W*H); prev.fill(-1); prev[start]=start;
  const q=[start]; let end=-1;
  for(let head=0;head<q.length;head++) {
    const i=q[head]; if(target.has(i)) {end=i;break;}
    for(const [a,b] of neighbors(i%W,Math.floor(i/W))) {const j=idx(a,b);if(prev[j]===-1 && walkable(s,a,b)){prev[j]=i;q.push(j);}}
  }
  if(end<0)return null;
  const path=[]; for(let i=end;i!==start;i=prev[i])path.push({x:i%W+.5,y:Math.floor(i/W)+.5});
  path.reverse();if(Math.abs(from.x-(x+.5))>1e-6||Math.abs(from.y-(y+.5))>1e-6)path.unshift({x:x+.5,y:y+.5});return path;
}
export function cost(s,type) { const d=BUILDINGS[type]; return type==='hut'&&!s.buildings.some(b=>b.type==='hut') ? {wood:0,stone:0} : {wood:d.wood,stone:d.stone,...d.extra}; }
/** Largest connected approach to the lantern. One isolated doorstep is not the village. */
const reachCache=new WeakMap();
export function villageReachability(s,extra=null){
  const key=[s.topology||0,s.buildings.length].join(':');
  if(!extra&&reachCache.get(s)?.key===key)return reachCache.get(s).seen;
  const starts=rim(s,s.hearth.x,s.hearth.y,1,1,extra);let seen=new Uint8Array(W*H),best=0;
  const checked=new Set();for(const start of starts){if(checked.has(start))continue;const candidate=flood(s,start,extra);let count=0;for(let i=0;i<candidate.length;i++)if(candidate[i]){checked.add(i);count++;}if(count>best){best=count;seen=candidate;}}
  if(!extra)reachCache.set(s,{key,seen});return seen;
}
function accessCheck(s,x,y,w,h){
  const extra={x,y,w,h},seen=villageReachability(s,extra);
  const entrances=rim(s,x,y,w,h,extra).filter(i=>seen[i]);
  if(!entrances.length)return {ok:false,code:'access',reason:'This plot needs one open side connected to the village.',blockers:[extra]};
  for(const b of s.buildings){const d=BUILDINGS[b.type];if(!rim(s,b.x,b.y,d.w,d.h,extra).some(i=>seen[i]))return {ok:false,code:'building-access',reason:`Keep an entrance open to the ${d.short.toLowerCase()} highlighted on the map.`,blockers:[{x:b.x,y:b.y,w:d.w,h:d.h}]};}
  // Residents are transient, not permanent obstacles. Confirmed construction lets them step aside.
  for(const type of ['tree','stone'])if(!s.tiles.some((t,i)=>t.node?.type===type&&rim(s,i%W,Math.floor(i/W),1,1,extra).some(j=>seen[j])))return {ok:false,code:'resource-access',reason:`Keep a way to at least one ${type==='tree'?'tree':'stone deposit'}.`,blockers:[]};
  return {ok:true,reason:'',entrances};
}
/** Spatial validity is separate from affordability. Preview colors always describe the land. */
export function placementGeometry(s,type,x,y){
  const d=BUILDINGS[type];if(!d||!Number.isInteger(x)||!Number.isInteger(y))return {ok:false,code:'tile',reason:'Choose a map tile.',blockers:[]};
  const blockers=[];let clearable=true,refund=0;
  for(let b=y;b<y+d.h;b++)for(let a=x;a<x+d.w;a++){
    if(!inside(a,b)||!walkable(s,a,b)){const t=inside(a,b)?at(s,a,b):null;const node=!!t?.node;clearable=clearable&&node;blockers.push({x:a,y:b,w:1,h:1,node});}
    else if(at(s,a,b).path){if(type==='path')return {ok:false,code:'path',reason:'This tile is already paved.',blockers:[{x:a,y:b,w:1,h:1}]};refund++;}
  }
  if(blockers.length)return {ok:false,code:clearable?'clearing':'occupied',reason:clearable?'Clear the amber resource tiles before building.':'Red tiles contain water, a building, or the lantern.',blockers,clearable};
  const special=industryPlacement(s,type,x,y,true);if(special)return {ok:false,code:'range',reason:special,blockers:[]};
  const access=type==='path'?{ok:true,reason:'',entrances:[]}:accessCheck(s,x,y,d.w,d.h);
  return {...access,refund};
}
export function placement(s,type,x,y,options={}){
  const d=BUILDINGS[type];if(!d)return {ok:false,reason:'Choose a building first.'};
  if(!options.ignoreCost){const c=cost(s,type);if(s.delivered<d.unlock)return {ok:false,code:'unlock',reason:`Unlocks after ${d.unlock} materials have come home (${s.delivered} so far).`};if(s.wood<c.wood||s.stone<c.stone)return {ok:false,code:'supplies',reason:`Needs ${c.wood} wood and ${c.stone} stone.`};}
  const geometry=placementGeometry(s,type,x,y);if(!geometry.ok)return geometry;
  const special=industryPlacement(s,type,x,y,options.ignoreCost);if(special)return {...geometry,ok:false,code:'supplies',reason:special};
  if(!options.ignoreCost&&s.delivered<d.unlock)return {...geometry,ok:false,code:'unlock',reason:`Unlocks after ${d.unlock} materials have come home (${s.delivered} so far).`};
  if(!options.ignoreCost&&type==='hut'&&s.folk.length>=24)return {...geometry,ok:false,reason:'This little island has room for 24 friends.'};
  if(type==='workshop'&&s.buildings.some(b=>b.type==='workshop'))return {...geometry,ok:false,reason:'One workshop serves everyone. Select it to upgrade tools.'};
  if(!s.folk.length&&type!=='hut')return {...geometry,ok:false,reason:'Start with a free wooden hut.'};
  if(type!=='path'&&s.buildings.length>=200)return {...geometry,ok:false,reason:'This island has room for 200 buildings.'};
  const c=cost(s,type);if(!options.ignoreCost&&(s.wood<c.wood||s.stone<c.stone))return {...geometry,ok:false,code:'supplies',reason:`Needs ${c.wood} wood and ${c.stone} stone.`};
  return geometry;
}
/** Repair old stranded positions, or politely move residents out of a confirmed building plot. */
export function settleFolk(s){
  const seen=villageReachability(s);
  for(const f of s.folk)if(!seen[idx(Math.floor(f.x),Math.floor(f.y))]){
    let best=-1,score=Infinity;for(let i=0;i<seen.length;i++)if(seen[i]){const d=Math.abs(i%W+.5-f.x)+Math.abs(Math.floor(i/W)+.5-f.y);if(d<score){score=d;best=i;}}
    if(best>=0){f.x=best%W+.5;f.y=Math.floor(best/W)+.5;f.path=[];f.target=null;f.mode='idle';f.timer=.1;}
  }
}
export function planPaving(s,from,to){
  if(!s.folk.length)return {ok:false,reason:'Place a home first.',path:[],cost:0};
  const path=gridLane(s,from,to,laneNetwork(s).cells);if(!path)return {ok:false,reason:'Choose two clear tiles with an open route between them.',path:[],cost:0};
  const cost=path.filter(p=>!at(s,Math.floor(p.x),Math.floor(p.y)).path).length;
  return {ok:s.stone>=cost,reason:s.stone>=cost?'':`Needs ${cost} stone.`,path,cost};
}
export function pave(s,from,to){const p=planPaving(s,from,to);if(!p.ok)return p;for(const v of p.path)at(s,Math.floor(v.x),Math.floor(v.y)).path=true;s.stone-=p.cost;s.pavingRevision=(s.pavingRevision||0)+1;emit(s,'landPath',{x:from.x,y:from.y});return p;}
function liftUnder(s,x,y,w,h){for(let b=y;b<y+h;b++)for(let a=x;a<x+w;a++)if(at(s,a,b).path){at(s,a,b).path=false;s.stone++;}s.pavingRevision=(s.pavingRevision||0)+1;}

function emit(s,type,data={}) {s.events.push({type,...data});if(s.events.length>100)s.events.shift();}
function remember(s,who,text) {
  const memory={day:Math.floor(s.t/240)+1,who,text,time:s.t};s.memories.unshift(memory);s.memories=s.memories.slice(0,60);emit(s,'memory',memory);
}
function spawn(s,b) {
  const seen=villageReachability(s),goals=rim(s,b.x,b.y,2,2).filter(i=>seen[i]),i=goals.find(i=>Math.floor(i/W)===b.y+2)??goals[0];
  if(i===undefined)return;
  const n=s.folk.length;
  const f={id:s.nextId++,name:NAMES[n]??`Friend ${n+1}`,color:COLORS[n%COLORS.length],hat:n%4,home:b.id,x:i%W+.5,y:Math.floor(i/W)+.5,mode:'idle',path:[],timer:.5,target:null,carry:null,wood:0,stone:0,trips:0,favorite:n%2?'stone':'tree',bubble:'Home, at last.',bubbleUntil:s.t+5};
  s.folk.push(f); welcomeBloom(s); emit(s,'arrival',{name:f.name,x:f.x,y:f.y});
  remember(s,f.name,n===0?`${f.name} opened the door to a very small home, in a very big world.`:`${f.name} moved in. The village feels a little more like a village.`);
}
export function place(s,type,x,y) {
  const test=placement(s,type,x,y);if(!test.ok)return test;
  const c=cost(s,type);s.wood-=c.wood;s.stone-=c.stone;industryPay(s,type);
  if(type==='path'){at(s,x,y).path=true;s.pavingRevision=(s.pavingRevision||0)+1;}
  else {const d=BUILDINGS[type];liftUnder(s,x,y,d.w,d.h);const b={id:s.nextId++,type,x,y,level:1};s.buildings.push(b);s.topology=(s.topology||0)+1;industryBuilt(s,b);if(type==='hut')spawn(s,b);}
  // Construction can intersect old routes; recalculate without discarding carried materials.
  if(type!=='path')settleFolk(s);
  if(type!=='path')for(const f of s.folk){f.path=[];f.target=null;f.mode='idle';f.timer=.1;}
  emit(s,'build',{x:x+.5,y:y+.5,building:type});return {ok:true};
}
export function upgrade(s,id) {
  const b=s.buildings.find(b=>b.id===id);if(!b)return {ok:false,reason:'That building is not here.'};
  let c;
  if(b.type==='hut') {if(b.level>=2)return {ok:false,reason:'This home is already extra cozy.'};if(s.folk.length>=24)return {ok:false,reason:'The island is full of friends.'};c={wood:32,stone:16};}
  else if(b.type==='workshop'){if(s.tools>=2)return {ok:false,reason:'Everyone has the best little tools.'};c={wood:40+s.tools*25,stone:25+s.tools*20};}
  else return {ok:false,reason:'This building is already doing its thing.'};
  if(s.wood<c.wood||s.stone<c.stone)return {ok:false,reason:`Needs ${c.wood} wood and ${c.stone} stone.`};
  s.wood-=c.wood;s.stone-=c.stone;
  if(b.type==='hut'){b.level=2;spawn(s,b);}else{s.tools++;b.level=1+s.tools;remember(s,'The village','New tools arrived. Everyone tried looking very professional.');}
  emit(s,'build',{x:b.x+.5,y:b.y+.5,building:b.type});return {ok:true};
}
function support(s,type,node) {return s.buildings.some(b=>b.type===type&&Math.hypot(b.x+1-node.x,b.y+1-node.y)<=7);}
function setRoute(f,path,mode,target=null){f.path=path;f.mode=mode;f.target=target;}
function returning(s,f) {
  const stores=s.buildings.filter(b=>b.type==='hut'||b.type==='depot').sort((a,b)=>dist(f,a)-dist(f,b));
  for(const b of stores){const d=BUILDINGS[b.type],p=findPath(s,f,rim(s,b.x,b.y,d.w,d.h));if(p){setRoute(f,p,'toStore',b.id);return true;}}
  f.mode='idle';f.timer=2;return false;
}
function findWork(s,f) {
  if(f.carry){returning(s,f);return;}
  if(s.buildings.some(b=>b.type==='garden')&&rand(s)<.05){
    const b=s.buildings.find(b=>b.type==='garden'),p=findPath(s,f,rim(s,b.x,b.y,2,2));if(p){setRoute(f,p,'toGarden');return;}
  }
  const pending={tree:0,stone:0};for(const g of s.folk){if(g.carry)pending[g.carry.type]+=g.carry.amount;if(g.mode==='work'||g.mode==='toResource'){const t=s.tiles[g.target];if(t?.node)pending[t.node.type]+=2;}}
  const need={tree:(24+s.folk.length*8)/(s.wood+pending.tree+4),stone:(16+s.folk.length*5)/(s.stone+pending.stone+4)};
  const candidates=[];
  for(let i=0;i<s.tiles.length;i++){const n=s.tiles[i].node;if(!n||(n.amount<=0&&!n.clear))continue;const reserved=s.folk.filter(g=>g.id!==f.id&&g.target===i&&(g.mode==='work'||g.mode==='toResource')).length;if(reserved>=1)continue;
    const x=i%W,y=Math.floor(i/W),score=(n.clear?500:need[n.type]*(n.type===f.favorite?1.12:1))/(5+Math.hypot(f.x-x,f.y-y));candidates.push({i,x,y,score});}
  candidates.sort((a,b)=>b.score-a.score);
  for(const c of candidates.slice(0,30)){const p=findPath(s,f,rim(s,c.x,c.y));if(p){setRoute(f,p,'toResource',c.i);return;}}
  f.mode='idle';f.timer=1.5;f.bubble='A little breather.';f.bubbleUntil=s.t+1.5;
}
function move(s,f,dt){
  let budget=dt*(1.7+s.tools*.12)*((f.carry?.amount>6||(f.mode==='toResource'&&s.tiles[f.target]?.node?.clear))?1.5:1);
  while(f.path.length&&budget>0){const p=f.path[0],dx=p.x-f.x,dy=p.y-f.y,d=Math.hypot(dx,dy);const onPath=at(s,Math.floor(f.x),Math.floor(f.y))?.path,step=budget*(onPath?1.65:1);
    if(!walkable(s,Math.floor(p.x),Math.floor(p.y))){f.path=[];f.mode='idle';f.timer=.1;return false;}
    if(d<=step){f.x=p.x;f.y=p.y;budget-=d/(onPath?1.65:1);f.path.shift();}
    else{f.x+=dx/d*step;f.y+=dy/d*step;budget=0;}
  }
  return !f.path.length;
}
function story(s,f) {
  const choices=[
    f.wood?`I brought home ${f.wood} pieces of wood. I checked. They were all excellent pieces.`:'I think this is a good place to belong.',
    f.stone?`One of my ${f.stone} stones looked like a potato. I did not eat it.`:'I saw a cloud shaped like a slightly smaller cloud.',
    `I like that the lantern is always here when we come home.`,
    `Tomorrow, I might take the scenic route. Just a little.`,
    s.folk.length>1?`${s.folk[(s.folk.indexOf(f)+1)%s.folk.length].name} waved to me today. That was my favorite bit.`:'It is quiet here. Not lonely quiet. Nice quiet.',
    s.buildings.some(b=>b.type==='garden')?'A butterfly sat beside me in the garden. We had a lot in common.':'I found a very comfortable patch of grass. I will not be taking questions.'
  ];return choices[Math.floor(rand(s)*choices.length)];
}
export function ringBell(s,automatic=false) {
  if(!s.folk.length)return {ok:false,reason:'The lantern is waiting for its first friend.'};
  if(s.meeting)return {ok:false,reason:'Everyone is already gathering.'};
  if(!automatic&&s.t-s.lastBell<70)return {ok:false,reason:'Let them make a few more memories first.'};
  const slots=[];for(let y=s.hearth.y-3;y<=s.hearth.y+3;y++)for(let x=s.hearth.x-3;x<=s.hearth.x+3;x++)if(walkable(s,x,y)&&Math.hypot(x-s.hearth.x,y-s.hearth.y)<=3.2)slots.push(idx(x,y));
  if(!slots.length)return {ok:false,reason:'Give the lantern a little room.'};
  slots.sort((a,b)=>Math.abs(Math.hypot(a%W-s.hearth.x,Math.floor(a/W)-s.hearth.y)-2)-Math.abs(Math.hypot(b%W-s.hearth.x,Math.floor(b/W)-s.hearth.y)-2));
  s.meeting={start:s.t,end:s.t+26,next:s.t+9,stories:0};s.lastBell=s.t;
  s.folk.forEach((f,n)=>{const p=findPath(s,f,[slots[n%slots.length]]);setRoute(f,p||[],'toGather');f.bubble='Lantern time!';f.bubbleUntil=s.t+3;});
  emit(s,'bell',{automatic});return {ok:true};
}
export function step(s,dt) {
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.25);s.t+=dt;settleFolk(s);
  const day=Math.floor(s.t/240),phase=s.t%240;
  if(phase>=186&&s.lastDusk!==day){s.lastDusk=day;if(s.folk.length&&!s.meeting)ringBell(s,true);}
  for(const t of s.tiles)if(t.node&&t.node.amount<=0&&!t.node.clear){t.node.rest-=dt;if(t.node.rest<=0){t.node.amount=t.node.type==='tree'?18:16;t.node.rest=0;}}
  if(s.meeting){
    const m=s.meeting;
    if(s.t>=m.next&&m.stories<3){const present=s.folk.filter(f=>f.mode==='sitting');if(present.length){const f=present[m.stories%present.length],text=story(s,f);f.bubble=text;f.bubbleUntil=s.t+5.5;remember(s,f.name,text);m.stories++;}m.next=s.t+5.5;}
    if(s.t>=m.end){s.meeting=null;for(const f of s.folk){f.path=[];f.mode='idle';f.timer=rand(s)*1.5;f.bubble='';}emit(s,'gatherEnd');}
  }
  for(const f of s.folk){
    if(s.meeting&&f.mode!=='toGather'&&f.mode!=='sitting'){const p=findPath(s,f,rim(s,s.hearth.x,s.hearth.y));setRoute(f,p||[],'toGather');}
    if(f.mode==='sitting')continue;
    if(['toResource','toStore','toGarden','toGather'].includes(f.mode)){
      if(!move(s,f,dt))continue;
      if(f.mode==='toResource') {const n=s.tiles[f.target]?.node;if(!n||(n.amount<=0&&!n.clear)){f.mode='idle';f.timer=.1;continue;}const node={x:f.target%W,y:Math.floor(f.target/W)},boost=support(s,n.type==='tree'?'lumber':'quarry',node);f.mode='work';f.timer=n.clear?.65:(n.type==='tree'?2.4:3.2)/(1+s.tools*.22+(boost?.45:0));f.workTotal=f.timer;}
      else if(f.mode==='toStore'){
        if(f.carry){const {type,amount}=f.carry;if(type==='tree'){s.wood+=amount;f.wood+=amount;}else{s.stone+=amount;f.stone+=amount;}s.delivered+=amount;f.trips++;emit(s,'delivery',{resource:type,amount,x:f.x,y:f.y});
          if(!s.firstLog){s.firstLog=true;remember(s,f.name,`${f.name} brought home the first ${type==='tree'?'log':'stone'}. It was almost as big as ${f.name}.`);}
          f.carry=null;
        }f.target=null;f.mode='idle';f.timer=.35+rand(s)*.6;
      }else if(f.mode==='toGarden'){f.mode='rest';f.timer=3;f.bubble='Hello, butterfly.';f.bubbleUntil=s.t+3;}
      else if(f.mode==='toGather')f.mode='sitting';
      continue;
    }
    if(f.mode==='work'){
      f.timer-=dt;if(f.timer<=0){const n=s.tiles[f.target]?.node;if(n&&n.amount>0){const boost=support(s,n.type==='tree'?'lumber':'quarry',{x:f.target%W,y:Math.floor(f.target/W)}),amount=Math.min(n.amount,n.clear?n.amount:2+s.tools+(boost?1:0));n.amount-=amount;if(n.amount<=0)n.rest=n.type==='tree'?65:90;f.carry={type:n.type,amount};emit(s,'harvest',{resource:n.type,x:f.target%W+.5,y:Math.floor(f.target/W)+.5});}const tile=s.tiles[f.target];if(tile?.node?.clear&&tile.node.amount<=0){tile.node=null;s.topology=(s.topology||0)+1;emit(s,'landCleared',{x:f.target%W+.5,y:Math.floor(f.target/W)+.5});}returning(s,f);}continue;
    }
    if(f.mode==='rest'){f.timer-=dt;if(f.timer<=0){f.mode='idle';f.timer=.2;}continue;}
    f.timer-=dt;if(f.timer<=0)findWork(s,f);
  }
  stepIndustry(s,dt);stepBloom(s,dt);
  for(const [type,d] of Object.entries(BUILDINGS))if(d.unlock>0&&s.delivered>=d.unlock&&!s.knownUnlocks.includes(type)){s.knownUnlocks.push(type);emit(s,'unlock',{name:d.name,type});}
}
export function describeFolk(s,f){
  if((f.mode==='work'||f.mode==='toResource')&&s.tiles[f.target]?.node?.clear)return f.mode==='work'?'Making room for something new.':'Off to clear a marked patch.';
  if(f.bubble&&s.t<f.bubbleUntil)return f.bubble;
  if(f.mode==='work'||f.mode==='toResource')return s.tiles[f.target]?.node?.type==='tree'?(f.mode==='work'?'Choosing a very good log.':'Off to find some wood.'):(f.mode==='work'?'Looking for the roundest stone.':'Off to gather stones.');
  return {idle:'Taking a tiny breather.',toStore:`Bringing ${f.carry?.amount||0} ${f.carry?.type==='tree'?'wood':'stone'} home.`,toGarden:'Taking the scenic route.',rest:'Making friends with a butterfly.',toGather:'Coming home to the lantern.',sitting:'Together is a nice place to be.'}[f.mode]||'Enjoying being very small.';
}
/** Mark a bounded selection for autonomous, permanent clearing. Unmarked resources regrow. */
export function markClearing(s, cells, clear=true) {
  if(!s.folk.length)return {ok:false,reason:'Place a hut first. Your folk will clear the land for you.',changed:[]};
  const ids=[...new Set(cells)].filter(i=>Number.isInteger(i)&&i>=0&&i<W*H).slice(0,W*H);
  const changed=[];let protectedCount=0;
  const reachable=villageReachability(s);
  const accessible=new Set(s.tiles.flatMap((t,i)=>t.node&&rim(s,i%W,Math.floor(i/W)).some(j=>reachable[j])?[i]:[]));
  for(const i of ids){
    const n=s.tiles[i].node;if(!n||!!n.clear===clear)continue;
    if(clear){
      const remaining=s.tiles.filter(t=>t.node?.type===n.type&&!t.node.clear).length;
      // Keep renewable seed stock and the last deposit beside an existing extractor.
      const minimum=n.type==='tree'?4:2;
      const dependent=s.buildings.some(b=>((n.type==='tree'&&b.type==='forester')||(n.type==='stone'&&['mine','stoneworks'].includes(b.type)))&&
        Math.hypot(i%W-b.x,Math.floor(i/W)-b.y)<=7&&!s.tiles.some((t,j)=>j!==i&&t.node?.type===n.type&&!t.node.clear&&Math.hypot(j%W-b.x,Math.floor(j/W)-b.y)<=7));
      const reachableRemaining=s.tiles.filter((t,j)=>t.node?.type===n.type&&!t.node.clear&&accessible.has(j)).length;
      if(remaining<=minimum||dependent||(accessible.has(i)&&reachableRemaining<=1)){protectedCount++;continue;}
    }
    n.clear=clear;changed.push(i);
  }
  if(changed.length){emit(s,'landMarked',{count:changed.length});}
  return {ok:changed.length>0,changed,protectedCount,reason:protectedCount?'A few renewable resources are protected so the village cannot run out.':changed.length?'':'No matching trees or stones in that patch.'};
}
export function quickClear(s,cells){
  const requested=[...new Set(cells)].filter(i=>Number.isInteger(i)&&i>=0&&i<W*H);
  const result=markClearing(s,requested,true);if(!s.folk.length)return result;
  const cleared=requested.filter(i=>s.tiles[i].node?.clear);let wood=0,stone=0;
  for(const i of cleared){const n=s.tiles[i].node,amount=Math.floor(n.amount/2);if(n.type==='tree')wood+=amount;else stone+=amount;s.tiles[i].node=null;}
  if(cleared.length){s.wood+=wood;s.stone+=stone;s.delivered+=wood+stone;s.topology=(s.topology||0)+1;for(const f of s.folk)if(cleared.includes(f.target)&&['work','toResource'].includes(f.mode)){f.target=null;f.path=[];f.mode='idle';f.timer=.1;}emit(s,'landCleared',{x:s.hearth.x,y:s.hearth.y});}
  return {...result,ok:cleared.length>0,cleared,wood,stone};
}
export function plantTree(s,x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y)||!inside(x,y)||!walkable(s,x,y)||at(s,x,y).path)return {ok:false,reason:'Plant on empty grass.'};
  if(s.wood<2)return {ok:false,reason:'A sapling costs 2 wood.'};
  if(s.folk.some(f=>Math.floor(f.x)===x&&Math.floor(f.y)===y))return {ok:false,reason:'Give that littlefolk room to pass.'};
  const extra={x,y,w:1,h:1},starts=rim(s,s.hearth.x,s.hearth.y,1,1,extra);
  if(!starts.length)return {ok:false,reason:'Keep the lantern reachable.'};
  const seen=villageReachability(s,extra);
  if(!rim(s,x,y,1,1,extra).some(i=>seen[i])||s.buildings.some(b=>!rim(s,b.x,b.y,2,2,extra).some(i=>seen[i]))||s.folk.some(f=>!seen[idx(Math.floor(f.x),Math.floor(f.y))]))return {ok:false,reason:'That sapling would block a walking route.'};
  for(const resource of ['tree','stone'])if(!s.tiles.some((t,i)=>t.node?.type===resource&&rim(s,i%W,Math.floor(i/W),1,1,extra).some(j=>seen[j])))return {ok:false,reason:'Keep existing resources reachable.'};
  at(s,x,y).node={type:'tree',amount:0,rest:25,clear:false};s.wood-=2;s.topology=(s.topology||0)+1;
  emit(s,'landPlanted',{x:x+.5,y:y+.5});return {ok:true};
}
export function removePath(s,x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y)||!inside(x,y)||!at(s,x,y).path)return {ok:false,reason:'Tap a footpath to lift it.'};
  at(s,x,y).path=false;s.stone++;s.pavingRevision=(s.pavingRevision||0)+1;emit(s,'landPath',{x:x+.5,y:y+.5});return {ok:true};
}
/** Validate movement against the remaining village, without charging or creating a new resident. */
export function movePlacement(s,id,x,y){
  const b=s.buildings.find(b=>b.id===id);if(!b)return {ok:false,reason:'That building is not here.'};
  if(b.x===x&&b.y===y)return {ok:false,reason:'Choose a new patch for this building.'};
  const old=s.buildings,revision=s.topology;s.buildings=old.filter(v=>v.id!==id);s.topology=(revision||0)+1;
  try{return placement(s,b.type,x,y,{ignoreCost:true});}
  finally{s.buildings=old;s.topology=revision;spatial.delete(s);reachCache.delete(s);}
}
export function moveBuilding(s,id,x,y){
  const result=movePlacement(s,id,x,y);if(!result.ok)return result;
  const b=s.buildings.find(b=>b.id===id),d=BUILDINGS[b.type];liftUnder(s,x,y,d.w,d.h);b.x=x;b.y=y;s.topology=(s.topology||0)+1;settleFolk(s);
  for(const f of s.folk){f.path=[];f.target=null;f.mode='idle';f.timer=.2;}
  emit(s,'buildingMoved',{x:x+.5,y:y+.5});return {ok:true};
}

export function snapshot(s) {const copy=JSON.parse(JSON.stringify(s));copy.events=[];copy.savedAt=Date.now();return copy;}
export function restore(raw) {
  if(!raw||![1,VERSION].includes(raw.version)||!Array.isArray(raw.tiles)||raw.tiles.length!==W*H)throw new Error('This is not a supported Littlefolk save.');
  if(!Array.isArray(raw.buildings)||raw.buildings.length>200||!Array.isArray(raw.folk)||raw.folk.length>24)throw new Error('This village save is too large or incomplete.');
  const finite=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
  for(const k of ['t','wood','stone','delivered'])if(!finite(raw[k],0,1e12))throw new Error('Invalid village totals.');
  if(!finite(raw.tools,0,2)||!Number.isInteger(raw.tools)||!finite(raw.nextId,1,1e9)||!finite(raw.seed,1,4294967295)||!finite(raw.rng,0,4294967295))throw new Error('Invalid village state.');
  const s=createWorld(raw.seed);Object.assign(s,raw);s.version=VERSION;s.topology=0;s.events=[];s.meeting=null;s.hearth={x:22,y:17};
  s.tiles=raw.tiles.map(t=>{if(!t||!['grass','water'].includes(t.ground)||!finite(t.detail,0,1))throw new Error('Invalid map tile.');let node=null;if(t.node){if(!['tree','stone'].includes(t.node.type)||!finite(t.node.amount,0,100)||!finite(t.node.rest,0,1000))throw new Error('Invalid resource.');node={type:t.node.type,amount:t.node.amount,rest:t.node.rest,clear:!!t.node.clear};}return {ground:t.ground,detail:t.detail,node,path:!!t.path};});
  const used=new Set();
  s.buildings=raw.buildings.map(b=>{const d=BUILDINGS[b.type];if(!d||b.type==='path'||!finite(b.x,0,W-d.w)||!finite(b.y,0,H-d.h)||!Number.isInteger(b.x)||!Number.isInteger(b.y)||!finite(b.id,1,1e9)||!finite(b.level,1,3)||used.has(b.id))throw new Error('Invalid building.');used.add(b.id);return {id:b.id,type:b.type,x:b.x,y:b.y,level:b.level};});
  const occupied=new Set();for(const b of s.buildings){const d=BUILDINGS[b.type];for(let y=b.y;y<b.y+d.h;y++)for(let x=b.x;x<b.x+d.w;x++){const i=idx(x,y);if(occupied.has(i)||at(s,x,y).ground==='water'||at(s,x,y).node||(x===22&&y===17))throw new Error('Overlapping or unreachable building.');occupied.add(i);}}
  s.folk=raw.folk.map((f,n)=>{if(!finite(f.x,0,W-.001)||!finite(f.y,0,H-.001)||!finite(f.id,1,1e9)||used.has(f.id)||!s.buildings.some(b=>b.id===f.home&&b.type==='hut'))throw new Error('Invalid littlefolk.');used.add(f.id);for(const k of ['wood','stone','trips'])if(!finite(f[k],0,1e12))throw new Error('Invalid littlefolk totals.');const carry=f.carry;if(carry&&(!['tree','stone'].includes(carry.type)||!finite(carry.amount,1,100)))throw new Error('Invalid carried resource.');return {id:f.id,name:String(f.name).slice(0,24),color:COLORS[n%COLORS.length],hat:n%4,home:f.home,x:f.x,y:f.y,wood:f.wood,stone:f.stone,trips:f.trips,carry:carry?{type:carry.type,amount:carry.amount}:null,favorite:n%2?'stone':'tree',mode:'idle',path:[],timer:.2+n*.1,target:null,bubble:'A new little day.',bubbleUntil:s.t+3};});
  const starts=rim(s,22,17);if(!starts.length)throw new Error('The lantern has no path.');const reachable=villageReachability(s);
  for(const b of s.buildings)if(!rim(s,b.x,b.y,2,2).some(i=>reachable[i]))throw new Error('An unreachable building was found.');
  for(const f of s.folk)if(!walkable(s,Math.floor(f.x),Math.floor(f.y))||!reachable[idx(Math.floor(f.x),Math.floor(f.y))]){const b=s.buildings.find(b=>b.id===f.home),i=rim(s,b.x,b.y,2,2).find(j=>reachable[j]);f.x=i%W+.5;f.y=Math.floor(i/W)+.5;}
  s.nextId=Math.max(s.nextId,...used)+1;
  s.memories=(Array.isArray(raw.memories)?raw.memories:[]).slice(0,60).map(m=>({day:finite(m.day,1,1e10)?Math.floor(m.day):1,who:String(m.who||'The village').slice(0,24),text:String(m.text||'').slice(0,300),time:finite(m.time,0,1e12)?m.time:0}));
  s.knownUnlocks=Object.keys(BUILDINGS).filter(k=>s.delivered>=BUILDINGS[k].unlock&&BUILDINGS[k].unlock>0);s.firstLog=!!raw.firstLog;s.lastBell=finite(raw.lastBell,-1000,1e12)?raw.lastBell:-1000;s.lastDusk=finite(raw.lastDusk,-1,1e10)?raw.lastDusk:-1;
  restoreIndustry(s,raw);restoreBloom(s,raw);return s;
}
configureIndustry({W,H,BUILDINGS,walkable,findPath,remember,villageReachability});
configureBloom({BUILDINGS,ITEMS,RECIPES,RESEARCH,compatible,remember});
