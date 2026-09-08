import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,W,H,BUILDINGS,place,step,snapshot,restore,quickClear,markClearing} from '../world.js';
import {RECIPES,ITEMS,connectStorage,stepIndustry,research} from '../industry.js';
import {serveSupper,stepBloom,projectStatus,completeProject,PROJECTS,BUILDING_PURPOSE,bloomGoal,moodName} from '../bloom.js';
const advance=(s,n)=>{for(let i=0;i<n*10;i++)step(s,.1);};
const home=()=>{const s=createWorld(41728);assert.ok(place(s,'hut',20,19).ok);return s;};
const rich=()=>{const s=home();s.wood=2000;s.stone=2000;s.delivered=2000;return s;};
const build=(s,t,x,y)=>{const r=place(s,t,x,y);assert.ok(r.ok,`${t}: ${r.reason}`);const b=s.buildings.at(-1);connectStorage(s,b.id);return b;};

test('new islands have a generous central meadow without erasing renewable resources',()=>{
 for(const seed of [1,42,41728,9999,100000]){const s=createWorld(seed);let clear=0;for(let y=12;y<=25;y++)for(let x=13;x<=28;x++)if(!s.tiles[y*W+x].node)clear++;assert.ok(clear>=210);assert.ok(s.tiles.filter(t=>t.node?.type==='tree').length>=4);assert.ok(s.tiles.filter(t=>t.node?.type==='stone').length>=2);assert.ok(place(s,'hut',20,19).ok);assert.doesNotThrow(()=>restore(snapshot(s)));}
});
test('whole-island quick clearing is bounded, retains seed stock, and cannot award twice',()=>{
 const s=home(),ids=s.tiles.flatMap((t,i)=>t.node?[i]:[]),original=new Map(ids.map(i=>[i,{...s.tiles[i].node}]));
 const r=quickClear(s,ids);assert.ok(r.ok);assert.ok(r.cleared.length>30);assert.equal(r.wood,r.cleared.reduce((n,i)=>n+(original.get(i).type==='tree'?Math.floor(original.get(i).amount/2):0),0));assert.equal(r.stone,r.cleared.reduce((n,i)=>n+(original.get(i).type==='stone'?Math.floor(original.get(i).amount/2):0),0));
 assert.ok(s.tiles.filter(t=>t.node?.type==='tree').length>=4);assert.ok(s.tiles.filter(t=>t.node?.type==='stone').length>=2);const before=s.wood+s.stone;quickClear(s,r.cleared);assert.equal(s.wood+s.stone,before);assert.doesNotThrow(()=>restore(snapshot(s)));
});
test('quick clear cannot erase a carried bundle or duplicate an in-progress harvest',()=>{
 const s=home(),i=17*W+16;markClearing(s,[i]);while(s.tiles[i].node)step(s,.1);const f=s.folk[0];assert.ok(f.carry.amount===18);const before=s.wood;quickClear(s,[i]);assert.equal(f.carry.amount,18);assert.equal(s.wood,before);const r=restore(snapshot(s));assert.deepEqual(r.folk[0].carry,f.carry);
});
test('one clearing trip now harvests an entire tree in seconds rather than many return trips',()=>{
 const s=home(),i=17*W+16;markClearing(s,[i]);advance(s,8);assert.equal(s.tiles[i].node,null);assert.ok(s.wood+s.folk.reduce((n,f)=>n+(f.carry?.type==='tree'?f.carry.amount:0),0)>=18);
});
test('food works without wind and real vegetable cargo becomes meals delivered home',()=>{
 const s=rich();build(s,'vegetable',17,14);const k=build(s,'kitchen',24,14);s.industry.goods.meal=0;
 assert.equal(s.industry.routes.length,3);assert.equal(s.industry.machines[k.id].cycles,0);advance(s,100);assert.ok(s.industry.goods.meal>0);assert.ok(s.industry.machines[k.id].cycles>0);assert.equal(s.industry.machines[k.id].power,1);assert.equal(s.buildings.some(b=>b.type==='windmill'),false);
});
test('a cookhouse cannot invent vegetables or meals',()=>{
 const s=rich(),k=build(s,'kitchen',24,14);s.industry.goods.meal=0;for(let i=0;i<1000;i++)stepIndustry(s,.1);assert.equal(s.industry.machines[k.id].cycles,0);assert.equal(s.industry.goods.meal,0);
});
test('a fishing cottage requires shoreline and produces its own renewable catch',()=>{
 const s=rich();assert.equal(place(s,'fishery',20,13).ok,false);const f=build(s,'fishery',28,12);advance(s,80);assert.ok(s.industry.goods.fish>0);assert.ok(s.industry.machines[f.id].cycles>0);
});
test('supper pays exactly once per day, including portioned side dishes',()=>{
 const s=rich();build(s,'hut',24,19);build(s,'hut',17,14);s.industry.goods.meal=10;s.industry.goods.berry=10;s.industry.goods.fish=10;
 assert.ok(serveSupper(s).ok);assert.equal(s.industry.goods.meal,7);assert.equal(s.industry.goods.berry,9);assert.equal(s.industry.goods.fish,9);assert.equal(s.bloom.lastVariety,2);assert.equal(s.bloom.lastCoverage,1);assert.equal(serveSupper(s).ok,false);assert.equal(s.industry.goods.meal,7);
 s.t=186;stepBloom(s,.1);assert.equal(s.industry.goods.meal,7);s.t=426;stepBloom(s,.1);assert.equal(s.industry.goods.meal,4);
});
test('serving early rejects insufficient meals; automatic supper shares what exists',()=>{
 const s=home();s.industry.goods.meal=0;assert.equal(serveSupper(s).ok,false);assert.equal(s.bloom.suppers,0);s.t=186;stepBloom(s,.1);assert.equal(s.bloom.suppers,1);assert.equal(s.bloom.lastCoverage,0);assert.equal(s.folk.length,1);assert.equal(s.wood,0);
});
test('neglect makes a quiet village, care restores spirit, neither alters worker speed',()=>{
 const a=home(),b=restore(snapshot(a));a.bloom.mood=0;b.bloom.mood=100;
 a.folk[0].timer=b.folk[0].timer=.1;advance(a,1);advance(b,1);assert.deepEqual([a.folk[0].x,a.folk[0].y],[b.folk[0].x,b.folk[0].y]);
 a.industry.goods.meal=0;a.t=186;stepBloom(a,.1);for(let i=0;i<1000;i++)stepBloom(a,.1);assert.equal(moodName(a),'Quiet');assert.equal(a.folk.length,1);
 a.t=240;a.industry.goods.meal=3;a.industry.goods.berry=3;a.industry.goods.fish=3;assert.ok(serveSupper(a).ok);for(let i=0;i<1200;i++)stepBloom(a,.1);assert.equal(moodName(a),'Flourishing');
});
test('each project charges only its cost once, grants a permanent landmark, and survives saves',()=>{
 const s=rich();s.industry.tier=3;s.industry.postcards=3;for(const k of Object.keys(ITEMS))s.industry.goods[k]=1000;
 for(const p of PROJECTS){const before={...s.industry.goods};assert.ok(projectStatus(s,p).ready);assert.ok(completeProject(s,p.id).ok);for(const [k,n] of Object.entries(p.cost))assert.equal(s.industry.goods[k],before[k]-n);assert.equal(completeProject(s,p.id).ok,false);assert.ok(s.bloom.projects.includes(p.id));}
 const r=restore(snapshot(s));assert.deepEqual(r.bloom.projects,PROJECTS.map(p=>p.id));r.bloom.lastCoverage=0;r.bloom.suppers=1;for(let n=0;n<1000;n++)stepBloom(r,.1);assert.equal(r.bloom.projects.length,5);
});
test('later projects cannot skip research, earlier landmarks or the three star letters',()=>{
 const s=rich();for(const k of Object.keys(ITEMS))s.industry.goods[k]=1000;assert.equal(completeProject(s,'fair').ok,false);completeProject(s,'picnic');completeProject(s,'arch');assert.equal(completeProject(s,'fountain').ok,false);s.industry.tier=3;completeProject(s,'fountain');completeProject(s,'parade');assert.equal(completeProject(s,'fair').ok,false);s.industry.postcards=3;assert.ok(completeProject(s,'fair').ok);
});
test('old villages get welcome meals once, preserve all progress, and do not mutate the input',()=>{
 const s=rich(),raw=snapshot(s);delete raw.bloom;for(const k of ['veg','berry','fish','meal']){delete raw.industry.goods[k];delete raw.industry.limits[k];}const before=JSON.stringify(raw),r=restore(raw);assert.equal(r.industry.goods.meal,2);assert.equal(r.folk[0].name,'Pip');assert.equal(r.wood,s.wood);assert.equal(JSON.stringify(raw),before);assert.equal(restore(snapshot(r)).industry.goods.meal,2);
});
test('invalid care and project data are rejected instead of corrupting a healthy save',()=>{
 const raw=snapshot(home());for(const change of [s=>s.bloom.mood=NaN,s=>s.bloom.projects=['invalid'],s=>s.bloom.projects=['picnic','picnic'],s=>s.bloom.autoConnect='yes',s=>s.bloom.lastCoverage=9,s=>s.bloom.theme=-1]){const r=structuredClone(raw);change(r);assert.throws(()=>restore(r));}
});
test('every building has a purpose card and factory recipes name supported goods',()=>{
 for(const [k,d] of Object.entries(BUILDINGS)){assert.ok(BUILDING_PURPOSE[k],k);assert.ok(d.desc);if(RECIPES[k]){assert.ok(ITEMS[RECIPES[k].output]);for(const item of Object.keys(RECIPES[k].input))assert.ok(ITEMS[item]);}}
 const s=home(),goal=bloomGoal(s);assert.equal(goal.build,'vegetable');
});
test('food and multi-stage factories remain finite through one simulated hour and repeated saves',()=>{
 let s=rich();build(s,'vegetable',17,14);build(s,'kitchen',24,14);build(s,'orchard',24,19);build(s,'fishery',28,12);build(s,'windmill',14,21);build(s,'sawmill',17,25);
 for(let j=0;j<12;j++){advance(s,300);s=restore(snapshot(s));}
 assert.ok(s.bloom.suppers>=14);assert.ok(s.bloom.goodSuppers>0);assert.ok(s.bloom.mood>50);assert.ok(s.industry.goods.plank>0);assert.equal(s.folk.length,1);assert.ok(s.industry.history.length<=800);for(const n of Object.values(s.industry.goods))assert.ok(Number.isFinite(n)&&n>=0);assert.ok(s.industry.shipments.length<=64*3);
});
