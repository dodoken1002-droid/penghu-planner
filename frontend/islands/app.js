import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const $ = s => document.querySelector(s);
const escapeHTML = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const trips = [
 {id:'magong',name:'馬公・小城故事',region:'本島',kind:'在地漫步',subtitle:'穿過老街，把日子慢慢走。',desc:'從馬公老街出發，在巷弄、港口與老屋之間，聽聽澎湖的生活故事。',icon:'town',x:-1.95,z:1.05,tags:['文化走讀','親子友善']},
 {id:'inland',name:'內海・藍色巡禮',region:'本島',kind:'海上體驗',subtitle:'從海上，換個角度認識澎湖。',desc:'搭上小船，走進澎湖內海。沿著海岸與島嶼，看看海風雕刻的不同風景。',icon:'harbor',x:1.95,z:1.05,tags:['內海巡禮','船遊']},
 {id:'wang',name:'望安・慢島日常',region:'南海',kind:'生態探索',subtitle:'在花宅與綠蠵龜的島，慢下來。',desc:'望安的花宅聚落與海龜保育，是理解海島生活的另一扇窗。跟著在地導覽，為自然留一點時間。',icon:'turtle',x:-1.95,z:9.5,tags:['生態解說','聚落散步']},
 {id:'east',name:'東海・潮間帶探險',region:'東海',kind:'親子體驗',subtitle:'彎下腰，發現海裡的小宇宙。',desc:'潮水退去，一座海洋教室出現了。以不干擾生態的方式，認識潮間帶的小生命。實際活動需配合潮汐與天候。',icon:'beach',x:9.75,z:-2.3,tags:['潮間帶','海洋教育']},
 {id:'north',name:'北海・踏浪時光',region:'北海',kind:'海島漫遊',subtitle:'留一段空白，給海風與沙灘。',desc:'用一整天的時間看一片海。沿著北海島嶼的岸線，感受沙灘、海浪與聚落的節奏。',icon:'beach',x:-3.9,z:-8.9,tags:['沙灘散步','慢旅行']},
 {id:'qimei',name:'七美・雙心的風景',region:'南海',kind:'島嶼走讀',subtitle:'兩顆心，收藏一座島的記憶。',desc:'沿著七美的海岸，認識雙心石滬背後的漁業文化。用在地的故事，重新看見熟悉的風景。',icon:'heart',x:3.9,z:12.8,tags:['石滬文化','海岸風景']}
];
let state={mode:'planner',trips:[],events:[],summary:{groups:0,people:0}},hasData=false;
for(const t of trips)Object.assign(t,{people:0,groups:0,confirmedChecks:0,totalChecks:0});
let selected=null, region='all', query='', hour=10.5, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, labelsOn=true, routesOn=true, bird=false,timePlaying=false, liveFollowing=false;
const baseline=new Map(trips.map(t=>[t.id,{...t}]));
const status=t=>!hasData?'等待資料':t.groups?'已有確認行程':'尚無確認行程';
const dotClass=t=>!hasData?'amber':t.groups?'green':'gray';
const hh=v=>`${String(Math.floor(v)).padStart(2,'0')}:${String(Math.round(v%1*60)).padStart(2,'0')}`;
function filtered(){return trips.filter(t=>(region==='all'||t.region===region)&&(!query||`${t.name}${t.kind}${t.desc}${t.tags.join('')}`.includes(query)));}
function renderList(){
 const list=filtered();$('#trip-count').textContent=list.length;
 $('#trip-list').innerHTML=list.length?list.map(t=>`<button class="trip-card ${selected===t.id?'selected':''}" data-id="${t.id}" aria-pressed="${selected===t.id}"><div class="trip-topline"><span class="trip-num">0${trips.indexOf(t)+1}</span><span>${t.region} / ${escapeHTML(t.kind)}</span><span class="trip-state"><i class="dot ${dotClass(t)}"></i>${status(t)}</span></div><div class="trip-title">${escapeHTML(t.name)}<span>↗</span></div><p class="trip-desc">${hasData?`${t.groups} 筆確認行程 · ${t.confirmedChecks}/${t.totalChecks} 項預訂已確認`:'正在取得規畫器資料…'}</p><div class="trip-bottom">${t.tags.map(tag=>`<span class="trip-tag">${escapeHTML(tag)}</span>`).join('')}<span class="trip-count">${hasData?t.people+' 位規劃旅人':'等待資料'}</span></div></button>`).join(''):'<div class="empty">這片海域沒有符合的主題。<br>試試其他關鍵字或全部海域。</div>';
 $('#trip-list').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>selectIsland(b.dataset.id));
 $('#stat-travelers').textContent=hasData?state.summary.people:'—';$('#stat-active').textContent=hasData?state.summary.groups:'—';
 document.querySelectorAll('.island-label').forEach(b=>{b.classList.toggle('selected',b.dataset.id===selected);b.classList.toggle('dimmed',!list.some(t=>t.id===b.dataset.id));});
 if(selected)renderDetail();renderLog();
}
function renderDetail(){const t=trips.find(t=>t.id===selected);if(!t)return;$('#detail').hidden=false;$('#detail').innerHTML=`<button class="close-detail" aria-label="關閉行程詳情">×</button><div class="eyebrow">ISLAND 0${trips.indexOf(t)+1} / ${t.region}</div><h2>${escapeHTML(t.name)}</h2><p>${escapeHTML(t.desc)}</p><div class="detail-stats"><span><b>${hasData?t.groups:'—'}</b>筆確認行程</span><span><b>${hasData?t.people:'—'}</b>位規劃旅人</span><span><b>${hasData?t.confirmedChecks+'/'+t.totalChecks:'—'}</b>項預訂確認</span></div><a class="detail-link" href="/trips">回規畫器查看行程 ↗</a><p class="fine-print">${hasData?escapeHTML(state.date):'等待資料'} · 按當日已設定的景點所在地歸島。同一行程可跨島，非現場定位。預訂確認含行程、交通、住宿三項。</p>`;$('#detail .close-detail').onclick=()=>{selected=null;$('#detail').hidden=true;renderList();};}
function renderLog(){const events=hasData?state.events:[];$('#log-list').innerHTML='<p>最近 24 小時後台協作 · 匿名時段彙整</p>'+(events.length?events.map(e=>`<div class="log-item"><span class="log-time">${escapeHTML(e.date)}<br>${escapeHTML(e.time)}</span><span><b>${escapeHTML(e.title)}</b><p>${escapeHTML(e.text)}</p></span></div>`).join(''):`<div class="empty">${hasData?'最近 24 小時尚無協作紀錄。':'尚未取得協作資料。'}</div>`);}
function selectIsland(id){selected=id;renderList();const tile=tileById.get(id);if(tile){const target=tile.position.clone();target.y=0;cameraGoal={target,position:target.clone().add(new THREE.Vector3(10,13,17))};} }
function setTime(v){hour=Number(v);$('#time').value=hour;$('#time-label').textContent=hh(hour);renderList();const evening=Math.max(0,(hour-16)/6);sun.color.set(evening>.2?0xffdbb6:0xfff6dc);sun.intensity=3-evening*1.6;ambient.intensity=2.2-evening*.65;scene.fog.color.set(evening>.55?0xc5d7d3:0xdeeadf);}
$('#search').oninput=e=>{query=e.target.value.trim();renderList();};
document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{region=b.dataset.region;document.querySelectorAll('[data-region]').forEach(x=>x.classList.toggle('selected',x===b));renderList();});
function setTab(log){$('#trip-list').hidden=log;$('#filters').hidden=log;$('#log-list').hidden=!log;$('#tab-trips').classList.toggle('selected',!log);$('#tab-log').classList.toggle('selected',log);$('#tab-trips').setAttribute('aria-selected',!log);$('#tab-log').setAttribute('aria-selected',log);}
$('#tab-trips').onclick=()=>setTab(false);$('#tab-log').onclick=()=>setTab(true);
$('#about').onclick=()=>$('#info-dialog').showModal();$('#data-status').onclick=()=>$('#data-dialog').showModal();document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#time').oninput=e=>{liveFollowing=false;setTime(e.target.value);};$('#now').onclick=()=>{timePlaying=false;$('#play-time').textContent='▷';$('#play-time').setAttribute('aria-label','播放海島光影');liveFollowing=false;setTime(10.5);};
$('#play-time').onclick=()=>{liveFollowing=false;timePlaying=!timePlaying;$('#play-time').textContent=timePlaying?'Ⅱ':'▷';$('#play-time').setAttribute('aria-label',timePlaying?'暫停光影播放':'播放海島光影');};

