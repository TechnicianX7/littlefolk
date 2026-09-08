/* Village Works map language: permanent lanes, loading pads, and honest plot previews. */
import {W,H,TILE,BUILDINGS,placementGeometry} from './world.js';
import {RECIPES,ITEMS,isHub,compatible} from './industry.js';
import {laneNetwork,loadingPort,cargoLane,routeLength,laneMetrics} from './lanes.js';
const previews=new WeakMap();
export function plotPlan(s,type,x,y,moving=null){
  const key=[type,x,y,moving,s.topology,s.pavingRevision,s.buildings.length].join(':');
  if(previews.get(s)?.key===key)return previews.get(s).value;
  const before=moving===null?s:{...s,buildings:s.buildings.filter(b=>b.id!==moving),topology:(s.topology||0)+1};
  const geometry=placementGeometry(before,type,x,y),b={id:moving??s.nextId,type,x,y,level:1};let route=null,hub=null,port=null,wind=0;
  if(geometry.ok&&type!=='path'){
    const probe={...before,buildings:[...before.buildings,b],topology:(before.topology||0)+1};port=loadingPort(probe,b);
    if(RECIPES[type]){const candidates=before.buildings.filter(isHub).map(h=>({hub:h,path:cargoLane(probe,h,b)})).filter(v=>v.path).sort((a,b)=>laneMetrics(s,a).seconds-laneMetrics(s,b).seconds);hub=candidates[0]?.hub;route=candidates[0]?.path||null;
      for(const m of probe.buildings.filter(v=>v.type==='windmill'))if(Math.hypot(m.x-x,m.y-y)<=9){const load=probe.buildings.reduce((n,v)=>n+(RECIPES[v.type]?.power&&!s.industry.machines[v.id]?.paused&&Math.hypot(v.x-m.x,v.y-m.y)<=9?RECIPES[v.type].power:0),0);wind+=8/Math.max(1,load);}
    }
  }
  const value={geometry,route,hub,port,wind:Math.min(1,wind)};previews.set(s,{key,value});return value;
}
function trace(c,edges){c.beginPath();for(const [a,b] of edges){c.moveTo(a.x*TILE,a.y*TILE);c.lineTo(b.x*TILE,b.y*TILE);}}
export function drawLanes(c,s,selection,all=false){
  const net=laneNetwork(s);if(!net.cells.size)return;c.save();c.lineCap='square';c.lineJoin='miter';
  // Borders are drawn in one pass, then all surfaces, so shared junctions stay seamless.
  trace(c,net.edges);c.lineWidth=11;c.strokeStyle='#54654755';c.stroke();
  trace(c,net.edges);c.lineWidth=9;c.strokeStyle='#b29e78';c.stroke();
  trace(c,net.edges);c.lineWidth=7;c.strokeStyle='#d5c6a0';c.stroke();
  for(const i of net.cells){const x=(i%W)*TILE+8,y=Math.floor(i/W)*TILE+8;if(s.tiles[i].path){c.fillStyle='#b4bab0';c.fillRect(x-4,y-4,8,8);c.fillStyle='#dce0ca';c.fillRect(x-3,y-3,3,2);c.fillRect(x+1,y,2,3);}else if(i%3===0){c.fillStyle='#a9997766';c.fillRect(x-3,y-2,2,1);c.fillRect(x+1,y+2,2,1);}}
  for(const {point:p} of net.ports){const x=p.x*TILE,y=p.y*TILE;c.fillStyle='#927959';c.fillRect(x-5,y-4,10,8);c.fillStyle='#e8d2a0';c.fillRect(x-4,y-3,8,2);c.fillRect(x-4,y,8,2);}
  if(all||selection?.kind==='building')for(const r of s.industry.routes){if(!all&&r.from!==selection.id&&r.to!==selection.id)continue;if(!r.path?.length)continue;
    const selected=selection?.kind==='building',from=s.buildings.find(b=>b.id===r.from),to=s.buildings.find(b=>b.id===r.to),item=r.filter==='auto'?compatible(s,from,to)[0]:r.filter;
    c.strokeStyle=r.paused?'#8f9592':selected?(r.from===selection.id?'#c58637':'#327e91'):(ITEMS[item]?.color||'#52796a');c.fillStyle=c.strokeStyle;c.lineWidth=1.3;
    for(let j=1;j<r.path.length;j++){const a=r.path[j-1],b=r.path[j],dx=b.x-a.x,dy=b.y-a.y,ox=-dy*1.6,oy=dx*1.6;c.beginPath();c.moveTo(a.x*TILE+ox,a.y*TILE+oy);c.lineTo(b.x*TILE+ox,b.y*TILE+oy);c.stroke();
      if(j%4===1||j===r.path.length-1){const x=(a.x+b.x)*TILE/2+ox,y=(a.y+b.y)*TILE/2+oy;c.beginPath();c.moveTo(x+dx*2.5,y+dy*2.5);c.lineTo(x-dx*2-dy*2,y-dy*2+dx*2);c.lineTo(x-dx*2+dy*2,y-dy*2-dx*2);c.closePath();c.fill();}
    }
  }c.restore();
}
export function drawPlot(c,s,type,hover,moving=null){
  if(!hover||type==='path'||!BUILDINGS[type])return;
  const d=BUILDINGS[type],x=hover.x,y=hover.y,p=plotPlan(s,type,x,y,moving),g=p.geometry;
  c.save();c.lineWidth=.35;c.strokeStyle='#f2f0d528';
  for(let yy=Math.max(0,y-3);yy<Math.min(H,y+d.h+3);yy++)for(let xx=Math.max(0,x-3);xx<Math.min(W,x+d.w+3);xx++)c.strokeRect(xx*TILE,yy*TILE,TILE,TILE);
  if(p.route&&s.bloom.autoConnect){c.lineWidth=3;c.strokeStyle='#f3e7b199';c.setLineDash([4,3]);c.beginPath();p.route.forEach((v,j)=>j?c.lineTo(v.x*TILE,v.y*TILE):c.moveTo(v.x*TILE,v.y*TILE));c.stroke();c.setLineDash([]);}
  for(let yy=y;yy<y+d.h;yy++)for(let xx=x;xx<x+d.w;xx++){const t=s.tiles[yy*W+xx],blocked=g.blockers?.some(b=>b.x===xx&&b.y===yy);const color=g.ok?'#cde5b0':blocked&&t?.node?'#efc879':'#d18e83';c.fillStyle=color+'44';c.fillRect(xx*TILE,yy*TILE,TILE,TILE);c.strokeStyle=color;c.lineWidth=.8;c.strokeRect(xx*TILE+1,yy*TILE+1,TILE-2,TILE-2);}
  if(p.port){c.strokeStyle='#9adde2';c.lineWidth=1.3;c.strokeRect(p.port.x*TILE-5,p.port.y*TILE-5,10,10);}
  for(const b of g.blockers||[])if(b.x<x||b.x>=x+d.w||b.y<y||b.y>=y+d.h){c.lineWidth=1.5;c.strokeStyle='#de8f7a';c.strokeRect(b.x*TILE-1,b.y*TILE-1,b.w*TILE+2,b.h*TILE+2);}
  if(type==='lumber'||type==='quarry'){c.strokeStyle='#e4d88f88';c.setLineDash([3,3]);c.lineWidth=.7;c.beginPath();c.arc((x+1)*TILE,(y+1)*TILE,7*TILE,0,Math.PI*2);c.stroke();}
  c.restore();
}
export function connectionRows(s,id){
  const name=n=>{const b=s.buildings.find(v=>v.id===n);return b?BUILDINGS[b.type].short+' #'+b.id:'Missing building';};
  return s.industry.routes.filter(r=>r.from===id||r.to===id).map(r=>{const from=s.buildings.find(b=>b.id===r.from),to=s.buildings.find(b=>b.id===r.to),out=r.from===id,metrics=laneMetrics(s,r),items=(r.filter==='auto'?compatible(s,from,to):[r.filter]).map(k=>ITEMS[k].name).join(' + ');return {id:r.id,out,other:out?r.to:r.from,label:name(out?r.to:r.from),items,paused:r.paused,blocked:!r.path.length,...metrics};});
}
