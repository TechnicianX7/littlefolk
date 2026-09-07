from pathlib import Path

def edit(name, changes):
    p=Path(name);text=p.read_text()
    for before,after in changes:
        if before not in text: raise RuntimeError(f'Missing upgrade anchor in {name}: {before[:100]}')
        text=text.replace(before,after,1)
    p.write_text(text)

edit('world.js',[
('export const VERSION = 1;', "import { EXTRA_BUILDINGS, configureIndustry, initIndustry, industryPlacement, industryPay, industryBuilt, stepIndustry, restoreIndustry } from './industry.js';\nexport const VERSION = 2;"),
('export const COLORS =', 'Object.assign(BUILDINGS, EXTRA_BUILDINGS);\nexport const COLORS ='),
('  return s;\n}\nexport function buildingAt', '  s.topology=0;initIndustry(s);return s;\n}\nexport function buildingAt'),
('export function walkable(s, x, y, extra = null) {', '''const spatial = new WeakMap();
function blockedAt(s,x,y){
  let cache=spatial.get(s);
  if(!cache||cache.revision!==s.topology||cache.count!==s.buildings.length){
    const cells=new Uint8Array(W*H);
    for(const b of s.buildings){const d=BUILDINGS[b.type];for(let y=b.y;y<b.y+d.h;y++)for(let x=b.x;x<b.x+d.w;x++)cells[idx(x,y)]=1;}
    cache={cells,revision:s.topology,count:s.buildings.length};spatial.set(s,cache);
  }return cache.cells[idx(x,y)]===1;
}
export function walkable(s, x, y, extra = null) {'''),
('!buildingAt(s,x,y)', '!blockedAt(s,x,y)'),
('{wood:d.wood,stone:d.stone}; }', '{wood:d.wood,stone:d.stone,...d.extra}; }'),
("const d=BUILDINGS[type]; if(!d)return {ok:false,reason:'Choose a building first.'};", "const d=BUILDINGS[type]; if(!d)return {ok:false,reason:'Choose a building first.'};\n  if(!Number.isInteger(x)||!Number.isInteger(y))return {ok:false,reason:'Choose a map tile.'};\n  const industryReason=industryPlacement(s,type,x,y);if(industryReason)return {ok:false,reason:industryReason};"),
('s.wood-=c.wood;s.stone-=c.stone;', 's.wood-=c.wood;s.stone-=c.stone;industryPay(s,type);'),
("s.buildings.push(b);if(type==='hut')spawn(s,b);", "s.buildings.push(b);s.topology=(s.topology||0)+1;industryBuilt(s,b);if(type==='hut')spawn(s,b);"),
("for(const f of s.folk){f.path=[];f.target=null;f.mode='idle';f.timer=.1;}", "if(type!=='path')for(const f of s.folk){f.path=[];f.target=null;f.mode='idle';f.timer=.1;}"),
("  for(const [type,d] of Object.entries(BUILDINGS))if(d.unlock>0", "  stepIndustry(s,dt);\n  for(const [type,d] of Object.entries(BUILDINGS))if(d.unlock>0"),
("raw.version!==VERSION", "![1,VERSION].includes(raw.version)"),
("This is not a Littlefolk version 1 save.", "This is not a supported Littlefolk save."),
("Object.assign(s,raw);s.events=[];", "Object.assign(s,raw);s.version=VERSION;s.topology=0;s.events=[];"),
("  return s;\n}\n", "  restoreIndustry(s,raw);return s;\n}\nconfigureIndustry({W,H,BUILDINGS,walkable,findPath,remember});\n")
])

