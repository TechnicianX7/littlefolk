import test from 'node:test';import assert from 'node:assert/strict';import {mkdirSync,writeFileSync} from 'node:fs';
import {createWorld,place,placement,step,snapshot,restore,W,H,quickClear,moveBuilding} from '../world.js';
import {connectStorage,research,optimizeStorage} from '../industry.js';import {bloomGoal,completeProject,PROJECTS,projectStatus} from '../bloom.js';
const reports=[];
for(const scenario of [{seed:1},{seed:42,pinFuture:true},{seed:41728,lowCaps:true},{seed:9999,clear:true}])test('full earned progression '+JSON.stringify(scenario),()=>{
 let s=createWorld(scenario.seed);assert.ok(place(s,'hut',20,19).ok);if(scenario.pinFuture)s.bloom.pinned='fair';if(scenario.lowCaps)for(const k of Object.keys(s.industry.limits))s.industry.limits[k]=1;if(scenario.clear)quickClear(s,s.tiles.flatMap((t,i)=>t.node?[i]:[]));
 const sites=[];for(let y=2;y<H-3;y++)for(let x=2;x<W-3;x++)sites.push({x,y,d:Math.hypot(x-22,y-18)});sites.sort((a,b)=>a.d-b.d);const milestones=[];
 for(let j=0;j<30000&&s.bloom.projects.length<5;j++){
  step(s,.2);if(j%25)continue;const g=bloomGoal(s);
  if(g.build){for(const {x,y} of sites)if(placement(s,g.build,x,y).ok){assert.ok(place(s,g.build,x,y).ok);connectStorage(s,s.buildings.at(-1).id);break;}}
  if(g.inspect){connectStorage(s,g.inspect);const m=s.industry.machines[g.inspect];if(m)m.paused=false;}
  if(g.book==='research')research(s);
  if(g.board){const p=PROJECTS.find(p=>projectStatus(s,p).ready);if(p){completeProject(s,p.id);milestones.push({project:p.id,seconds:Math.round(s.t)});}}
  if(j%2500===0){const before=s.industry.routes.length;s=restore(snapshot(s));assert.equal(s.industry.routes.length,before);optimizeStorage(s);}
 }
 reports.push({...scenario,projects:milestones,seconds:Math.round(s.t),residents:s.folk.length,goods:s.industry.goods});mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/works-progression.json',JSON.stringify(reports,null,2));
 assert.equal(s.bloom.projects.length,5,JSON.stringify({scenario,goal:bloomGoal(s),goods:s.industry.goods,milestones}));assert.ok(s.industry.postcards>=3);assert.doesNotThrow(()=>restore(snapshot(s)));
});
