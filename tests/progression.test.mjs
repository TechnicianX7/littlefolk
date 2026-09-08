import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,place,placement,step,snapshot,restore,W,H} from '../world.js';
import {connectStorage,connect,stepIndustry,research} from '../industry.js';
import {bloomGoal,completeProject,PROJECTS,projectStatus,fundingPlan} from '../bloom.js';

test('an unfunded fresh village can follow its own next-step guidance all the way to the fair',()=>{
 const s=createWorld(41728);assert.ok(place(s,'hut',20,19).ok);
 const sites=[];for(let y=2;y<H-3;y++)for(let x=2;x<W-3;x++)sites.push({x,y,d:Math.hypot(x-22,y-18)});sites.sort((a,b)=>a.d-b.d);
 for(let i=0;i<36000&&s.bloom.projects.length<5;i++){
  step(s,.1);if(i%50)continue;const goal=bloomGoal(s);
  if(goal.build){for(const {x,y} of sites)if(placement(s,goal.build,x,y).ok){assert.ok(place(s,goal.build,x,y).ok);connectStorage(s,s.buildings.at(-1).id);break;}}
  if(goal.inspect){connectStorage(s,goal.inspect);const m=s.industry.machines[goal.inspect];if(m)m.paused=false;}
  if(goal.book==='research')research(s);
  if(goal.board){const p=PROJECTS.find(p=>projectStatus(s,p).ready);if(p)completeProject(s,p.id);}
 }
 assert.equal(s.bloom.projects.length,5,'All five projects must be reachable without gifts, debug stock, or skipping research.');assert.equal(s.industry.tier,3);assert.ok(s.industry.postcards>=3);assert.equal(s.folk.length,3);assert.ok(s.bloom.goodSuppers>0);assert.doesNotThrow(()=>restore(snapshot(s)));
});
test('a wish budget protects refined home stock and can be disabled without losing any goods',()=>{
 const s=createWorld(41728);place(s,'hut',20,19);s.wood=200;s.stone=200;s.delivered=500;s.industry.tier=3;s.industry.goods={plank:40,brick:40,gear:40};
 assert.ok(place(s,'skypost',24,14).ok);const post=s.buildings.at(-1);s.industry.goods.plank=8;s.industry.goods.gear=0;connect(s,s.buildings[0].id,post.id,'plank');
 assert.equal(fundingPlan(s).plank,8);stepIndustry(s,.1);assert.equal(s.industry.goods.plank,8);assert.equal(s.industry.shipments.length,0);
 s.bloom.fundWish=false;stepIndustry(s,.1);assert.equal(s.industry.goods.plank,5);assert.equal(s.industry.shipments[0].amount,3);assert.equal(restore(snapshot(s)).bloom.fundWish,false);
});