// All models are native geometry: islands remain truly selectable and rotatable.
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xdeeadf,55,110);
const camera=new THREE.PerspectiveCamera(35,1,.1,180);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{ $('#loading').innerHTML='此裝置無法顯示 3D 地圖<span>仍可使用右側清單探索所有行程</span>';renderList();throw new Error('WebGL unavailable; accessible itinerary list remains available.'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;$('#scene').appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.maxPolarAngle=Math.PI*.43;controls.minPolarAngle=.12;controls.minDistance=10;controls.maxDistance=80;controls.enablePan=false;controls.rotateSpeed=.55;controls.zoomSpeed=.8;
let cameraGoal=null;controls.addEventListener('start',()=>cameraGoal=null);
const ambient=new THREE.HemisphereLight(0xfffaf0,0x85aa9b,2.2);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xfff6dc,3);sun.position.set(-15,35,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:.5,far:90});sun.shadow.bias=-.0006;sun.shadow.normalBias=.05;sun.shadow.radius=4;scene.add(sun);
const matCache=new Map();function mat(c){if(!matCache.has(c))matCache.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.94}));return matCache.get(c);}
function mesh(g,c,parent,x=0,y=0,z=0){const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,x,y,z,w,h,d,c){return mesh(new THREE.BoxGeometry(w,h,d),c,p,x,y,z);}
function cyl(p,x,y,z,r,h,c,n=12,rt=r){return mesh(new THREE.CylinderGeometry(rt,r,h,n),c,p,x,y,z);}
function ball(p,x,y,z,r,c,s=1){const m=mesh(new THREE.SphereGeometry(r,9,7),c,p,x,y,z);m.scale.y=s;return m;}
const water=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshStandardMaterial({color:0xa7cfc6,roughness:.8,metalness:.02}));water.rotation.x=-Math.PI/2;water.position.y=-.34;water.receiveShadow=true;scene.add(water);
let seed=5821;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const tileById=new Map(),islands=[],windRotors=[],people=[],boats=[],waterLines=[];
function hex(id,x,z,color=0xa5b88b,r=2.17){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);cyl(g,0,0,0,r,.95,0xdbc9a3,6);cyl(g,0,.45,0,r*.995,.2,color,6);cyl(g,0,-.34,0,r*1.025,.16,0xb5aa8b,6);g.userData={id};islands.push(g);if(id)tileById.set(id,g);return g;}
function tree(p,x,z,s=1){cyl(p,x,.85*s,z,.055*s,.65*s,0x8b8060,6);ball(p,x,1.28*s,z,.3*s,0x789b77,1.12);ball(p,x+.14*s,1.3*s,z,.22*s,0x8ba77c);}
function palm(p,x,z,s=1){const trunk=cyl(p,x,1.05*s,z,.06*s,1.02*s,0xb8a078,7,.04*s);trunk.rotation.z=.13;for(let j=0;j<6;j++){const leaf=new THREE.Group();leaf.position.set(x,1.59*s,z);leaf.rotation.y=j*Math.PI/3;const l=ball(leaf,.28*s,0,0,.25*s,0x769b74,.2);l.scale.x=2;leaf.rotation.z=-.15;p.add(leaf);}}
function house(p,x,z,s=1,color=0xf0e9cf,angle=0){const g=new THREE.Group();g.position.set(x,.55,z);g.rotation.y=angle;p.add(g);box(g,0,.34*s,0,.76*s,.68*s,.62*s,color);const roof=mesh(new THREE.CylinderGeometry(.65*s,.65*s,.82*s,3),0xca795d,g,0,.85*s,0);roof.rotation.z=Math.PI/2;roof.rotation.y=Math.PI/2;box(g,.18*s,.25*s,.316*s,.13*s,.22*s,.018,0x83aaa1);box(g,-.13*s,.22*s,.32*s,.14*s,.42*s,.018,0x938873);box(g,.385*s,.32*s,0,.02,.18*s,.2*s,0x92b0a7);}
function person(p,x,z,color=0xd58260){const g=new THREE.Group();g.position.set(x,.57,z);p.add(g);cyl(g,0,.16,0,.065,.22,color,7);ball(g,0,.34,0,.075,0xe5c5a0);box(g,-.03,.03,0,.04,.13,.05,0x566e70);box(g,.03,.03,0,.04,.13,.05,0x566e70);people.push({g,x,z,phase:rand()*7});return g;}
function path(p,x,z,w,d,angle=0){const b=box(p,x,.565,z,w,.025,d,0xe6d9b4);b.rotation.y=angle;return b;}
function rocks(p,x,z,n=4){for(let i=0;i<n;i++){const r=ball(p,x+(rand()-.5)*.9,.7+rand()*.12,z+(rand()-.5)*.8,.18+rand()*.18,0x969f8e,.8);r.rotation.y=rand()*6;}}
function fence(p,x,z,n=5){for(let i=0;i<n;i++){box(p,x+i*.22,.78,z,.04,.4,.04,0xe9e3cc);}box(p,x+(n-1)*.11,.85,z,(n-1)*.22,.04,.05,0xe9e3cc);}
function town(p){path(p,0,0,3.3,.38);path(p,-.2,.3,.38,2.8);house(p,-1,-.6,.85);house(p,.2,-.65,1);house(p,1,-.55,.7,0xf2ddbd);house(p,-1,.8,.8,0xe0d8ba,Math.PI);house(p,.65,.8,.8,0xf1e7ce,Math.PI);tree(p,-1.4,.2);tree(p,1.3,.7,.8);person(p,-.2,.2);person(p,.3,.1,0x8ea3a3);person(p,-.7,-.02,0xe1b665);fence(p,-1,-1.4,7);}
function harbor(p){path(p,0,0,3.4,.4);house(p,-.8,-.6,.85,0xf1ebd5);house(p,.15,-.6,.65,0xe8dab7);box(p,.4,.65,1.35,2.7,.2,.6,0xd9c5a0);for(let i=0;i<6;i++)box(p,-.8+i*.43,.87,1.63,.06,.4,.06,0x92927b);box(p,1,.65,-.3,.35,.4,.5,0xe8aa75);box(p,1.4,.7,-.5,.35,.5,.48,0xa8bcb2);tree(p,-1.45,.5,.85);person(p,.1,.4);person(p,.6,.3,0x718a9a);}
function lighthouse(p){cyl(p,.25,1.3,0,.34,1.5,0xf4efda,16,.25);cyl(p,.25,1.2,0,.32,.18,0xcb795c,16);cyl(p,.25,2.15,0,.35,.17,0xf0e8ce);cyl(p,.25,2.3,0,.23,.2,0x7eaaa6);cyl(p,.25,2.47,0,.38,.14,0xc97859,12,.02);path(p,-.3,1,.4,1.1,-.2);house(p,-.75,-.4,.6);rocks(p,1,.5);tree(p,-1,1,.7);person(p,-.2,1.2);}
function beach(p){const b=cyl(p,.3,.57,.4,1.3,.055,0xf1dfb6,40);b.scale.z=.75;palm(p,-1,-.5);palm(p,1,-.9,.8);for(let i=0;i<3;i++){const x=-.4+i*.65,z=.45+(i%2)*.5;cyl(p,x,.95,z,.025,.7,0xd9c9a5,6);cyl(p,x,1.32,z,.38,.18,i%2?0xd69c73:0xf2edda,10,.02);box(p,x,.62,z+.3,.32,.07,.55,0xe8e1c9);}person(p,.3,-.3,0xd5a558);rocks(p,-1.2,.7,3);}
function turtle(p){house(p,-.65,-.3,.8,0xd9d4b6);house(p,.35,-.65,.75,0xe4d9b9);path(p,0,.3,2.8,.3);palm(p,-1.2,.8,.8);tree(p,1,-.2,.8);cyl(p,.6,.58,.9,.6,.05,0xe9dbb3,24);const shell=ball(p,.7,.73,.9,.26,0x6c967b,.65);shell.scale.z=1.2;ball(p,.7,.68,1.22,.09,0x89a587);for(const dx of [-.23,.23])for(const dz of [-.15,.15]){const fl=ball(p,.7+dx,.64,.9+dz,.09,0x89a587,.25);fl.scale.x=1.8;}person(p,-.2,.6);person(p,.3,.4,0x769ca0);}
function heart(p){const points=[];for(let a=0;a<=Math.PI*2;a+=.06){const x=.065*16*Math.sin(a)**3,z=-.065*(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a));points.push(new THREE.Vector3(x,.64,z));}for(const dx of [-.43,.43]){const geo=new THREE.BufferGeometry().setFromPoints(points.map(v=>v.clone().multiplyScalar(.62).add(new THREE.Vector3(dx,.25,0))));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x8e9e8c}));p.add(line);}cyl(p,0,.57,.1,1.55,.05,0xb5d2bf,32);house(p,-.85,-1,.55);tree(p,.95,-.9,.8);person(p,0,1.2);}
function windmill(p){for(const x of [-.8,.8]){cyl(p,x,1.45,0,.09,1.8,0xf1ecda,10,.05);const rotor=new THREE.Group();rotor.position.set(x,2.35,.08);p.add(rotor);for(let i=0;i<3;i++){const blade=box(rotor,0,.35,0,.09,.8,.035,0xeee9d7);const pivot=new THREE.Group();pivot.rotation.z=i*Math.PI*2/3;rotor.remove(blade);pivot.add(blade);rotor.add(pivot);}ball(rotor,0,0,.05,.1,0xe5dbc1);windRotors.push(rotor);}path(p,0,.8,3,.3);tree(p,-1.2,-.8,.65);rocks(p,.9,1);}
function columns(p){for(let i=0;i<10;i++){const x=-.95+(i%5)*.39,z=-.4+Math.floor(i/5)*.4,h=.5+rand()*.95;cyl(p,x,.55+h/2,z,.25,h,0x8e9788,6);}path(p,0,1.1,2.9,.3);person(p,-.2,1.1);tree(p,-1.3,.2,.6);}
function temple(p){box(p,0,1,0,1.5,.9,1,0xe0cdb0);for(const y of [1.5,1.85]){const roof=cyl(p,0,y,0,1.18,.32,0xba7058,4,.2);roof.rotation.y=Math.PI/4;}for(const x of [-.6,.6])cyl(p,x,1.1,.65,.045,.9,0xca7759,8);path(p,0,1,.8,1);tree(p,-1.25,-.6);tree(p,1.2,.3,.8);person(p,.15,1.2);}
const builders={town,harbor,turtle,beach,heart};
for(const t of trips){const p=hex(t.id,t.x,t.z,t.icon==='beach'?0xc4cba0:0xacbd91);builders[t.icon](p);}
const extras=[['xiyu',-5.85,-2.3,lighthouse],['wind',-5.85,-5.6,windmill],['baisha',-1.95,-5.6,town],['bridge',-1.95,-2.3,columns],['huxi',1.95,-2.3,temple],['airport',5.85,1.05,windmill],['park',1.95,-5.6,beach],['east2',9.75,1.05,rocks],['south',0,5.4,lighthouse]];
extras.forEach(([id,x,z,build])=>{const p=hex(id,x,z,0xaabc90,id==='east2'?1.75:2.17);if(build===rocks){rocks(p,0,0,9);palm(p,-.7,-.5,.7);}else build(p);});
// Smaller quiet islets around the town.
for(const [x,z,s] of [[-10,-.4,.65],[-9,-8,.45],[6,-8,.6],[12,6,.65],[-7,8,.55],[-6,13,.4],[8,11,.5]]){const p=hex(null,x,z,0xaabb8c,s);if(s>.5)rocks(p,0,0,3);}
// A cream footbridge joins two central hexagons.
for(const x of [-1.95,1.95]){box(scene,x,.58,-.65,.5,.16,1.5,0xe8dfc3);for(const dx of [-.26,.26]){box(scene,x+dx,.84,-.65,.035,.04,1.5,0xece4d0);for(let z=-1.2;z<.1;z+=.35)box(scene,x+dx,.7,z,.035,.3,.035,0xece4d0);}}
const routeGroup=new THREE.Group();scene.add(routeGroup);
function boatModel(color=0xf3ead1){const g=new THREE.Group();const hull=box(g,0,0,0,.27,.15,.66,color);hull.geometry=new THREE.CylinderGeometry(.19,.12,.65,4,1);hull.rotation.x=Math.PI/2;hull.rotation.z=Math.PI/4;box(g,0,.16,0,.21,.18,.28,0xf7f1d7);box(g,0,.23,-.05,.22,.05,.34,0xd38965);return g;}
const connections=[['inland','wang'],['inland','east'],['magong','north'],['wang','qimei']];
for(const [a,b]of connections){const ta=trips.find(t=>t.id===a),tb=trips.find(t=>t.id===b),start=new THREE.Vector3(ta.x+1.5,-.1,ta.z+1),end=new THREE.Vector3(tb.x+1.5,-.1,tb.z+1),mid=start.clone().lerp(end,.5);mid.x+=2.6;const curve=new THREE.QuadraticBezierCurve3(start,mid,end);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),new THREE.LineDashedMaterial({color:0xf9f2d7,dashSize:.16,gapSize:.16,transparent:true,opacity:.85}));line.computeLineDistances();routeGroup.add(line);const boat=boatModel();scene.add(boat);boats.push({boat,curve,phase:rand(),ids:[a,b]});}
// Delicate rings on the sea keep the scene tactile without a moving background.
for(let i=0;i<55;i++){const x=(rand()-.5)*37,z=(rand()-.5)*35;if(Math.abs(x)<6&&Math.abs(z)<8)continue;const pts=[];for(let j=0;j<12;j++)pts.push(new THREE.Vector3(x+j*.07,-.26,z+Math.sin(j*.42)*.03));const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xd1e4d8,transparent:true,opacity:.6}));scene.add(l);waterLines.push(l);}
for(const t of trips){const b=document.createElement('button');b.className='island-label';b.dataset.id=t.id;b.setAttribute('aria-label',`探索${t.name}`);b.innerHTML=`<i class="dot green"></i>${escapeHTML(t.name.split('・')[0])}<small>0${trips.indexOf(t)+1}</small>`;b.onclick=()=>selectIsland(t.id);$('#labels').append(b);}
const labelEls=[...document.querySelectorAll('.island-label')];
function homePosition(){const aspect=$('#scene').clientWidth/$('#scene').clientHeight;const k=aspect<.85?1.55:aspect<1.2?1.3:1.12;return new THREE.Vector3(21*k,27*k,33*k);}
function home(){selected=null;$('#detail').hidden=true;renderList();bird=false;$('#bird').classList.remove('active');$('#bird').setAttribute('aria-pressed','false');cameraGoal={target:new THREE.Vector3(1,0,1),position:homePosition()};}
function resize(){const el=$('#scene');camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix();renderer.setSize(el.clientWidth,el.clientHeight);if(!selected){camera.position.copy(homePosition());controls.target.set(1,0,1);controls.update();}}
new ResizeObserver(resize).observe($('#scene'));resize();
$('#home').onclick=home;$('#zoom-in').onclick=()=>{cameraGoal={target:controls.target.clone(),position:camera.position.clone().sub(controls.target).multiplyScalar(.8).add(controls.target)};};$('#zoom-out').onclick=()=>{cameraGoal={target:controls.target.clone(),position:camera.position.clone().sub(controls.target).multiplyScalar(1.2).add(controls.target)};};
function toggleButton(id,on){$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',on);}
$('#labels-toggle').onclick=()=>{labelsOn=!labelsOn;$('#labels').hidden=!labelsOn;toggleButton('#labels-toggle',labelsOn);};$('#routes-toggle').onclick=()=>{routesOn=!routesOn;routeGroup.visible=routesOn;toggleButton('#routes-toggle',routesOn);};
$('#bird').onclick=()=>{bird=!bird;toggleButton('#bird',bird);cameraGoal={target:controls.target.clone(),position:controls.target.clone().add(bird?new THREE.Vector3(.1,43,.1):new THREE.Vector3(21,27,33))};};
$('#pause').onclick=()=>{paused=!paused;toggleButton('#pause',paused);$('#pause').innerHTML=paused?'▷ <span>繼續</span>':'Ⅱ <span>暫停</span>';};toggleButton('#pause',paused);
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=null;
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(islands,true);if(hits.length){let o=hits[0].object;while(o.parent&&!o.userData.id)o=o.parent;if(trips.some(t=>t.id===o.userData.id))selectIsland(o.userData.id);}});
let last=performance.now(),elapsed=0,timeAccumulator=0;
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.08);last=now;if(!paused)elapsed+=dt;if(cameraGoal){camera.position.lerp(cameraGoal.position,.065);controls.target.lerp(cameraGoal.target,.065);if(camera.position.distanceTo(cameraGoal.position)<.03)cameraGoal=null;}controls.update();
 for(const {g,x,z,phase}of people){g.position.x=x+Math.sin(elapsed*.55+phase)*.1;g.position.z=z+Math.cos(elapsed*.55+phase)*.12;g.rotation.y=elapsed*.1+phase;}
 for(const rotor of windRotors)rotor.rotation.z=-elapsed*.6;
 for(const {boat,curve,phase}of boats){const t=(elapsed*.018+phase)%1;boat.position.copy(curve.getPoint(t));boat.position.y=.05+Math.sin(elapsed*2+phase)*.035;const tan=curve.getTangent(t);boat.rotation.y=Math.atan2(tan.x,tan.z);}
 if(timePlaying){timeAccumulator+=dt;if(timeAccumulator>.4){timeAccumulator=0;setTime(hour>=22?6:hour+.25);}}
 for(const el of labelEls){const t=trips.find(t=>t.id===el.dataset.id),v=new THREE.Vector3(t.x,2.9,t.z).project(camera);el.style.left=`${(v.x*.5+.5)*$('#scene').clientWidth}px`;el.style.top=`${(-v.y*.5+.5)*$('#scene').clientHeight}px`;el.style.visibility=v.z>1||v.x>1||v.x<-1?'hidden':'visible';el.querySelector('i').className=`dot ${dotClass(t)}`;}
 renderer.render(scene,camera);
}
requestAnimationFrame(animate);$('#loading').hidden=true;renderList();

