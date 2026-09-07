import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.');
const types={'.html':'text/html','.js':'text/javascript','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.json':'application/json'};
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/littlefolk\//,'/');if(path==='/'||path==='')path='/index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw new Error('Not found');const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
await mkdir('artifacts',{recursive:true});
const results=[];
try {
  for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
    const browser=await engine.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1366,height:1024},deviceScaleFactor:1,isMobile:true,hasTouch:true,acceptDownloads:true});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    try{
      await page.goto('http://127.0.0.1:4173/littlefolk/?test=1');
      await page.waitForFunction(()=>!!window.__littlefolk);
      await page.screenshot({path:`artifacts/${name}-welcome.png`});
      await page.locator('#beginBtn').tap();
      const home=await page.evaluate(()=>window.__littlefolk.screenOf(20.5,19.5));
      await page.touchscreen.tap(home.x,home.y);
      assert.equal(await page.evaluate(()=>window.__littlefolk.state.folk.length),1,'Touch builds a first hut');
      await page.evaluate(()=>window.__littlefolk.advance(180));
      let state=await page.evaluate(()=>({wood:window.__littlefolk.state.wood,stone:window.__littlefolk.state.stone,delivered:window.__littlefolk.state.delivered}));
      assert.ok(state.wood>0&&state.stone>0,'Both resources are collected');
      await page.screenshot({path:`artifacts/${name}-first-village.png`});
      // Find an unoccupied visible site rather than depending on a worker being elsewhere.
      const site=await page.evaluate(async()=>{const {placement}=await import('../littlefolk/world.js');const api=window.__littlefolk;for(let i=0;i<4&&(api.state.wood<18||api.state.stone<8);i++)api.advance(60);for(const [x,y] of [[24,19],[17,14],[24,14],[19,15]])if(placement(api.state,'hut',x,y).ok)return {x,y};throw new Error('No second hut site');});
      await page.locator('[data-build="hut"]').tap();const point=await page.evaluate(({x,y})=>window.__littlefolk.screenOf(x+.5,y+.5),site);await page.touchscreen.tap(point.x,point.y);
      assert.equal(await page.evaluate(()=>window.__littlefolk.state.folk.length),2);
      // Exercise one-finger panning and ensure a drag does not build by accident.
      const cameraBefore=await page.evaluate(()=>window.__littlefolk.camera.x);
      await page.evaluate(()=>{const c=document.getElementById('world');c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:77,clientX:700,clientY:400,button:0,bubbles:true}));});
      // Use native mouse movement for capture-backed drag coverage.
      await page.mouse.move(700,420);await page.mouse.down();await page.mouse.move(790,450,{steps:8});await page.mouse.up();
      await page.locator('#centerBtn').tap();
      await page.locator('#zoomIn').tap();await page.locator('#zoomOut').tap();
      await page.evaluate(()=>{const api=window.__littlefolk;if(api.state.meeting)api.advance(30);if(api.state.t-api.state.lastBell<71)api.advance(75);});
      await page.locator('#bellBtn').tap();assert.ok(await page.evaluate(()=>window.__littlefolk.state.meeting));
      await page.evaluate(()=>window.__littlefolk.advance(16));
      await page.screenshot({path:`artifacts/${name}-lantern-time.png`});
      await page.locator('#journalBtn').tap();assert.ok(await page.locator('.memory').count()>=3);await page.screenshot({path:`artifacts/${name}-memories.png`});await page.locator('[data-close="journalBack"]').tap();
      await page.locator('#settingsBtn').tap();await page.locator('#saveBtn').tap();
      const downloadPromise=page.waitForEvent('download');await page.locator('#exportBtn').tap();const download=await downloadPromise;await download.saveAs(`artifacts/${name}-save.json`);const exported=JSON.parse(await readFile(`artifacts/${name}-save.json`,'utf8'));assert.equal(exported.folk.length,2);
      await page.locator('[data-close="settingsBack"]').tap();await page.reload();await page.waitForFunction(()=>!!window.__littlefolk);assert.equal(await page.evaluate(()=>window.__littlefolk.state.folk.length),2,'Save survives reload');
      assert.equal(await page.locator('#welcomeBack').isVisible(),false,'Restored villages skip welcome');
      await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
      await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!window.__littlefolk);assert.equal(await page.evaluate(()=>window.__littlefolk.state.folk.length),2,'Offline reload retains village');
      await page.setViewportSize({width:1024,height:1366});await page.screenshot({path:`artifacts/${name}-portrait.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
      await page.setViewportSize({width:390,height:844});await page.screenshot({path:`artifacts/${name}-phone.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(await page.locator('#fatal').isVisible(),false);assert.deepEqual(errors,[]);
      results.push({engine:name,result:'passed',coverage:['touch build','autonomous gathering','second resident','camera controls','gathering stories','save export','reload recovery','offline reload','tablet landscape','tablet portrait','phone layout']});
    }catch(error){await page.screenshot({path:`artifacts/${name}-failure.png`}).catch(()=>{});results.push({engine:name,result:'failed',error:String(error),pageErrors:errors});throw error;}
    finally{await context.close();await browser.close();}
  }
}finally{await writeFile('artifacts/browser-results.json',JSON.stringify(results,null,2));await new Promise(r=>server.close(r));}
console.log(JSON.stringify(results,null,2));
