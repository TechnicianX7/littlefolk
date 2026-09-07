import { W,H,TILE,BUILDINGS,COLORS,createWorld,place,placement,cost,step,upgrade,ringBell,snapshot,restore,buildingAt,describeFolk } from './world.js';

const $=id=>document.getElementById(id), canvas=$('world'), ctx=canvas.getContext('2d',{alpha:false});
const SAVE='littlefolk.v1.save', BACKUP='littlefolk.v1.backup', PREFS='littlefolk.v1.preferences';
let s, fresh=true, lastGoodSave=null, saveBlocked=false, loadNotice='', prefs={sound:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
try { const p=JSON.parse(localStorage.getItem(PREFS)||'null');if(p)prefs={sound:!!p.sound,reduced:!!p.reduced}; } catch {}
try {
  const primary=localStorage.getItem(SAVE),backup=localStorage.getItem(BACKUP);
  if(primary||backup){let ok=false;for(const [raw,isBackup] of [[primary,false],[backup,true]]){if(!raw)continue;try{s=restore(JSON.parse(raw));lastGoodSave=raw;fresh=false;ok=true;if(isBackup)loadNotice='Your village was recovered from its last backup.';break;}catch{}}
    if(!ok){saveBlocked=true;loadNotice='The saved village could not be read. Automatic saving is paused so the old save is not overwritten. See Settings.';}
  }
} catch {loadNotice='This browser is blocking storage. Use Export save to keep your village.';saveBlocked=true;}
s ||= createWorld((Date.now() ^ Math.floor(Math.random()*0xffffffff))>>>0);
let width=0,height=0,origin={x:0,y:0},cam={x:22.5*TILE,y:18*TILE,zoom:3},selectedBuild=null,selection=null,hover=null,paused=false,speed=1;
let toastEnd=0,particles=[],lastUI=0,lastFrame=performance.now(),lastDraw=0,accumulator=0,terrainDirty=true,terrain=document.createElement('canvas'),audio=null,waitingWorker=null,offlineReady=false;
let frameCount=0,lastAudio=0,focusedBefore=null;
terrain.width=W*TILE;terrain.height=H*TILE;const tc=terrain.getContext('2d');
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function oval(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function line(c,x,y,x2,y2,color,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
const mod=(x,n)=>((x%n)+n)%n;
const spriteCache=new Map();
function treeSprite(variant,dead=false,baby=false){
  const key=`tree${variant}-${dead}-${baby}`;if(spriteCache.has(key))return spriteCache.get(key);
  const a=document.createElement('canvas');a.width=48;a.height=48;const c=a.getContext('2d');
  oval(c,25,41,10,3,'#45614538');
  if(dead){rect(c,22,35,6,7,'#8d6d46');rect(c,22,35,6,2,'#c49a61');rect(c,24,36,2,1,'#765936');if(baby){rect(c,26,32,1,5,'#6a7846');rect(c,23,30,4,2,'#769b4c');rect(c,26,28,4,3,'#8bab54');}spriteCache.set(key,a);return a;}
  rect(c,22,22,5,19,'#715c3d');rect(c,25,25,2,14,'#997744');rect(c,20,39,9,3,'#755d3e');
  if(variant===3){
    poly(c,[[23,4],[20,11],[16,16],[19,16],[12,26],[17,26],[9,35],[36,35],[30,27],[34,27],[27,17],[30,17]],'#456b46');
    poly(c,[[23,6],[17,17],[20,17],[15,26],[19,26],[14,32],[30,32],[25,23],[28,23],[23,15],[25,15]],'#68884b');rect(c,21,13,2,4,'#8aa359');rect(c,16,27,6,2,'#86a057');rect(c,22,21,3,2,'#79964e');
  }else{
    const dark=['#486c40','#4d7040','#526f42'][variant],mid=['#648b48','#79994d','#698d53'][variant],light=['#83a451','#96ad5a','#89a762'][variant];
    poly(c,[[18,7],[29,7],[29,10],[35,10],[35,14],[39,14],[39,26],[35,26],[35,31],[28,31],[28,34],[17,34],[17,31],[11,31],[11,27],[7,27],[7,17],[11,17],[11,11],[18,11]],dark);
    poly(c,[[17,8],[29,8],[29,11],[34,11],[34,15],[36,15],[36,24],[30,24],[30,29],[17,29],[17,26],[10,26],[10,17],[13,17],[13,12],[17,12]],mid);
    poly(c,[[17,10],[26,10],[26,12],[30,12],[30,16],[26,16],[26,18],[17,18],[17,21],[12,21],[12,16],[15,16],[15,12],[17,12]],light);
    rect(c,20,8,7,2,'#a1b66b');rect(c,29,21,5,2,light);rect(c,14,25,5,2,light);rect(c,24,27,4,2,dark);
  }
  spriteCache.set(key,a);return a;
}
function rock(c,x,y,small=false){
  if(small){poly(c,[[x-5,y],[x-4,y-4],[x,y-6],[x+5,y-3],[x+6,y+1]],'#7d9187');rect(c,x-3,y-4,4,1,'#c4cdb7');return;}
  oval(c,x,y+1,10,3,'#45614530');poly(c,[[x-11,y],[x-9,y-7],[x-3,y-10],[x+3,y-8],[x+7,y-2],[x+7,y+2],[x-8,y+2]],'#788c81');poly(c,[[x-9,y-6],[x-3,y-10],[x+3,y-8],[x+4,y-4],[x-3,y-2],[x-9,y-3]],'#aabb9f');rect(c,x-4,y-9,5,2,'#cbd1b5');poly(c,[[x+2,y+2],[x+3,y-3],[x+8,y-5],[x+12,y-1],[x+12,y+2]],'#96a88e');rect(c,x+5,y-4,3,1,'#d0d5b9');rect(c,x-8,y+1,4,2,'#7f995b');
}
function log(c,x,y){rect(c,x,y,10,4,'#92714a');rect(c,x,y,10,1,'#b88c54');rect(c,x+8,y,3,4,'#d8b57b');rect(c,x+9,y+1,1,2,'#99764d');}
function flower(c,x,y,color='#e3b59b'){rect(c,x,y,1,4,'#6e944b');rect(c,x-2,y-1,5,2,color);rect(c,x-1,y-2,3,4,color);rect(c,x,y-1,1,1,'#f5db8a');}
function buildingSprite(type,level=1){
  const key=`${type}-${level}`;if(spriteCache.has(key))return spriteCache.get(key);
  const a=document.createElement('canvas');a.width=48;a.height=52;const c=a.getContext('2d');c.translate(8,14);
  oval(c,17,31,18,5,'#3d513b33');
  if(type==='garden'){
    rect(c,0,7,32,25,'#869452');rect(c,3,9,26,20,'#827c48');
    for(let row=0;row<3;row++)for(let col=0;col<4;col++){const x=6+col*6,y=13+row*6;rect(c,x-1,y,3,3,'#597c41');flower(c,x,y-2,['#e8bb8b','#d6cbe3','#f2db91','#f2b5ac'][(row+col)%4]);}
    for(const y of [7,29]){rect(c,-1,y,34,2,'#b3a078');for(const x of [0,10,21,31]){rect(c,x,y-3,2,8,'#d4bf89');rect(c,x,y-3,2,1,'#e8d5a0');}}
  }else if(type==='depot'){
    rect(c,1,13,30,17,'#9b8960');rect(c,1,13,30,3,'#716748');rect(c,2,14,2,18,'#bfa177');rect(c,29,14,2,18,'#bfa177');
    poly(c,[[-3,13],[4,4],[30,4],[35,13],[35,16],[-3,16]],'#7a8b55');rect(c,1,12,32,2,'#b1bb7c');rect(c,7,6,19,2,'#97a76b');
    log(c,5,23);log(c,5,19);log(c,7,27);rect(c,20,20,9,11,'#b09666');rect(c,20,20,9,2,'#d3b37e');line(c,20,23,28,29,'#7a6c4d');line(c,28,23,20,29,'#7a6c4d');
  }else{
    const roof=type==='quarry'?['#687e70','#889889','#a8b39b']:type==='workshop'?['#526e76','#71939a','#a1b5a8']:type==='lumber'?['#5b7650','#809359','#a4b572']:['#925e45','#bb7e53','#d39d65'];
    rect(c,1,10,31,21,'#876c4c');rect(c,2,11,28,18,'#c4a374');rect(c,2,14,28,2,'#b28e63');rect(c,2,21,28,1,'#a5875c');rect(c,2,27,28,2,'#b28e63');rect(c,0,11,3,21,'#7b6948');rect(c,29,11,3,21,'#7b6948');rect(c,1,31,31,2,'#8c7b51');
    if(type==='workshop'||type==='hut'){rect(c,24,-4,5,11,'#8b8d77');rect(c,24,-4,5,2,'#b1ad91');rect(c,25,0,4,1,'#646e5c');}
    poly(c,[[-4,11],[15,-5],[36,11],[36,14],[-4,14]],roof[0]);poly(c,[[-2,10],[15,-3],[33,10],[33,11],[-2,11]],roof[1]);
    for(let y=2;y<=8;y+=3){const l=13-y*1.2;rect(c,l,y,7+y*2.3,1,roof[2]);}
    for(let x=2;x<32;x+=6)rect(c,x,8,1,3,roof[0]);rect(c,-3,13,39,2,'#6d5941');
    rect(c,13,21,7,11,'#69553b');rect(c,14,22,5,9,'#3d4935');rect(c,17,25,1,1,'#d7b876');rect(c,12,32,10,2,'#c2ad7b');
    for(const x of [5,23]){rect(c,x,17,6,7,'#816a4b');rect(c,x+1,18,4,4,'#c3d8b1');rect(c,x+2,18,1,4,'#8e9a74');rect(c,x,24,6,2,'#ae8653');}
    if(type==='lumber'){log(c,22,29);log(c,22,25);rect(c,4,27,1,7,'#d4b079');rect(c,1,26,5,3,'#a9b6a1');}
    if(type==='quarry'){rock(c,26,32,true);rect(c,4,25,1,8,'#d1b07a');rect(c,0,25,9,2,'#a9b5a2');}
    if(type==='workshop'){rect(c,11,16,11,3,'#c6b07c');rect(c,15,14,3,7,'#d5bd88');rect(c,13,16,7,3,'#d5bd88');rect(c,15,16,3,3,'#697d70');}
    if(level>1&&type==='hut'){rect(c,12,2,9,8,'#b79e6f');poly(c,[[10,3],[16,-3],[23,3]],'#7c694b');rect(c,14,3,5,5,'#e4d29b');rect(c,16,3,1,5,'#9f9469');flower(c,7,27,'#e3b5c2');flower(c,25,27,'#f3d583');}
    rect(c,2,33,5,1,'#77934e');rect(c,27,33,5,1,'#77934e');
  }
  spriteCache.set(key,a);return a;
}
function folk(c,x,y,f,time=0,scale=1){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);
  const moving=f.path?.length>0,working=f.mode==='work',bob=moving&&!prefs.reduced?Math.round(Math.sin(time*13+f.id)*1):0;
  oval(c,0,1,5,2,'#32493435');c.translate(0,bob);const col=f.color||COLORS[0];
  rect(c,-4,-1+(moving?Math.round(Math.sin(time*13)):0),3,2,'#665c47');rect(c,2,-1+(moving?Math.round(Math.cos(time*13)):0),3,2,'#665c47');
  poly(c,[[-3,-11],[3,-11],[3,-10],[5,-10],[5,-8],[6,-8],[6,-3],[4,-3],[4,-1],[-4,-1],[-4,-3],[-6,-3],[-6,-8],[-5,-8],[-5,-10],[-3,-10]],'#506443');
  poly(c,[[-3,-11],[3,-11],[3,-10],[5,-10],[5,-8],[6,-8],[6,-4],[4,-4],[4,-2],[-4,-2],[-4,-4],[-5,-4],[-5,-9],[-3,-9]],col);
  rect(c,-3,-10,5,1,'#fff2c366');rect(c,-3,-7,2,3,'#fff8dd');rect(c,2,-7,2,3,'#fff8dd');
  if(mod(time+f.id*1.71,7)<.14){rect(c,-3,-5,2,1,'#3d503a');rect(c,2,-5,2,1,'#3d503a');}else{rect(c,-2,-6,1,2,'#344837');rect(c,3,-6,1,2,'#344837');}
  rect(c,0,-3,1,1,'#936d55');
  if(f.hat===1){rect(c,-1,-14,1,4,'#65874d');rect(c,0,-14,4,2,'#7b9f54');rect(c,-3,-12,3,2,'#93ac61');}
  if(f.hat===2){rect(c,-6,-11,12,2,'#b6945c');rect(c,-3,-14,6,3,'#e3c689');rect(c,-3,-12,6,1,'#a8875a');}
  if(f.hat===3){flower(c,-3,-12,'#ece1b3');}
  if(f.carry){if(f.carry.type==='tree'){log(c,4,-5);if(f.carry.amount>2)log(c,5,-9);}else{rect(c,5,-5,6,4,'#8da090');rect(c,6,-6,4,2,'#cbd3b5');}}
  if(working){c.save();c.translate(6,-5);c.rotate(prefs.reduced?-.5:Math.sin(time*13)*.7-.5);rect(c,0,-7,1,9,'#b89960');rect(c,-2,-8,5,3,'#c4cbb1');rect(c,-2,-8,1,3,'#f0ead1');c.restore();}
  c.restore();
}
function lantern(c,x,y,time=0){
  oval(c,x,y+3,12,4,'#4c60402a');rect(c,x-8,y-1,16,5,'#b4a473');rect(c,x-6,y,12,5,'#a69366');rect(c,x,y-17,2,20,'#6c6745');rect(c,x-3,y-17,8,2,'#81734c');rect(c,x+3,y-15,1,3,'#756541');rect(c,x+1,y-12,5,7,'#957a49');rect(c,x+2,y-11,3,5,'#f1d18b');rect(c,x+3,y-10,1,3,'#fff1bb');rect(c,x,y-13,7,1,'#77683e');rect(c,x+1,y-5,5,1,'#77683e');flower(c,x-8,y,'#e3c3a1');
}
function paintTerrain(){
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const t=s.tiles[y*W+x],px=x*TILE,py=y*TILE,n=t.detail;
    if(t.ground==='water'){
      rect(tc,px,py,16,16,['#87b8a8','#83b6a7','#89bba9'][Math.floor(n*3)]);
      if(n>.5)rect(tc,px+3,py+8,5,1,'#a4cabb');continue;
    }
    rect(tc,px,py,16,16,['#adc779','#afc97d','#acc579','#b1ca7e'][Math.floor(n*4)]);
    const nb=(a,b)=>a<0||b<0||a>=W||b>=H||s.tiles[b*W+a].ground==='water';
    if(nb(x,y-1)){rect(tc,px,py,16,3,'#d2cc95');rect(tc,px,py+3,16,1,'#c0c386');}
    if(nb(x,y+1)){rect(tc,px,py+13,16,3,'#d2cc95');rect(tc,px,py+12,16,1,'#c0c386');}
    if(nb(x-1,y))rect(tc,px,py,3,16,'#d2cc95');if(nb(x+1,y))rect(tc,px+13,py,3,16,'#d2cc95');
    const d=Math.hypot(x-s.hearth.x,y-s.hearth.y);
    if(d<2.6){rect(tc,px,py,16,16,['#bbb47d','#c2b983','#bdb780'][Math.floor(n*3)]);if(n>.5)rect(tc,px+4,py+9,3,1,'#aaa373');}
    else if(n>.2){const dx=3+Math.floor(n*7),dy=4+Math.floor(mod(n*9,1)*7);rect(tc,px+dx,py+dy,1,3,'#8da85f');rect(tc,px+dx-2,py+dy+1,1,2,'#98b06a');rect(tc,px+dx+2,py+dy+1,1,2,'#9ab36a');if(n>.8&&!t.node){rect(tc,px+dx,py+dy,1,1,n>.93?'#e6ce9b':'#ced48a');}}
    if(t.path){rect(tc,px+3,py+1,10,14,'#b9b489');rect(tc,px+1,py+4,14,8,'#b9b489');rect(tc,px+3,py+3,6,4,'#d0c9a3');rect(tc,px+8,py+9,5,3,'#dbd0a7');rect(tc,px+3,py+11,3,2,'#999e77');}
  }
  terrainDirty=false;
}
function paintIcons(){
  for(const el of document.querySelectorAll('[data-icon]')){const c=el.getContext('2d');c.clearRect(0,0,el.width,el.height);const name=el.dataset.icon;
    if(name==='wood'){log(c,3,8);log(c,7,13);}else if(name==='stone'){rock(c,12,18,true);}else if(name==='folk'){folk(c,12,19,{id:1,color:COLORS[0],hat:1},1);}else if(name==='path'){rect(c,8,5,7,5,'#b5b78e');rect(c,15,14,8,5,'#c9c4a0');rect(c,4,23,10,5,'#929e7b');}else{c.drawImage(buildingSprite(name),0,0,48,44);}}
  const b=$('brandIcon').getContext('2d');lantern(b,10,21);
  const c=$('welcomeArt').getContext('2d');rect(c,6,39,101,2,'#d6dcc0');rect(c,12,41,87,2,'#e4e5d1');c.drawImage(buildingSprite('hut'),9,-1);folk(c,63,39,{id:1,color:COLORS[0],hat:1},2,1.5);folk(c,83,39,{id:2,color:COLORS[2],hat:2},2,1.25);flower(c,100,37);flower(c,6,38,'#ccb8d1');
}
function resize(){
  width=$('app').clientWidth;height=$('app').clientHeight;canvas.width=Math.round(width);canvas.height=Math.round(height);ctx.imageSmoothingEnabled=false;
  const head=document.querySelector('.topbar').getBoundingClientRect().height,dock=document.querySelector('.dock').getBoundingClientRect().height;
  origin={x:width/2,y:(head+height-dock-34)/2};if(!frameCount)cam.zoom=width<600?2.3:width<1000?2.8:3.25;
}
function screenToWorld(x,y){return {x:(x-origin.x)/cam.zoom+cam.x,y:(y-origin.y)/cam.zoom+cam.y};}
function worldToScreen(x,y){return {x:(x-cam.x)*cam.zoom+origin.x,y:(y-cam.y)*cam.zoom+origin.y};}
function clampCamera(){cam.x=Math.max(32,Math.min(W*TILE-32,cam.x));cam.y=Math.max(32,Math.min(H*TILE-32,cam.y));}
function zoomTo(value,x=origin.x,y=origin.y){const anchor=screenToWorld(x,y);cam.zoom=Math.max(1.1,Math.min(6,value));cam.x=anchor.x-(x-origin.x)/cam.zoom;cam.y=anchor.y-(y-origin.y)/cam.zoom;clampCamera();}
function draw(){
  if(terrainDirty)paintTerrain();const time=s.t,phase=mod(time,240),night=phase<150?0:phase<205?(phase-150)/55:(240-phase)/35;
  ctx.setTransform(1,0,0,1,0,0);rect(ctx,0,0,width,height,'#83b7a7');
  ctx.setTransform(cam.zoom,0,0,cam.zoom,Math.round(origin.x-cam.x*cam.zoom),Math.round(origin.y-cam.y*cam.zoom));ctx.imageSmoothingEnabled=false;ctx.drawImage(terrain,0,0);
  const view={left:cam.x-origin.x/cam.zoom-45,right:cam.x+(width-origin.x)/cam.zoom+45,top:cam.y-origin.y/cam.zoom-50,bottom:cam.y+(height-origin.y)/cam.zoom+50};
  if(!prefs.reduced){
    for(let i=0;i<s.tiles.length;i+=11){const t=s.tiles[i];if(t.ground!=='water')continue;const x=(i%W)*16,y=Math.floor(i/W)*16;rect(ctx,x+Math.floor(mod(time*.5+i,5)),y+7,3,1,'#cae0c058');}
  }
  if(selectedBuild){
    ctx.strokeStyle='#526c4822';ctx.lineWidth=.35;for(let x=0;x<=W;x++){ctx.beginPath();ctx.moveTo(x*TILE,0);ctx.lineTo(x*TILE,H*TILE);ctx.stroke();}for(let y=0;y<=H;y++){ctx.beginPath();ctx.moveTo(0,y*TILE);ctx.lineTo(W*TILE,y*TILE);ctx.stroke();}
  }
  const objects=[];
  s.tiles.forEach((t,i)=>{if(!t.node)return;const x=(i%W+.5)*TILE,y=(Math.floor(i/W)+.9)*TILE;if(x<view.left||x>view.right||y<view.top||y>view.bottom)return;objects.push({kind:'node',x,y,t,i,z:y});});
  for(const b of s.buildings)objects.push({kind:'building',x:b.x*TILE,y:b.y*TILE,b,z:(b.y+2)*TILE-1});
  objects.push({kind:'hearth',x:(s.hearth.x+.5)*TILE,y:(s.hearth.y+.8)*TILE,z:(s.hearth.y+.8)*TILE});
  for(const f of s.folk)objects.push({kind:'folk',x:f.x*TILE,y:f.y*TILE,f,z:f.y*TILE});
  objects.sort((a,b)=>a.z-b.z);
  for(const o of objects){
    if(o.kind==='node'){
      if(o.t.node.type==='tree'){const working=s.folk.some(f=>f.mode==='work'&&f.target===o.i),shake=working&&!prefs.reduced?Math.round(Math.sin(time*22))*.5:0;ctx.drawImage(treeSprite(Math.floor(o.t.detail*4),o.t.node.amount<=0,o.t.node.rest<22),Math.round(o.x-24+shake),Math.round(o.y-40));}
      else if(o.t.node.amount>0)rock(ctx,o.x,o.y);else{rect(ctx,o.x-4,o.y,3,2,'#8e9f7d');rect(ctx,o.x+3,o.y-2,2,2,'#afbc91');}
    }else if(o.kind==='building'){ctx.drawImage(buildingSprite(o.b.type,o.b.level),o.x-8,o.y-14);if(o.b.type==='garden'&&!prefs.reduced){const t=time*.9+o.b.id;rect(ctx,o.x+16+Math.sin(t)*9,o.y+14+Math.cos(t*1.7)*5,2,1,'#f9dda6');rect(ctx,o.x+18+Math.sin(t)*9,o.y+14+Math.cos(t*1.7)*5,2,1,'#f4c9bb');}}
    else if(o.kind==='hearth')lantern(ctx,o.x,o.y,time);
    else{
      if(selection?.kind==='folk'&&selection.id===o.f.id){ctx.strokeStyle='#fff2bb';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(o.x,o.y+1,7,3,0,0,Math.PI*2);ctx.stroke();}
      folk(ctx,o.x,o.y,o.f,time);
      if(o.f.mode==='work'&&Math.sin(time*12)>.7&&!prefs.reduced){rect(ctx,o.x+11,o.y-10,1,1,'#f6e7b6');rect(ctx,o.x+8,o.y-14,1,1,'#eee3bc');}
    }
  }
  if(!prefs.reduced){
    for(let i=0;i<6;i++){const x=mod(time*1.8+i*137,W*TILE+150)-75,y=30+i*89+Math.sin(time*.025+i)*10;ctx.fillStyle='#52683c09';ctx.fillRect(x,y,60,10);ctx.fillRect(x+12,y-7,40,24);ctx.fillRect(x+35,y-12,30,29);}
    for(let i=0;i<12;i++){const x=mod(i*61+time*1.8,W*TILE),y=mod(i*47+Math.sin(time*.8+i)*6,H*TILE);rect(ctx,x,y,1,1,'#eef0ba77');}
  }
  if(hover&&selectedBuild){const d=BUILDINGS[selectedBuild],valid=placement(s,selectedBuild,hover.x,hover.y).ok,x=hover.x*TILE,y=hover.y*TILE;rect(ctx,x,y,d.w*TILE,d.h*TILE,valid?'#f8f3bc66':'#c17f7155');ctx.strokeStyle=valid?'#f9efbe':'#ac605a';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,d.w*TILE-1,d.h*TILE-1);if(selectedBuild!=='path'){ctx.globalAlpha=.6;ctx.drawImage(buildingSprite(selectedBuild),x-8,y-14);ctx.globalAlpha=1;}}
  ctx.setTransform(1,0,0,1,0,0);
  if(night>0){rect(ctx,0,0,width,height,`rgba(24,43,63,${night*.45})`);}
  if(night>.05||s.meeting){const p=worldToScreen((s.hearth.x+.7)*TILE,(s.hearth.y+.3)*TILE);const radius=85*cam.zoom/3;const gradient=ctx.createRadialGradient(p.x,p.y,1,p.x,p.y,radius);gradient.addColorStop(0,`rgba(255,220,136,${.22+night*.17})`);gradient.addColorStop(1,'rgba(255,220,136,0)');ctx.fillStyle=gradient;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);
    if(!prefs.reduced)for(let i=0;i<22;i++){const a=i*2.4+time*.13,r=16+(i%7)*8,x=(s.hearth.x+.5)*TILE+Math.cos(a)*r,y=(s.hearth.y+.5)*TILE+Math.sin(a*1.4)*r*.6;const p=worldToScreen(x,y);ctx.globalAlpha=.3+Math.sin(time*2+i)*.25;rect(ctx,p.x,p.y,cam.zoom*.75,cam.zoom*.75,'#fff1ac');ctx.globalAlpha=1;}
    for(const b of s.buildings)if(b.type==='hut'){const p=worldToScreen((b.x+.6)*TILE,(b.y+1.2)*TILE);rect(ctx,p.x,p.y,3*cam.zoom,3*cam.zoom,`rgba(255,221,129,${night*.55})`);}
  }
  for(const p of particles){const age=(performance.now()-p.start)/1000;if(age>p.life)continue;const pos=worldToScreen(p.x,p.y-age*9);ctx.globalAlpha=Math.max(0,1-age/p.life);ctx.font='600 13px -apple-system, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#35523977';ctx.strokeText(p.text,pos.x,pos.y);ctx.fillStyle=p.color||'#fff4cc';ctx.fillText(p.text,pos.x,pos.y);ctx.globalAlpha=1;}
  if(s.meeting){const speaker=s.folk.find(f=>f.mode==='sitting'&&f.bubble&&f.bubbleUntil>s.t&&f.bubble!=='Lantern time!');if(speaker)drawBubble(speaker);}
  else if(selection?.kind==='folk'){const f=s.folk.find(f=>f.id===selection.id);if(f&&f.bubbleUntil>s.t&&f.bubble)drawBubble(f);}
}
function drawBubble(f){const p=worldToScreen(f.x*TILE,f.y*TILE-15),max=Math.min(240,width-40);ctx.font='11px -apple-system, sans-serif';const words=f.bubble.split(' '),lines=[];let current='';for(const w of words){if(ctx.measureText(current+w).width>max-24&&current){lines.push(current.trim());current='';}current+=w+' ';}if(current)lines.push(current.trim());const h=lines.length*15+18,x=Math.max(10,Math.min(width-max-10,p.x-max/2)),y=Math.max(90,p.y-h-9);ctx.fillStyle='#fcf5dff0';ctx.beginPath();ctx.roundRect(x,y,max,h,10);ctx.fill();poly(ctx,[[p.x-4,y+h],[p.x+4,y+h],[p.x,y+h+6]],'#fcf5dff0');ctx.fillStyle='#5f6d50';ctx.textAlign='left';lines.forEach((t,i)=>ctx.fillText(t,x+12,y+19+i*15));}
function toast(text,memory=false,duration=3800){$('toast').textContent=text;$('toast').classList.toggle('memorytoast',memory);$('toast').hidden=false;toastEnd=performance.now()+duration;}
function sound(kind){if(!prefs.sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});const now=audio.currentTime;if(kind==='harvest'&&now-lastAudio<.3)return;lastAudio=now;const notes=kind==='bell'?[523.25,659.25,783.99]:kind==='arrival'?[392,523.25]:kind==='build'?[330,440]:kind==='delivery'?[660]:[280];notes.forEach((freq,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),start=now+i*.12;osc.type=kind==='harvest'?'triangle':'sine';osc.frequency.setValueAtTime(freq,start);gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+(kind==='bell'?.8:.22));osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+1);});}catch{}}
function processEvents(){for(const e of s.events.splice(0)){
  if(e.type==='delivery'){if(!prefs.reduced)particles.push({x:e.x*TILE,y:e.y*TILE-5,start:performance.now(),life:1.5,text:`+${e.amount} ${e.resource==='tree'?'wood':'stone'}`});sound('delivery');}
  if(e.type==='arrival'){toast(`${e.name} moved in. A little life begins.`);sound('arrival');}
  if(e.type==='build'){terrainDirty=true;sound('build');if(!prefs.reduced)particles.push({x:e.x*TILE,y:e.y*TILE,start:performance.now(),life:1.8,text:BUILDINGS[e.building].short,color:'#fff6d4'});}
  if(e.type==='harvest')sound('harvest');
  if(e.type==='memory'){$('memoryDot').hidden=false;if(!s.meeting)toast(e.text,true,5000);if(!$('journalBack').hidden)renderMemories();}
  if(e.type==='unlock')toast(`${e.name} unlocked. Your little world is growing.`,true,4300);
  if(e.type==='bell'){toast('Lantern time. Even little days deserve a story.',true,4300);sound('bell');}
}particles=particles.filter(p=>performance.now()-p.start<p.life*1000).slice(-30);}
function updateUI(){
  const fmt=n=>n>9999?`${(n/1000).toFixed(1)}k`:String(Math.floor(n));$('wood').textContent=fmt(s.wood);$('stone').textContent=fmt(s.stone);$('population').textContent=s.folk.length;
  const phase=s.t%240;$('dayLabel').textContent=`Day ${Math.floor(s.t/240)+1} · ${phase<60?'Morning':phase<150?'Afternoon':phase<205?'Golden hour':'Moonlight'}`;$('sunDot').style.background=phase>205?'#99a7b9':phase>150?'#cf9266':'#d9ae62';
  $('bellBtn').classList.toggle('active',!!s.meeting);$('pausedLabel').hidden=!paused;$('speedBtn').textContent=`${speed}×`;$('speedBtn').setAttribute('aria-label',`Simulation speed: ${speed} times`);
  const next=Object.entries(BUILDINGS).find(([,d])=>d.unlock>s.delivered);
  let tag,title,text,progress;
  if(!s.folk.length){tag='A new beginning';title='A home for someone small.';text='Choose the free hut, then tap empty grass near the lantern.';progress=0;}
  else if(!s.delivered){tag='Their first little adventure';title='Let them find their feet.';text='Your littlefolk is finding wood and stone. You do not need to assign a thing.';progress=10;}
  else if(s.folk.length===1){tag='Room for a friend';title='Good things are better shared.';text='A second hut costs 18 wood + 8 stone. Tap your littlefolk to see what they are up to.';progress=Math.min(100,(Math.min(s.wood,18)+Math.min(s.stone,8))/26*100);}
  else if(next){tag='A village taking shape';title=`Next: ${next[1].short.toLowerCase()}.`;text=`${s.delivered} of ${next[1].unlock} all-time materials delivered. Spending resources never resets your unlocks.`;progress=s.delivered/next[1].unlock*100;}
  else{tag='A place to belong';title='Look at this little life.';text='Add cozy rooms, improve your tools, or simply stay for lantern time.';progress=100;}
  $('goalTag').textContent=tag;$('goalTitle').textContent=title;$('goalText').textContent=text;$('goalProgress').style.width=`${progress}%`;
  for(const b of document.querySelectorAll('.buildcard')){const type=b.dataset.build,d=BUILDINGS[type],c=cost(s,type),locked=s.delivered<d.unlock;b.classList.toggle('selected',type===selectedBuild);b.classList.toggle('locked',locked);b.setAttribute('aria-pressed',String(type===selectedBuild));b.querySelector('small').textContent=locked?`${d.unlock} delivered`:c.wood===0&&c.stone===0?'First one is free':`${c.wood}w · ${c.stone}s`;b.querySelector('.lockmark').hidden=!locked;b.setAttribute('aria-label',`${d.name}. ${locked?`Unlocks at ${d.unlock} delivered materials`:`Costs ${c.wood} wood and ${c.stone} stone`}. ${d.desc}`);}
  $('dockNote').textContent=s.meeting?'A little time together.':selectedBuild?'Tap empty grass to place.':'You build. They find their own way.';
  if(selection)renderInspector();if(performance.now()>toastEnd)$('toast').hidden=true;
}
function selectBuild(type){selection=null;$('inspector').hidden=true;selectedBuild=selectedBuild===type?null:type;hover=null;$('buildHint').hidden=!selectedBuild;if(selectedBuild){const d=BUILDINGS[type];$('buildTitle').textContent=d.name;$('buildText').textContent=d.desc;}$('world').style.cursor=selectedBuild?'crosshair':'grab';updateUI();}
function inspect(kind,id){selection={kind,id};selectedBuild=null;hover=null;$('buildHint').hidden=true;$('inspector').hidden=false;renderInspector();updateUI();}
function renderInspector(){
  const item=selection?.kind==='folk'?s.folk.find(f=>f.id===selection.id):s.buildings.find(b=>b.id===selection?.id);if(!item){selection=null;$('inspector').hidden=true;return;}
  const c=$('inspectIcon').getContext('2d');c.clearRect(0,0,40,40);$('upgradeBtn').hidden=true;
  if(selection.kind==='folk'){folk(c,19,31,item,s.t,2);$('inspectName').textContent=item.name;$('inspectType').textContent=item.favorite==='tree'?'A soft spot for trees':'A collector of good stones';$('inspectText').textContent=describeFolk(s,item);$('inspectStats').innerHTML=`<span><b>${item.wood}</b> wood</span><span><b>${item.stone}</b> stone</span><span><b>${item.trips}</b> trips</span>`;}
  else{c.drawImage(buildingSprite(item.type,item.level),0,0,40,40);$('inspectName').textContent=BUILDINGS[item.type].name;$('inspectType').textContent=`Level ${item.level}`;$('inspectText').textContent=BUILDINGS[item.type].desc;$('inspectStats').textContent=item.type==='hut'?`${s.folk.filter(f=>f.home===item.id).map(f=>f.name).join(' & ')} live${item.level===1?'s':''} here.`:item.type==='workshop'?`Village tool level: ${s.tools} / 2`:'Your littlefolk use this automatically.';
    if(item.type==='hut'&&item.level<2){$('upgradeBtn').hidden=false;$('upgradeBtn').textContent='Add a cozy room · 32w + 16s';}
    if(item.type==='workshop'&&s.tools<2){$('upgradeBtn').hidden=false;$('upgradeBtn').textContent=`Better tools · ${40+s.tools*25}w + ${25+s.tools*20}s`;}
  }
}
function onTap(x,y){
  const p=screenToWorld(x,y),tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);
  if(selectedBuild){const type=selectedBuild,result=place(s,type,tx,ty);if(result.ok){terrainDirty=true;processEvents();if(type!=='path')selectBuild(type);save();}else toast(result.reason);updateUI();return;}
  const f=[...s.folk].reverse().find(f=>Math.hypot(f.x*TILE-p.x,f.y*TILE-5-p.y)<10);if(f){inspect('folk',f.id);return;}
  const b=buildingAt(s,tx,ty);if(b){inspect('building',b.id);return;}
  if(Math.hypot(p.x-(s.hearth.x+.5)*TILE,p.y-(s.hearth.y+.3)*TILE)<14){const r=ringBell(s);if(!r.ok)toast(r.reason);else processEvents();return;}
  selection=null;$('inspector').hidden=true;
}
function buildDock(){for(const [type,d] of Object.entries(BUILDINGS)){const b=document.createElement('button');b.className='buildcard';b.dataset.build=type;b.setAttribute('aria-pressed','false');b.innerHTML=`<span class="lockmark" aria-hidden="true">⌑</span><canvas width="48" height="44" data-icon="${type}" aria-hidden="true"></canvas><b>${d.short}</b><small></small>`;b.addEventListener('click',()=>selectBuild(type));$('buildings').append(b);}}
function save(manual=false){
  if(saveBlocked){if(manual)toast('Saving is paused to protect an unreadable save, or storage is blocked. Export a backup, then start a new island to replace it.',false,6500);return false;}
  try{const raw=JSON.stringify(snapshot(s));if(lastGoodSave)localStorage.setItem(BACKUP,lastGoodSave);localStorage.setItem(SAVE,raw);lastGoodSave=raw;$('saveStatus').textContent=`Saved on this device · ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}${offlineReady?' · Offline ready':''}`;if(manual)toast('Your little world is saved.');return true;}catch{$('saveStatus').textContent='Storage is unavailable. Export a save to keep your village.';if(manual)toast('This browser could not store the save. Use Export save instead.');return false;}
}
function downloadJSON(text,name){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function savePrefs(){try{localStorage.setItem(PREFS,JSON.stringify(prefs));}catch{}$('soundBtn').textContent=prefs.sound?'On':'Off';$('soundBtn').setAttribute('aria-pressed',String(prefs.sound));$('motionBtn').textContent=prefs.reduced?'Reduced':'Full';$('motionBtn').setAttribute('aria-pressed',String(prefs.reduced));}
function anyModal(){return ['welcomeBack','settingsBack','journalBack'].some(id=>!$(id).hidden);}
function openModal(id){focusedBefore=document.activeElement;for(const name of ['welcomeBack','settingsBack','journalBack'])$(name).hidden=name!==id;$(id).querySelector('[role=dialog]').focus();}
function closeModal(id){$(id).hidden=true;lastFrame=performance.now();focusedBefore?.focus();}
function renderMemories(){const list=$('memoryList');list.replaceChildren();if(!s.memories.length){const p=document.createElement('p');p.textContent='An empty page, for now. Every village starts somewhere.';list.append(p);return;}for(const m of s.memories){const article=document.createElement('article');article.className='memory';const meta=document.createElement('div');meta.className='meta';meta.textContent=`Day ${m.day} · A little moment`;const text=document.createElement('p');text.textContent=m.text;const who=document.createElement('div');who.className='author';who.textContent=m.who;article.append(meta,text,who);list.append(article);}}
function fatal(error){console.error(error);$('fatal').hidden=false;$('fatal').textContent='The village hit a snag. Reload this page to return to your last saved village. Details: '+String(error?.message||error).slice(0,180);paused=true;}
window.addEventListener('error',e=>fatal(e.error||e.message));window.addEventListener('unhandledrejection',e=>fatal(e.reason));
const pointers=new Map();let gesture=null,pinch=null;
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){gesture={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,multi:false};}else if(pointers.size===2){gesture.multi=true;const [a,b]=[...pointers.values()],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:cam.zoom,anchor:screenToWorld(mx,my)};}});
canvas.addEventListener('pointermove',e=>{const p=screenToWorld(e.clientX,e.clientY);hover={x:Math.floor(p.x/TILE),y:Math.floor(p.y/TILE)};if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2&&pinch){const [a,b]=[...pointers.values()],mx=(a.x+b.x)/2,my=(a.y+b.y)/2;cam.zoom=Math.max(1.1,Math.min(6,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance));cam.x=pinch.anchor.x-(mx-origin.x)/cam.zoom;cam.y=pinch.anchor.y-(my-origin.y)/cam.zoom;clampCamera();return;}if(gesture&&!gesture.multi){if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>6)gesture.moved=true;if(gesture.moved){cam.x-=(e.clientX-gesture.lastX)/cam.zoom;cam.y-=(e.clientY-gesture.lastY)/cam.zoom;clampCamera();}gesture.lastX=e.clientX;gesture.lastY=e.clientY;}});
canvas.addEventListener('pointerup',e=>{const tap=gesture&&!gesture.moved&&!gesture.multi&&pointers.size===1;pointers.delete(e.pointerId);if(tap)onTap(e.clientX,e.clientY);if(!pointers.size){gesture=null;pinch=null;}});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);if(gesture)gesture.multi=true;if(!pointers.size){gesture=null;pinch=null;}hover=null;});canvas.addEventListener('pointerleave',()=>{if(!pointers.size)hover=null;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();zoomTo(cam.zoom*Math.exp(-e.deltaY*.001),e.clientX,e.clientY);},{passive:false});
$('zoomIn').onclick=()=>zoomTo(cam.zoom*1.2);$('zoomOut').onclick=()=>zoomTo(cam.zoom/1.2);$('centerBtn').onclick=()=>{cam.x=22.5*TILE;cam.y=18*TILE;};
function togglePause(){paused=!paused;$('pauseBtn').innerHTML=paused?'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>';$('pauseBtn').setAttribute('aria-label',paused?'Resume simulation':'Pause simulation');updateUI();}
$('pauseBtn').onclick=togglePause;$('speedBtn').onclick=()=>{speed=speed===1?2:speed===2?3:1;updateUI();};$('bellBtn').onclick=()=>{const result=ringBell(s);if(!result.ok)toast(result.reason);else processEvents();updateUI();};
$('cancelBuild').onclick=()=>{if(selectedBuild)selectBuild(selectedBuild);};$('closeInspect').onclick=()=>{selection=null;$('inspector').hidden=true;};$('upgradeBtn').onclick=()=>{const r=upgrade(s,selection?.id);if(!r.ok)toast(r.reason);else{processEvents();save();updateUI();}};
$('beginBtn').onclick=()=>{closeModal('welcomeBack');selectBuild('hut');if(loadNotice)toast(loadNotice,false,8000);};
$('journalBtn').onclick=()=>{renderMemories();$('memoryDot').hidden=true;openModal('journalBack');};$('settingsBtn').onclick=()=>{savePrefs();if(saveBlocked)$('saveStatus').textContent='Automatic saving is paused. Export a backup before starting over.';openModal('settingsBack');};
for(const el of document.querySelectorAll('[data-close]'))el.onclick=()=>closeModal(el.dataset.close);
for(const id of ['settingsBack','journalBack'])$(id).addEventListener('click',e=>{if(e.target===$(id))closeModal(id);});
$('soundBtn').onclick=()=>{prefs.sound=!prefs.sound;savePrefs();if(prefs.sound)sound('bell');};$('motionBtn').onclick=()=>{prefs.reduced=!prefs.reduced;savePrefs();};$('saveBtn').onclick=()=>save(true);
$('exportBtn').onclick=()=>{if(saveBlocked){try{const raw=localStorage.getItem(SAVE);if(raw&&confirm('Export the unreadable original save for safekeeping? Cancel exports the current island instead.')){downloadJSON(raw,'littlefolk-original-recovery.json');return;}}catch{}}downloadJSON(JSON.stringify(snapshot(s),null,2),`littlefolk-day-${Math.floor(s.t/240)+1}.json`);toast('Save exported. Keep this file somewhere safe.');};
$('importBtn').onclick=()=>$('importFile').click();$('importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>3*1024*1024)throw new Error('Save files must be smaller than 3 MB.');const next=restore(JSON.parse(await file.text()));if(!confirm('Replace the current village with this save? Export your current village first to keep both.'))return;s=next;saveBlocked=false;selection=null;selectedBuild=null;hover=null;particles=[];accumulator=0;terrainDirty=true;$('inspector').hidden=true;$('buildHint').hidden=true;save();updateUI();toast('Your littlefolk made it safely. Welcome home.',true);}catch(err){toast(`Could not import: ${err.message}`,false,6500);}finally{e.target.value='';}});
$('resetBtn').onclick=()=>{if(!confirm('Start a completely new island? Your current village will be replaced. Export a save first to keep it.'))return;s=createWorld((Date.now()^Math.floor(Math.random()*0xffffffff))>>>0);saveBlocked=false;lastGoodSave=null;try{localStorage.removeItem(BACKUP);}catch{}selection=null;selectedBuild=null;hover=null;particles=[];accumulator=0;paused=false;terrainDirty=true;$('inspector').hidden=true;$('buildHint').hidden=true;cam.x=22.5*TILE;cam.y=18*TILE;closeModal('settingsBack');openModal('welcomeBack');save();updateUI();};
document.addEventListener('keydown',e=>{
  if(anyModal()){const active=['welcomeBack','settingsBack','journalBack'].find(id=>!$(id).hidden);if(e.key==='Escape'&&active!=='welcomeBack')closeModal(active);if(e.key==='Tab'){const nodes=[...$(active).querySelectorAll('button:not([hidden]),input:not([hidden])')].filter(el=>!el.disabled&&el.offsetParent!==null);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement.matches('[role=dialog]'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
  if(e.target.closest('input,textarea'))return;
  if(e.key==='Escape'){if(selectedBuild)selectBuild(selectedBuild);selection=null;$('inspector').hidden=true;}
  if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();togglePause();}
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();cam.x+=e.key==='ArrowRight'?24:e.key==='ArrowLeft'?-24:0;cam.y+=e.key==='ArrowDown'?24:e.key==='ArrowUp'?-24:0;clampCamera();}
  if(e.key==='+'||e.key==='=')zoomTo(cam.zoom*1.2);if(e.key==='-')zoomTo(cam.zoom/1.2);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();audio?.suspend().catch(()=>{});}else{lastFrame=performance.now();accumulator=0;if(prefs.sound)audio?.resume().catch(()=>{});}});window.addEventListener('pagehide',()=>save());window.addEventListener('resize',resize);setInterval(()=>{if(!anyModal()&&!document.hidden)save();},10000);
if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').then(reg=>{const offer=worker=>{waitingWorker=worker;$('updateBtn').hidden=false;toast('A fresh version is ready. Open Settings to save & update.',true,6000);};if(reg.waiting)offer(reg.waiting);reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)offer(worker);});});navigator.serviceWorker.ready.then(()=>{offlineReady=true;$('hintline').textContent='Offline ready · Tap to build · Drag to wander · Pinch to get closer';});}).catch(()=>{$('hintline').textContent='Tap to build · Drag to wander · Offline cache unavailable in this browser';});}
$('updateBtn').onclick=()=>{if(!save(true)&&!confirm('Your save could not be stored. Refresh anyway? Export a backup first to avoid losing progress.'))return;if(waitingWorker){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});waitingWorker.postMessage({type:'SKIP_WAITING'});}else location.reload();};
function frame(now){
  const dt=Math.min((now-lastFrame)/1000,.12);lastFrame=now;
  try{
    if(!paused&&!anyModal()&&!document.hidden){accumulator+=dt*speed;while(accumulator>=.1){step(s,.1);accumulator-=.1;}}
    processEvents();if(now-lastDraw>1000/30){draw();lastDraw=now;frameCount++;}if(now-lastUI>250){updateUI();lastUI=now;}
  }catch(e){fatal(e);return;}
  requestAnimationFrame(frame);
}
buildDock();paintIcons();savePrefs();resize();updateUI();
if(fresh)openModal('welcomeBack');else if(loadNotice)toast(loadNotice,false,7000);else toast('Welcome home. Your littlefolk kept your place.',true,3500);
if(new URLSearchParams(location.search).has('test'))window.__littlefolk={get state(){return s;},get camera(){return cam;},screenOf:(x,y)=>worldToScreen(x*TILE,y*TILE),advance(seconds){for(let i=0;i<Math.ceil(seconds*10);i++)step(s,.1);processEvents();updateUI();},place(type,x,y){const r=place(s,type,x,y);terrainDirty=true;processEvents();updateUI();return r;},save,restore(raw){s=restore(raw);terrainDirty=true;updateUI();},get frames(){return frameCount;}};
requestAnimationFrame(frame);
