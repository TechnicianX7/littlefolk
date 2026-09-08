"""Finish feedback-driven map and touch polish. Safe to run twice."""
from pathlib import Path

def edit(name, pairs):
    p=Path(name); text=p.read_text()
    for before, after in pairs:
        if after in text: continue
        if before in text: text=text.replace(before,after)
        else: raise RuntimeError(f'Missing polish anchor in {name}: {before[:70]}')
    p.write_text(text)

edit('lanes-ui.js',[("if(!all&&r.from!==selection.id&&r.to!==selection.id)continue;", "if(selection?.kind==='building'&&r.from!==selection.id&&r.to!==selection.id)continue;")])
edit('industry.js',[
("export function optimizeStorage(s){", "export function optimizeStorage(s,includeExisting=false){"),
("s.industry.routes.filter(q=>q.managed)", "s.industry.routes.filter(q=>q.managed||includeExisting)"),
("if(!factory||!RECIPES[factory.type])continue;", "if(!factory||!RECIPES[factory.type]||!isHub(from)&&!isHub(to))continue;"),
("q.from=a;q.to=b;", "q.from=a;q.to=b;q.managed=true;")])
edit('industry-ui.js',[
("if(b.id==='optimizeStorage'){const r=optimizeStorage(s);", "if(b.id==='optimizeStorage'){const existing=i.routes.some(q=>!q.managed&&[q.from,q.to].some(id=>isHub(s.buildings.find(b=>b.id===id))));if(existing&&!confirm('Choose faster storage stops? This can change your older or manually chosen storage connections. Direct workshop-to-workshop links and all goods are kept.'))return;const r=optimizeStorage(s,existing);"),
("Manual links kept.", "Direct workshop links kept."),
("Manual routes stay yours.</div>", "Direct workshop links stay yours. Older storage stops can be re-planned with your confirmation.</div>"),
("for(const b of document.querySelectorAll('.buildcard'))", "if(legend){const html=view?.selection?.kind==='building'?'<b class=\"in\">Blue → in</b> · <b class=\"out\">Gold → out</b> · This building only':'Shared delivery lanes · Select a workshop to trace its goods';if(legend.innerHTML!==html)legend.innerHTML=html;}\nfor(const b of document.querySelectorAll('.buildcard'))")])
edit('app.js',[("rect(c,8,5,7,5,'#b5b78e');rect(c,15,14,8,5,'#c9c4a0');rect(c,4,23,10,5,'#929e7b');", "rect(c,7,5,9,27,'#929e7b');rect(c,7,23,25,9,'#929e7b');rect(c,9,5,5,25,'#d2d0b0');rect(c,9,25,23,5,'#d2d0b0');for(let y=9;y<28;y+=6)rect(c,9,y,5,1,'#a4ae95');")])
edit('tests/lanes.browser.mjs',[
("await page.touchscreen.tap(p.x,p.y);", "assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p),'world','Test tap must reach the map, not a toolbar');await page.touchscreen.tap(p.x,p.y);"),
("await tap(23.5,23.5);await tap(26.5,25.5);", "await tap(22.5,21.5);await tap(25.5,22.5);"),
("tiles[23*44+23].path", "tiles[21*44+22].path")])
p=Path('tests/lanes.browser.mjs');p.write_text(p.read_text().replace('tiles[23*44+23].path','tiles[21*44+22].path'))
p=Path('tests/lanes.test.mjs');text=p.read_text().replace("place(s,'depot',27,15);","assert.ok(place(s,'depot',24,12).ok);");p.write_text(text)
if "player can explicitly optimize" not in text:
    text+="\ntest('player can explicitly optimize legacy storage stops without losing goods',()=>{const s=fresh();place(s,'sawmill',26,12);connectStorage(s,s.buildings.at(-1).id);stepIndustry(s,.1);s.industry.routes.forEach(q=>q.managed=false);assert.ok(place(s,'depot',24,12).ok);const before=stockCargo(s,'wood'),ids=s.industry.routes.map(q=>q.id);const r=optimizeStorage(s,true);assert.ok(r.count>0);assert.equal(stockCargo(s,'wood'),before);assert.deepEqual(s.industry.routes.map(q=>q.id),ids);validLanes(s);});\n"
    p.write_text(text)
p=Path('README.md');text=p.read_text()
if '## Village Works' not in text:p.write_text(text.replace('# Littlefolk\n','# Littlefolk\n\n## Village Works\n\n**Version 2.3.0:** stable building placement, visible shared delivery lanes, two-point paving, clearer supply inspection, and progression repairs. See [Village Works](VILLAGE-WORKS.md) for the update guide. Older release notes follow.\n',1))
p=Path('VILLAGE-WORKS.md');text=p.read_text();text=text.replace('It preserves manual routes, buffers, and cargo. Old saves did not record which links were automatic, so those existing destinations are conservatively preserved; their lane geometry still updates. Manually reconnect an old storage route to change its destination.', 'It preserves buffers and cargo. Old saves did not record which links were automatic, so their destinations are preserved during migration. When older or manual storage links exist, this button asks before choosing faster storage stops for them. Direct workshop-to-workshop links are never changed. Their lane geometry still updates with the map.')
p.write_text(text)
print('Village Works map and touch polish applied.')
