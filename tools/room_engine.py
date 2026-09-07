from pathlib import Path

# One-time development integration against the reviewed 2.0 source, not a player migration.
def edit(name,old,new):
 p=Path(name);s=p.read_text();assert old in s,(name,old[:100]);p.write_text(s.replace(old,new,1))

edit('world.js','export function placement(s,type,x,y) {','export function placement(s,type,x,y,options={}) {')
edit('world.js','industryPlacement(s,type,x,y);','industryPlacement(s,type,x,y,options.ignoreCost);')
edit('world.js','if(s.delivered<d.unlock)return','if(!options.ignoreCost&&s.delivered<d.unlock)return')
edit('world.js',"if(type==='hut' && s.folk.length>=24)","if(!options.ignoreCost&&type==='hut' && s.folk.length>=24)")
edit('world.js','if(s.wood<c.wood||s.stone<c.stone)return {ok:false,reason:`Needs ${c.wood} wood and ${c.stone} stone.`};','if(!options.ignoreCost&&(s.wood<c.wood||s.stone<c.stone))return {ok:false,reason:`Needs ${c.wood} wood and ${c.stone} stone.`};')
edit('world.js',"  const c=cost(s,type);if(!options.ignoreCost", "  if(type!=='path'&&s.buildings.length>=200)return {ok:false,reason:'This island has room for 200 buildings.'};\n  const c=cost(s,type);if(!options.ignoreCost")
edit('world.js',"if(!n||n.amount<=0)continue;const reserved=", "if(!n||(n.amount<=0&&!n.clear))continue;const reserved=")
edit('world.js',"score=need[n.type]*(n.type===f.favorite?1.12:1)/(5+Math.hypot(f.x-x,f.y-y));", "score=(n.clear?500:need[n.type]*(n.type===f.favorite?1.12:1))/(5+Math.hypot(f.x-x,f.y-y));")
edit('world.js',"if(t.node&&t.node.amount<=0){", "if(t.node&&t.node.amount<=0&&!t.node.clear){")
edit('world.js',"if(!n||n.amount<=0){f.mode='idle';", "if(!n||(n.amount<=0&&!n.clear)){f.mode='idle';")
edit('world.js',"amount=Math.min(n.amount,2+s.tools+(boost?1:0));", "amount=Math.min(n.amount,n.clear?Math.min(6,4+s.tools):2+s.tools+(boost?1:0));")
edit('world.js',"});}returning(s,f);}continue;", "});}const tile=s.tiles[f.target];if(tile?.node?.clear&&tile.node.amount<=0){tile.node=null;s.topology=(s.topology||0)+1;emit(s,'landCleared',{x:f.target%W+.5,y:Math.floor(f.target/W)+.5});}returning(s,f);}continue;")
edit('world.js',"  if(f.bubble&&s.t<f.bubbleUntil)return f.bubble;", "  if((f.mode==='work'||f.mode==='toResource')&&s.tiles[f.target]?.node?.clear)return f.mode==='work'?'Making room for something new.':'Off to clear a marked patch.';\n  if(f.bubble&&s.t<f.bubbleUntil)return f.bubble;")
edit('world.js','node={type:t.node.type,amount:t.node.amount,rest:t.node.rest};','node={type:t.node.type,amount:t.node.amount,rest:t.node.rest,clear:!!t.node.clear};')
p=Path('world.js');s=p.read_text();anchor='export function snapshot(s)'
new=r'''/** Mark a bounded selection for autonomous, permanent clearing. Unmarked resources regrow. */
export function markClearing(s, cells, clear=true) {
  if(!s.folk.length)return {ok:false,reason:'Place a hut first. Your folk will clear the land for you.',changed:[]};
  const ids=[...new Set(cells)].filter(i=>Number.isInteger(i)&&i>=0&&i<W*H).slice(0,100);
  const changed=[];let protectedCount=0;
  const starts=rim(s,s.hearth.x,s.hearth.y),reachable=starts.length?flood(s,starts[0]):new Uint8Array(W*H);
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
export function plantTree(s,x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y)||!inside(x,y)||!walkable(s,x,y)||at(s,x,y).path)return {ok:false,reason:'Plant on empty grass.'};
  if(s.wood<2)return {ok:false,reason:'A sapling costs 2 wood.'};
  if(s.folk.some(f=>Math.floor(f.x)===x&&Math.floor(f.y)===y))return {ok:false,reason:'Give that littlefolk room to pass.'};
  const extra={x,y,w:1,h:1},starts=rim(s,s.hearth.x,s.hearth.y,1,1,extra);
  if(!starts.length)return {ok:false,reason:'Keep the lantern reachable.'};
  const seen=flood(s,starts[0],extra);
  if(!rim(s,x,y,1,1,extra).some(i=>seen[i])||s.buildings.some(b=>!rim(s,b.x,b.y,2,2,extra).some(i=>seen[i]))||s.folk.some(f=>!seen[idx(Math.floor(f.x),Math.floor(f.y))]))return {ok:false,reason:'That sapling would block a walking route.'};
  for(const resource of ['tree','stone'])if(!s.tiles.some((t,i)=>t.node?.type===resource&&rim(s,i%W,Math.floor(i/W),1,1,extra).some(j=>seen[j])))return {ok:false,reason:'Keep existing resources reachable.'};
  at(s,x,y).node={type:'tree',amount:0,rest:25,clear:false};s.wood-=2;s.topology=(s.topology||0)+1;
  emit(s,'landPlanted',{x:x+.5,y:y+.5});return {ok:true};
}
export function removePath(s,x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y)||!inside(x,y)||!at(s,x,y).path)return {ok:false,reason:'Tap a footpath to lift it.'};
  at(s,x,y).path=false;s.stone++;emit(s,'landPath',{x:x+.5,y:y+.5});return {ok:true};
}
/** Validate movement against the remaining village, without charging or creating a new resident. */
export function movePlacement(s,id,x,y){
  const b=s.buildings.find(b=>b.id===id);if(!b)return {ok:false,reason:'That building is not here.'};
  if(b.x===x&&b.y===y)return {ok:false,reason:'Choose a new patch for this building.'};
  const old=s.buildings,revision=s.topology;s.buildings=old.filter(v=>v.id!==id);s.topology=(revision||0)+1;
  try{return placement(s,b.type,x,y,{ignoreCost:true});}
  finally{s.buildings=old;s.topology=revision;spatial.delete(s);}
}
export function moveBuilding(s,id,x,y){
  const result=movePlacement(s,id,x,y);if(!result.ok)return result;
  const b=s.buildings.find(b=>b.id===id);b.x=x;b.y=y;s.topology=(s.topology||0)+1;
  for(const f of s.folk){f.path=[];f.target=null;f.mode='idle';f.timer=.2;}
  emit(s,'buildingMoved',{x:x+.5,y:y+.5});return {ok:true};
}
'''
assert anchor in s;p.write_text(s.replace(anchor,new+'\n'+anchor))
edit('industry.js','export function industryPlacement(s,type,x,y){','export function industryPlacement(s,type,x,y,ignoreCost=false){')
edit('industry.js','if(s.industry.tier<d.tier)return','if(!ignoreCost&&s.industry.tier<d.tier)return')
edit('industry.js','for(const [k,n] of Object.entries(d.extra))if(stock(s,k)<n)', 'for(const [k,n] of Object.entries(d.extra))if(!ignoreCost&&stock(s,k)<n)')
edit('industry.js',"function compatible(s,from,to){", "export function compatible(s,from,to){")
p=Path('industry.js');s=p.read_text();anchor='function incoming(s,id,item)'
new=r'''/** Optional convenience wiring. Nothing is teleported and existing custom routes are retained. */
export function connectStorage(s,id){
  const b=getB(s,id),recipe=RECIPES[b?.type];if(!recipe)return {ok:false,reason:'Choose a production workshop.'};
  const hubs=s.buildings.filter(isHub).sort((a,c)=>distance(center(a),center(b))-distance(center(c),center(b)));
  for(const hub of hubs){
    const desired=[];
    if(Object.keys(recipe.input).length&&!s.industry.routes.some(q=>q.from===hub.id&&q.to===id))desired.push([hub.id,id]);
    if(recipe.output!=='star'&&!s.industry.routes.some(q=>q.from===id&&q.to===hub.id))desired.push([id,hub.id]);
    if(!desired.length)return {ok:true,count:0,hub:hub.id};
    if(s.industry.routes.length+desired.length>MAX_ROUTES)return {ok:false,reason:'Not enough route slots. Remove an unused route first.'};
    const routesBefore=[...s.industry.routes],nextBefore=s.industry.nextId,eventCount=s.events.length;
    const results=desired.map(([a,c])=>connect(s,a,c));
    if(results.every(r=>r.ok))return {ok:true,count:desired.length,hub:hub.id};
    s.industry.routes=routesBefore;s.industry.nextId=nextBefore;s.events.splice(eventCount);
  }
  return {ok:false,reason:'Place a reachable hut or stockpile nearby.'};
}
'''
assert anchor in s;p.write_text(s.replace(anchor,new+'\n'+anchor))