edit('app.js',[
("const $=id=>", "import { installIndustryUI, drawIndustryBuilding } from './industry-ui.js';\nlet factoryUI=null;\nconst $=id=>"),
("const SAVE='littlefolk.v1.save', BACKUP='littlefolk.v1.backup'", "const LEGACY='littlefolk.v1.save', LEGACY_BACKUP='littlefolk.v1.backup';\nconst SAVE='littlefolk.v2.save', BACKUP='littlefolk.v2.backup'"),
("const primary=localStorage.getItem(SAVE),backup=localStorage.getItem(BACKUP);", "const primary=localStorage.getItem(SAVE)||localStorage.getItem(LEGACY),backup=localStorage.getItem(BACKUP)||localStorage.getItem(LEGACY_BACKUP);"),
("  if(type==='garden'){", "  if(drawIndustryBuilding(c,type,level)){spriteCache.set(key,a);return a;}\n  if(type==='garden'){"),
("width=$('app').clientWidth;height=$('app').clientHeight;canvas.width=Math.round(width);canvas.height=Math.round(height);", "width=$('app').clientWidth;height=$('app').clientHeight;if(canvas.width!==Math.round(width))canvas.width=Math.round(width);if(canvas.height!==Math.round(height))canvas.height=Math.round(height);"),
("function draw(){", "let previewCache=null;\nfunction previewPlacement(){const key=[selectedBuild,hover?.x,hover?.y,s.topology].join(':');if(!previewCache||previewCache.key!==key||performance.now()-previewCache.time>250)previewCache={key,time:performance.now(),result:placement(s,selectedBuild,hover.x,hover.y)};return previewCache.result;}\nfunction draw(){"),
("ctx.drawImage(terrain,0,0);", "ctx.drawImage(terrain,0,0);factoryUI?.drawBelow(ctx,selection,selectedBuild,hover);"),
("valid=placement(s,selectedBuild,hover.x,hover.y).ok", "valid=previewPlacement().ok"),
("  if(!prefs.reduced){\n    for(let i=0;i<6;i++)", "  factoryUI?.drawAbove(ctx);\n  if(!prefs.reduced){\n    for(let i=0;i<6;i++)"),
("ctx.roundRect(x,y,max,h,10);", "if(ctx.roundRect)ctx.roundRect(x,y,max,h,10);else ctx.rect(x,y,max,h);"),
("function processEvents(){for(const e of s.events.splice(0)){", "function processEvents(){for(const e of s.events.splice(0)){\n  factoryUI?.event(e);if(e.type==='salvage')terrainDirty=true;"),
("if(selection)renderInspector();if(performance.now()>toastEnd)", "if(selection)renderInspector();factoryUI?.update();if(performance.now()>toastEnd)"),
("function selectBuild(type){selection=null;", "function selectBuild(type){factoryUI?.cancelLink();selection=null;"),
("function inspect(kind,id){selection=", "function inspect(kind,id){factoryUI?.cancelLink();selection="),
("function renderInspector(){", "function renderInspector(){"),
("  }\n}\nfunction onTap(x,y){", "  }\n  factoryUI?.inspect(selection.kind,item);\n}\nfunction onTap(x,y){"),
("ty=Math.floor(p.y/TILE);\n  if(selectedBuild)", "ty=Math.floor(p.y/TILE);\n  if(factoryUI?.mapTap(tx,ty))return;\n  if(selectedBuild)"),
("function anyModal(){return ['welcomeBack','settingsBack','journalBack'].some(id=>!$(id).hidden);}", "function modalIds(){return [...document.querySelectorAll('.sheetback')].map(el=>el.id);}\nfunction anyModal(){return modalIds().some(id=>!$(id).hidden);}"),
("for(const name of ['welcomeBack','settingsBack','journalBack'])", "for(const name of modalIds())"),
("function closeModal(id){$(id).hidden=true;lastFrame=performance.now();focusedBefore?.focus();}", "function closeModal(id){$(id).hidden=true;lastFrame=performance.now();accumulator=0;focusedBefore?.focus();}"),
("function fatal(error){console.error(error);$('fatal').hidden=false;$('fatal').textContent='The village hit a snag. Reload this page to return to your last saved village. Details: '+String(error?.message||error).slice(0,180);paused=true;}\nwindow.addEventListener('error',e=>fatal(e.error||e.message));window.addEventListener('unhandledrejection',e=>fatal(e.reason));", '''let frameFault=false;
let diagnostics=[];try{const saved=JSON.parse(localStorage.getItem('littlefolk.diagnostics')||'[]');if(Array.isArray(saved))diagnostics=saved.slice(-20);}catch{}
function report(error,source='interface'){
  const message=String(error?.message||error).slice(0,240);
  const previous=diagnostics[diagnostics.length-1];if(previous?.message===message&&Date.now()-previous.time<3000)return;
  diagnostics.push({time:Date.now(),source,message,stack:String(error?.stack||'').slice(0,1400)});if(diagnostics.length>20)diagnostics.shift();
  console.error(error);try{localStorage.setItem('littlefolk.diagnostics',JSON.stringify(diagnostics));}catch{}
}
function fatal(error){report(error,'frame');frameFault=true;paused=true;
  const box=$('fatal');box.replaceChildren();box.hidden=false;
  const text=document.createElement('span');text.textContent='A small snag interrupted the village. Your last successful save has been kept. ';
  const resume=document.createElement('button');resume.className='secondary';resume.textContent='Resume village';resume.onclick=()=>{
    selection=null;hover=null;selectedBuild=null;previewCache=null;$('inspector').hidden=true;$('buildHint').hidden=true;
    for(const f of s.folk){f.path=[];f.mode='idle';f.timer=.2;f.target=null;}
    frameFault=false;paused=false;accumulator=0;lastFrame=performance.now();box.hidden=true;resetPointers();
  };
  const exportLog=document.createElement('button');exportLog.className='secondary';exportLog.textContent='Export diagnostics';exportLog.onclick=()=>downloadJSON(JSON.stringify({version:'2.0.0',errors:diagnostics},null,2),'littlefolk-diagnostics.json');
  box.append(text,resume,exportLog);
}
window.addEventListener('error',e=>report(e.error||e.message));window.addEventListener('unhandledrejection',e=>report(e.reason,'promise'));'''),
("canvas.setPointerCapture(e.pointerId);", "try{canvas.setPointerCapture(e.pointerId);}catch(error){report(error,'pointer capture');}"),
("gesture.multi=true;const [a,b]", "if(gesture)gesture.multi=true;const [a,b]"),
("pointers.delete(e.pointerId);if(tap)onTap(e.clientX,e.clientY);if(!pointers.size){gesture=null;pinch=null;}", "pointers.delete(e.pointerId);if(!pointers.size){gesture=null;pinch=null;}if(tap)onTap(e.clientX,e.clientY);"),
("canvas.addEventListener('wheel',", "function resetPointers(){pointers.clear();gesture=null;pinch=null;hover=null;}\ncanvas.addEventListener('lostpointercapture',e=>{pointers.delete(e.pointerId);if(!pointers.size){gesture=null;pinch=null;}});\nwindow.addEventListener('blur',resetPointers);window.addEventListener('pageshow',()=>{resetPointers();lastFrame=performance.now();accumulator=0;});\ncanvas.addEventListener('wheel',"),
("const active=['welcomeBack','settingsBack','journalBack'].find", "const active=modalIds().find"),
("if(e.key==='Escape'){if(selectedBuild)", "if(e.key==='Escape'){factoryUI?.cancelLink();if(selectedBuild)"),
("if(document.hidden){save();", "if(document.hidden){resetPointers();save();"),
("function frame(now){\n  const dt", "function frame(now){\n  requestAnimationFrame(frame);\n  if(frameFault){lastFrame=now;return;}\n  const dt"),
("while(accumulator>=.1){step(s,.1);accumulator-=.1;}", "const start=performance.now();let count=0;while(accumulator>=.1&&count++<4){step(s,.1);accumulator-=.1;if(performance.now()-start>8)break;}accumulator=Math.min(accumulator,.4);"),
("  }catch(e){fatal(e);return;}\n  requestAnimationFrame(frame);", "  }catch(e){fatal(e);}"),
("buildDock();paintIcons();savePrefs();resize();updateUI();", '''buildDock();paintIcons();savePrefs();
factoryUI=installIndustryUI({getState:()=>s,toast,save,openModal,closeModal,sound,worldToScreen,
  reduced:()=>prefs.reduced,clearSelection:()=>{selectedBuild=null;selection=null;hover=null;$('inspector').hidden=true;$('buildHint').hidden=true;},
  changed:()=>{terrainDirty=true;previewCache=null;processEvents();save();updateUI();},
  diagnostics:()=>diagnostics,drawIcon:(c,type)=>c.drawImage(buildingSprite(type),0,0,48,44)});
resize();updateUI();'''),
("get frames(){return frameCount;}", "get frames(){return frameCount;},get errors(){return diagnostics;},get fault(){return frameFault;},injectFrameError:()=>fatal(new Error('Intentional recovery test'))")
])
edit('index.html',[
('</head>', '<link rel="stylesheet" href="./industry.css">\n</head>'),
('Littlefolk 1.0.0 · A small world, all its own', 'Littlefolk 2.0.0 · Timber & Tinkering'),
('Made for quiet moments. Your village saves on this device.', 'A cozy village with a clever little factory. Your village saves on this device.')
])
edit('sw.js',[
("littlefolk-1.0.0", "littlefolk-2.0.0"),
("'./world.js', './app.js',", "'./world.js', './app.js', './industry.js', './industry-ui.js', './industry.css',")
])
edit('package.json',[
('"version": "1.0.0"','"version": "2.0.0"'),
('node --test tests/world.test.mjs', 'node --test tests/*.test.mjs'),
('node --check sw.js', 'node --check sw.js && node --check industry.js && node --check industry-ui.js')
])
edit('.github/workflows/check.yml',[
('node --test tests/world.test.mjs', 'node --test tests/*.test.mjs'),
('run: node tests/browser.mjs', 'run: node tests/browser.mjs && node tests/timber.browser.mjs'),
('            app.js\n', '            app.js\n            industry.js\n            industry-ui.js\n            industry.css\n')
])
print('Timber & Tinkering upgrade applied.')