// Same-origin, session-authenticated planning aggregates. No demo fallback.
const taipeiDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateInput=$('#planner-date');dateInput.value=taipeiDate();
let requestNumber=0,pollAbort=null;
function showConnection(stale=false){$('#data-status span').textContent=stale?'資料暫停更新':hasData?'規畫器已連線':'連接規畫器';$('#data-status i').style.background=stale?'#d69b58':hasData?'#6e9c78':'#ca7250';$('#connection-label').textContent=stale?'連線中斷 · 保留最後快照':hasData?'規畫器匿名資料 · 每 30 秒更新':'等待規畫器資料';$('#last-update').textContent=hasData?new Date(state.updatedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}):'尚未取得資料';$('#data-description').textContent=stale?'連線暫時中斷，保留最後成功快照；畫面不代表最新紀錄。':'資料來自 penghu-planner。統計所選日期、狀態為「確認」的行程；預訂確認含行程、交通、住宿三項。只顯示匿名數字，不含個人身分或現場定位。';}
function validPlannerSnapshot(data){return data&&data.mode==='planner'&&data.date===dateInput.value&&Array.isArray(data.trips)&&data.trips.length===trips.length&&new Set(data.trips.map(t=>t.id)).size===trips.length&&data.trips.every(t=>baseline.has(t.id)&&['people','groups','confirmedChecks','totalChecks'].every(k=>Number.isSafeInteger(t[k])&&t[k]>=0))&&data.summary&&['people','groups','unmappedGroups','confirmedChecks','totalChecks','collaborationActions','collaboratingStaff'].every(k=>Number.isSafeInteger(data.summary[k])&&data.summary[k]>=0)&&Array.isArray(data.events)&&Number.isFinite(Date.parse(data.updatedAt))&&Math.abs(Date.now()-Date.parse(data.updatedAt))<180000;}
async function pollPlanner(reset=false){const n=++requestNumber;pollAbort?.abort();const controller=new AbortController();pollAbort=controller;const timeout=setTimeout(()=>controller.abort(),10000);if(reset){hasData=false;selected=null;$('#detail').hidden=true;renderList();$('#collaboration').textContent='最近 24 小時協作：等待資料';$('#planner-scope').textContent='正在取得所選日期資料…';showConnection();}
 try{const r=await fetch('/api/islands/summary?date='+encodeURIComponent(dateInput.value),{credentials:'same-origin',cache:'no-store',signal:pollAbort.signal});if(r.status===401){location.href='/login';return;}if(!r.ok)throw new Error('Summary unavailable');const data=await r.json();if(n!==requestNumber)return;if(!validPlannerSnapshot(data))throw new Error('Invalid planning snapshot');state=data;hasData=true;for(const t of trips)Object.assign(t,data.trips.find(v=>v.id===t.id));$('#planner-scope').textContent=data.summary.unmappedGroups?`另有 ${data.summary.unmappedGroups} 筆確認行程未設定可辨識景點，尚未歸島。總人數不重複加總；非現場人數。`:'總人數不重複加總；跨島行程可出現在多座島。非現場人數。';$('#collaboration').textContent=`最近 24 小時協作：${data.summary.collaboratingStaff} 位人員 · ${data.summary.collaborationActions} 次操作`;showConnection();renderList();}
 catch(e){if(n!==requestNumber)return;showConnection(true);if(!hasData){$('#trip-list').innerHTML='<div class="empty">暫時無法取得行程資料。<br>請稍後重試，或回到報價清單查看。</div>';$('#planner-scope').textContent='資料尚未取得，畫面沒有以示範數字替代。';}}
 finally{clearTimeout(timeout);}}
dateInput.onchange=()=>{if(!dateInput.value)dateInput.value=taipeiDate();pollPlanner(true);};
pollPlanner();setInterval(()=>{if(!document.hidden)pollPlanner();},30000);

