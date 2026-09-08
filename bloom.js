/* Hearth & Harvest. Deterministic village care, community projects and building knowledge. */
const building=(name,short,wood,stone,desc)=>({name,short,wood,stone,unlock:0,tier:0,extra:{},w:2,h:2,desc});
export const FOOD_ITEMS={veg:{name:'Vegetables',color:'#e4a765'},berry:{name:'Berries',color:'#d77f9b'},fish:{name:'Fish',color:'#86bed0'},meal:{name:'Meals',color:'#e6ca82'}};
export const FOOD_BUILDINGS={
  vegetable:building('Vegetable patch','Vegetables',8,2,'Grows vegetables automatically. Send them to a cookhouse to turn your harvest into meals. No windmill needed.'),
  kitchen:building('Village cookhouse','Cookhouse',12,6,'2 vegetables become 3 meals. Send meals home for one supper per resident each day. No windmill needed.'),
  orchard:building('Berry orchard','Orchard',12,4,'Produces berries. Deliver them home for a colorful side dish at supper. More variety makes the village livelier.'),
  fishery:building('Fishing cottage','Fishery',14,6,'Catches fish near water. Deliver fish home as a second supper side dish. Build within 5 tiles of water.')
};
export const FOOD_RECIPES={
  vegetable:{input:{},output:'veg',amount:2,seconds:14,power:0},
  kitchen:{input:{veg:2},output:'meal',amount:3,seconds:10,power:0},
  orchard:{input:{},output:'berry',amount:2,seconds:20,power:0},
  fishery:{input:{},output:'fish',amount:2,seconds:22,power:0}
};
export const PROJECTS=[
  {id:'picnic',name:'The meadow picnic',icon:'🧺',cost:{plank:8,meal:6},tier:0,reward:'Picnic blankets, flower boxes and a place to share supper.',stamp:'First feast'},
  {id:'arch',name:'A welcome in bloom',icon:'🌸',cost:{brick:12,berry:8},tier:0,reward:'A flowering arch at the lantern and colorful village flags.',stamp:'Warm welcome'},
  {id:'fountain',name:'The wishing fountain',icon:'⛲',cost:{brick:24,iron:8},tier:1,reward:'A bubbling fountain beside the lantern. Every village needs a wish.',stamp:'Wish keeper'},
  {id:'parade',name:'The clockwork parade',icon:'🎏',cost:{gear:12,meal:12,fish:6},tier:2,reward:'Kites and little clockwork ducks around your gathering place.',stamp:'Small wonders'},
  {id:'fair',name:'The starlight fair',icon:'🎈',cost:{gear:20,plank:24,meal:18},tier:3,letters:3,reward:'Permanent fairground bunting; happy evenings send balloons skyward.',stamp:'A village in bloom'}
];
export const BUILDING_PURPOSE={
  hut:['More little hands','Adds a resident who gathers wood, stone and clearing jobs.','More residents need more supper.'],
  path:['Shorter delivery times','Folk and cargo wagons walk 65% faster on these tiles.','Tap a start and end tile, then confirm the whole paved walk.'],
  depot:['A local delivery hub','Shares all home stock. Shorter wagon trips improve your whole chain.','Storage is shared, not another factory.'],
  lumber:['Faster woodland work','Boosts nearby woodcutting. It does not manufacture or accept cargo.','Place within 7 tiles of trees.'],
  quarry:['Faster stone gathering','Boosts nearby stone gathering. No cargo inputs needed.','Place within 7 tiles of stones.'],
  garden:['Bring the village to life','Flowers improve the village mood and attract more butterflies.','This is ornamental. The vegetable patch grows food.'],
  workshop:['Better tools for everyone','Upgrade it after construction to improve gathering.','One workshop serves the village.'],
  windmill:['Power your production','Powers workshops inside its ring. More windmills share the load.','No cargo links. Food buildings need no power.'],
  sawmill:['Planks for projects and gears','Turns your gathered wood into building materials.','Hut → Sawmill → Hut, or send planks to Clockworks.'],
  mason:['Bricks for bigger ambitions','Turns stone into bricks for research and village landmarks.','Hut → Brick cottage → Hut.'],
  kiln:['Fuel for iron','Turns wood into charcoal for the smelter.','Send charcoal to a Smelter, or home for redistribution.'],
  mine:['Start the metal chain','Extracts ore near a stone deposit.','Mine → Smelter. The smelter also needs charcoal.'],
  smelter:['Iron for clockwork','Combines ore and charcoal to make iron.','Mine + Kiln → Smelter → Clockworks or Home.'],
  gearworks:['Make the moving parts','Combines iron and planks into gears for wonders and star mail.','Smelter + Sawmill → Clockworks → Home or Star post.'],
  forester:['Automate your wood supply','Produces wood beside existing trees without assigning residents.','Send logs to your Sawmill or home.'],
  stoneworks:['Automate your stone supply','Produces stone beside a deposit.','Send stone to a Brick cottage or home.'],
  skypost:['A reason to build it all','Turns gears and planks into floating letters and new memories.','Send three letters to unlock the Starlight Fair project.'],
  vegetable:['Grow your first supper','An automatic vegetable supply for the cookhouse.','Vegetables → Cookhouse → Home. No wind needed.'],
  kitchen:['Feed the village','Turns 2 vegetables into 3 meals. Each resident eats one per day.','Vegetable patch → Cookhouse → Home.'],
  orchard:['A sweeter supper','Berries are an optional side dish, not a meal replacement.','Orchard → Home. Fruit brings more color and activity.'],
  fishery:['More variety at the table','Fish are an optional side dish. Build close to water.','Fishing cottage → Home. Fish + berries make a varied supper.']
};
let E;
export function configureBloom(engine){E=engine;}
const stock=(s,k)=>k==='wood'||k==='stone'?s[k]:(s.industry.goods[k]||0);
const pay=(s,k,n)=>{if(k==='wood'||k==='stone')s[k]-=n;else s.industry.goods[k]=(s.industry.goods[k]||0)-n;};
const event=(s,type,data={})=>{s.events.push({type,...data});if(s.events.length>100)s.events.shift();};
export function initBloom(s){s.bloom={version:1,mood:55,lastMealDay:-1,served:0,suppers:0,goodSuppers:0,lastCoverage:0,lastVariety:0,projects:[],pinned:'picnic',festUntil:0,autoConnect:true,fundWish:true,theme:0,welcomed:0,lastSupper:null};}
export function welcomeBloom(s){const b=s.bloom;if(!b)return;const newcomers=s.folk.length-b.welcomed;if(newcomers>0){s.industry.goods.meal=(s.industry.goods.meal||0)+newcomers*2;b.welcomed=s.folk.length;}}
export function supperInfo(s){const b=s.bloom,n=s.folk.length,day=Math.floor(s.t/240),meals=Math.floor(stock(s,'meal'));return {n,day,meals,ready:Math.min(n,meals),served:b.lastMealDay===day,seconds:Math.max(0,(b.lastMealDay===day?426:186)-(s.t%240)),variety:['berry','fish'].filter(k=>stock(s,k)>=Math.max(1,Math.ceil(n/3))).length};}
export function serveSupper(s,automatic=false){
  const b=s.bloom,info=supperInfo(s);if(!info.n)return {ok:false,reason:'Place a home first.'};
  if(info.served)return {ok:false,reason:'Today’s supper has already been served. Next supper is tomorrow.'};
  if(!automatic&&info.meals<info.n)return {ok:false,reason:`Bring ${info.n-info.meals} more meals home before serving early. Automatic supper will share whatever is ready at dusk.`};
  const count=Math.min(info.n,info.meals),sides=count?['berry','fish'].filter(k=>stock(s,k)>=Math.max(1,Math.ceil(count/3))):[];
  pay(s,'meal',count);for(const k of sides)pay(s,k,Math.max(1,Math.ceil(count/3)));
  b.lastMealDay=info.day;b.served+=count;b.suppers++;b.lastCoverage=count/info.n;b.lastVariety=sides.length;
  b.lastSupper={day:info.day,count,total:info.n,sides:[...sides]};if(count===info.n)b.goodSuppers++;
  if(count===info.n&&sides.length===2)b.festUntil=s.t+55;
  const text=count===info.n?`${count} warm bowls, ${sides.length===2?'fruit and fish':sides.length?'a little side dish':'and a place for everyone'}. ${sides.length===2?'Tonight feels like a celebration.':'Nobody needed to eat a potato-shaped stone.'}`:`${count} of ${info.n} bowls at supper. Tomorrow could use a bigger harvest. Everyone is safe; the evening is just quieter.`;
  E.remember(s,'The supper table',text);event(s,'supper',{count,total:info.n,variety:sides.length});return {ok:true,count};
}
export function projectStatus(s,p){
  const n=PROJECTS.indexOf(p),before=n===0||s.bloom.projects.includes(PROJECTS[n-1].id),done=s.bloom.projects.includes(p.id);
  const research=s.industry.tier>=p.tier,mail=(s.industry.postcards||0)>=(p.letters||0),goods=Object.entries(p.cost).every(([k,v])=>stock(s,k)>=v);
  return {done,ready:!done&&before&&research&&mail&&goods,before,research,mail,progress:Object.entries(p.cost).reduce((sum,[k,v])=>sum+Math.min(1,stock(s,k)/v),0)/Object.keys(p.cost).length};
}
export function completeProject(s,id){
  const p=PROJECTS.find(v=>v.id===id);if(!p)return {ok:false,reason:'Choose a village project.'};const st=projectStatus(s,p);
  if(st.done)return {ok:false,reason:'This landmark is already part of your village.'};if(!st.ready)return {ok:false,reason:!st.before?'Complete the earlier village project first.':!st.research?'Unlock its research chapter first.':!st.mail?'Send three star letters first.':'Bring the highlighted materials home first.'};
  for(const [k,n] of Object.entries(p.cost))pay(s,k,n);s.bloom.projects.push(id);s.bloom.pinned=PROJECTS.find(p=>!s.bloom.projects.includes(p.id))?.id||'fair';s.bloom.festUntil=s.t+55;
  E.remember(s,'The village',`${p.name} is finished. ${p.reward}`);event(s,'communityProject',{id,name:p.name});return {ok:true};
}
export function stepBloom(s,dt){
  const b=s.bloom;if(!b)return;welcomeBloom(s);
  if(s.t%240>=186&&b.lastMealDay!==Math.floor(s.t/240)&&s.folk.length)serveSupper(s,true);
  // Mood changes only while actively playing. It never changes gathering speed or deletes progress.
  const gardens=Math.min(3,s.buildings.filter(v=>v.type==='garden').length);
  const target=b.suppers===0?55:Math.min(100,20+50*b.lastCoverage+10*b.lastVariety+gardens*4);
  b.mood+=Math.sign(target-b.mood)*Math.min(Math.abs(target-b.mood),dt*.65);
}
export const moodName=s=>s.bloom.mood>=80?'Flourishing':s.bloom.mood>=50?'Cozy':'Quiet';
export function bloomGoal(s){
  if(!s.folk.length)return null;
  const p=PROJECTS.find(p=>!s.bloom.projects.includes(p.id));
  const supper=supperInfo(s);
  const base={tag:p?`Village wish · ${p.name}`:'Your living village',progress:p?projectStatus(s,p).progress:1};
  const build=(type,text)=>({...base,title:`${E.BUILDINGS[type].short}: ${BUILDING_PURPOSE[type]?.[0]||'the next step'}`,text,button:`Place ${E.BUILDINGS[type].short.toLowerCase()}`,build:type});
  const machineStep=(type,needHome=false)=>{const b=s.buildings.find(v=>v.type===type);if(!b)return build(type,BUILDING_PURPOSE[type]?.[2]||'Add this part of your production chain.');const r=E.RECIPES[type],m=s.industry.machines[b.id];if(m?.paused)return {...base,title:`Resume your ${E.BUILDINGS[type].short.toLowerCase()}`,text:'This workshop is paused. Resume it in More options.',button:'Show this building',inspect:b.id};if(r?.power&&m?.power<.75)return build('windmill',`Your ${E.BUILDINGS[type].short.toLowerCase()} needs more nearby wind power. Another windmill helps every workshop in its ring.`);
    if(r){const routes=s.industry.routes,hasIn=Object.keys(r.input).every(k=>routes.some(q=>q.to===b.id&&!q.paused&&(q.filter==='auto'||q.filter===k)&&E.compatible(s,s.buildings.find(v=>v.id===q.from),b).includes(k))),hasOut=r.output==='star'||routes.some(q=>q.from===b.id&&!q.paused&&(!needHome||['hut','depot'].includes(s.buildings.find(v=>v.id===q.to)?.type)));if(!hasIn||!hasOut||m?.paused)return {...base,title:`Wake up your ${E.BUILDINGS[type].short.toLowerCase()}`,text:!hasIn||!hasOut?'Tap Connect storage. Supplies go in; finished goods come home.':'This workshop is paused. Resume it to keep the chain moving.',button:'Show this building',inspect:b.id};}return null;};
  // Food is introduced before industry, and a short chain is enough to maintain every resident.
  for(const type of ['vegetable','kitchen']){const action=machineStep(type);if(action)return action;}
  if(s.folk.length<3)return build('hut','More friends gather more materials. Each arrival brings two welcome meals.');
  if(!p)return {...base,title:supper.ready<supper.n?'Keep the supper table ready':'Make tonight a little brighter',text:`${supper.ready}/${supper.n} bowls ready · ${supper.variety}/2 side dishes. Your landmarks stay forever.`,button:'Open village board',board:true};
  const st=projectStatus(s,p);if(st.ready)return {...base,title:`Build ${p.name.toLowerCase()}`,text:p.reward,button:'Claim your village landmark',board:true};
  let needs=p.cost;
  if(!st.research){const r=E.RESEARCH[s.industry.tier];if(Object.entries(r.cost).every(([k,n])=>stock(s,k)>=n))return {...base,title:'Your next research chapter is ready',text:r.unlocks,button:'Unlock the next chapter',book:'research'};needs=r.cost;}
  const producers={veg:'vegetable',meal:'kitchen',berry:'orchard',fish:'fishery',plank:'sawmill',brick:'mason',ore:'mine',coal:'kiln',iron:'smelter',gear:'gearworks',star:'skypost'};
  function ensure(k,visited=new Set(),needHome=true){if(visited.has(k))return null;visited.add(k);const type=producers[k];if(!type)return null;const d=E.BUILDINGS[type];if((d.tier||0)>s.industry.tier)return null;
    const r=E.RECIPES[type];for(const input of Object.keys(r.input)){if(producers[input]){const upstream=ensure(input,visited,false);if(upstream)return upstream;}}
    if(s.delivered<d.unlock)return {...base,title:'A little more gathering',text:`${s.delivered}/${d.unlock} raw materials delivered. Clearing land also supplies the village.`,button:'Make room and gather',land:true};
    return machineStep(type,needHome);
  }
  for(const [k,n] of Object.entries(needs))if(stock(s,k)<n){const a=ensure(k);if(a)return a;}
  if(!st.mail){const a=ensure('star');if(a)return a;}
  return {...base,title:p.name,text:Object.entries(needs).map(([k,n])=>`${Math.min(n,Math.floor(stock(s,k)))}/${n} ${E.ITEMS[k].name.toLowerCase()}`).join(' · '),button:'See the goal & its supply chains',board:true};
}
export function restoreBloom(s,raw){
  const v=raw.bloom;initBloom(s);if(!v){welcomeBloom(s);return;}
  const valid=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
  if(v.version!==1||!valid(v.mood,0,100)||!valid(v.lastMealDay,-1,1e10)||!Number.isInteger(v.lastMealDay)||!Array.isArray(v.projects)||v.projects.length>PROJECTS.length||new Set(v.projects).size!==v.projects.length||v.projects.some(k=>!PROJECTS.some(p=>p.id===k))||(v.fundWish!==undefined&&typeof v.fundWish!=='boolean'))throw new Error('Invalid village care data.');
  for(const k of ['served','suppers','goodSuppers','welcomed'])if(!valid(v[k],0,k==='welcomed'?24:1e12)||!Number.isInteger(v[k]))throw new Error('Invalid supper history.');
  if(!valid(v.lastCoverage,0,1)||!valid(v.lastVariety,0,2)||!valid(v.festUntil,0,1e12)||!valid(v.theme,0,3)||!Number.isInteger(v.theme)||typeof v.autoConnect!=='boolean')throw new Error('Invalid village preferences.');
  if(v.lastSupper&&(!valid(v.lastSupper.day,0,1e10)||!valid(v.lastSupper.count,0,24)||!valid(v.lastSupper.total,1,24)||v.lastSupper.count>v.lastSupper.total||!Array.isArray(v.lastSupper.sides)||v.lastSupper.sides.length>2||v.lastSupper.sides.some(k=>!['berry','fish'].includes(k))))throw new Error('Invalid supper record.');
  s.bloom={version:1,mood:v.mood,lastMealDay:v.lastMealDay,served:v.served,suppers:v.suppers,goodSuppers:v.goodSuppers,lastCoverage:v.lastCoverage,lastVariety:v.lastVariety,projects:[...v.projects],pinned:PROJECTS.some(p=>p.id===v.pinned)?v.pinned:'picnic',festUntil:v.festUntil,autoConnect:v.autoConnect,fundWish:v.fundWish!==false,theme:v.theme,welcomed:Math.max(s.folk.length,v.welcomed),lastSupper:v.lastSupper?{day:v.lastSupper.day,count:v.lastSupper.count,total:v.lastSupper.total,sides:[...v.lastSupper.sides]}:null};
}

/** Hold only shared-store stock, never goods already inside workshops or in transit.
 * The visible wish budget prevents downstream factories from consuming the materials
 * needed for progress. Players may turn it off on the village board. */
export function fundingPlan(s){
  if(!s.bloom||s.bloom.fundWish===false||!s.folk.length)return {};
  const p=PROJECTS.find(p=>!s.bloom.projects.includes(p.id));
  if(!p)return {};
  const goal=bloomGoal(s),d=goal?.build?E.BUILDINGS[goal.build]:null;
  const held={...(s.industry.tier<p.tier?E.RESEARCH[s.industry.tier].cost:p.cost)};
  if(d)for(const [k,n] of Object.entries({wood:d.wood,stone:d.stone,...d.extra}))held[k]=Math.max(held[k]||0,n);
  return held;
}
