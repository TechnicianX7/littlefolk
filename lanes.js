/* Village Works: cardinal, shared delivery lanes. All caches are derived, never save data. */
let E;
const networks = new WeakMap();
export function configureLanes(engine) { E = engine; }
const cell = p => Math.floor(p.y) * E.W + Math.floor(p.x);
const point = i => ({x:i%E.W+.5,y:Math.floor(i/E.W)+.5});
export function routeLength(path) { let n=0;for(let j=1;j<(path?.length||0);j++)n+=Math.abs(path[j].x-path[j-1].x)+Math.abs(path[j].y-path[j-1].y);return Math.max(.1,n); }
export function routeBends(path) {let n=0,last=-1;for(let j=1;j<(path?.length||0);j++){const d=path[j].x!==path[j-1].x?0:1;if(last>=0&&d!==last)n++;last=d;}return n;}
/** One consistent, reachable loading tile per building. Prefer the visible front door. */
export function loadingPort(s,b) {
  const d=E.BUILDINGS[b.type],seen=E.villageReachability(s),candidates=[];
  for(let x=b.x+d.w-1;x>=b.x;x--)candidates.push([x,b.y+d.h]);
  for(let y=b.y+d.h-1;y>=b.y;y--)candidates.push([b.x+d.w,y],[b.x-1,y]);
  for(let x=b.x;x<b.x+d.w;x++)candidates.push([x,b.y-1]);
  const p=candidates.find(([x,y])=>E.walkable(s,x,y)&&seen[y*E.W+x]);
  return p?{x:p[0]+.5,y:p[1]+.5}:null;
}
class Heap {
  a=[];
  push(v){const a=this.a;a.push(v);let j=a.length-1;while(j){const p=(j-1)>>1;if(a[p][0]<v[0]||(a[p][0]===v[0]&&a[p][1]<=v[1]))break;a[j]=a[p];j=p;}a[j]=v;}
  pop(){const a=this.a,first=a[0],v=a.pop();if(a.length){let j=0;while(j*2+1<a.length){let c=j*2+1;if(c+1<a.length&&(a[c+1][0]<a[c][0]||(a[c+1][0]===a[c][0]&&a[c+1][1]<a[c][1])))c++;if(a[c][0]>v[0]||(a[c][0]===v[0]&&a[c][1]>=v[1]))break;a[j]=a[c];j=c;}a[j]=v;}return first;}
}
/** Direction-aware A*: short routes, few bends, and modest preference for shared lanes.
 * This optimizes this route's weighted cost, not a global multi-commodity network. */
export function gridLane(s,from,to,shared=null) {
  if(!from||!to||![from.x,from.y,to.x,to.y].every(Number.isFinite))return null;
  const sx=Math.floor(from.x),sy=Math.floor(from.y),tx=Math.floor(to.x),ty=Math.floor(to.y);
  if(!E.walkable(s,sx,sy)||!E.walkable(s,tx,ty))return null;
  const start=sy*E.W+sx,goal=ty*E.W+tx;
  if(start===goal)return [point(start)];
  const scores=new Float64Array(E.W*E.H*5).fill(Infinity),prev=new Int32Array(scores.length).fill(-1),heap=new Heap();
  const first=start*5+4;scores[first]=0;heap.push([0,first,0]);let end=-1;
  const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
  while(heap.a.length){const [,key,g]=heap.pop();if(g!==scores[key])continue;const i=Math.floor(key/5),old=key%5,x=i%E.W,y=Math.floor(i/E.W);if(i===goal){end=key;break;}
    for(let d=0;d<4;d++){const [dx,dy]=dirs[d],a=x+dx,b=y+dy;if(!E.walkable(s,a,b))continue;const j=b*E.W+a,k=j*5+d;
      const cost=g+(s.tiles[j].path?6:shared?.has(j)?8:10)+(old!==4&&old!==d?9:0);
      if(cost>=scores[k])continue;scores[k]=cost;prev[k]=key;heap.push([cost+6*(Math.abs(tx-a)+Math.abs(ty-b)),k,cost]);
    }
  }
  if(end<0)return null;const path=[];for(let k=end;k!==-1;k=prev[k])path.push(point(Math.floor(k/5)));return path.reverse();
}
function usedCells(s){const set=new Set();for(const q of s.industry.routes)if(q.laneVersion===1)for(const p of q.path||[])set.add(cell(p));return set;}
export function cargoLane(s,from,to){return gridLane(s,loadingPort(s,from),loadingPort(s,to),usedCells(s));}
/** Rebuild only on layout/route changes. Opposing deliveries use exactly the same lane. */
export function refreshLanes(s) {
  const i=s.industry;if(!i)return;
  const key=[s.topology||0,s.pavingRevision||0,...i.routes.map(r=>`${r.id}:${r.from}:${r.to}`)].join('|');
  if(networks.get(s)?.key===key)return;
  const shared=new Set(),pairs=new Map();
  const sorted=[...i.routes].sort((a,b)=>Math.min(a.from,a.to)-Math.min(b.from,b.to)||Math.max(a.from,a.to)-Math.max(b.from,b.to)||a.id-b.id);
  for(const r of sorted){const a=Math.min(r.from,r.to),b=Math.max(r.from,r.to),pair=a+':'+b;
    if(!pairs.has(pair)){const from=s.buildings.find(v=>v.id===a),to=s.buildings.find(v=>v.id===b);pairs.set(pair,from&&to?gridLane(s,loadingPort(s,from),loadingPort(s,to),shared):null);}
    const plan=pairs.get(pair);r.path=plan?(r.from===a?plan:[...plan].reverse()):[];r.revision=s.topology||0;r.laneVersion=1;
    if(!plan){r.status='Lane blocked';continue;}
    for(const p of plan)shared.add(cell(p));
    for(const p of i.shipments.filter(p=>p.route===r.id)){const fraction=Math.min(1,p.travel/(p.length||1));p.length=routeLength(plan);p.travel=fraction*p.length;}
  }
  const edges=new Map();for(const path of pairs.values())if(path)for(let j=1;j<path.length;j++){const a=cell(path[j-1]),b=cell(path[j]);edges.set(Math.min(a,b)+':'+Math.max(a,b),[path[j-1],path[j]]);}
  networks.set(s,{key,cells:shared,edges:[...edges.values()],ports:s.buildings.filter(b=>i.routes.some(r=>r.from===b.id||r.to===b.id)).map(b=>({id:b.id,point:loadingPort(s,b)})).filter(p=>p.point)});
}
export function laneNetwork(s){refreshLanes(s);return networks.get(s)||{cells:new Set(),edges:[],ports:[]};}
export function laneMetrics(s,r){const speed=2.2+s.industry.logistics*.6;let seconds=0;for(let j=1;j<r.path.length;j++)seconds+=1/(speed*(s.tiles[cell(r.path[j-1])]?.path?1.65:1));return {tiles:Math.round(routeLength(r.path)),bends:routeBends(r.path),seconds:Math.max(.1,seconds),capacity:Math.floor(Math.min(60/2.5,(1+s.industry.logistics)*60/Math.max(.1,seconds))*(3+s.industry.logistics*3))};}
