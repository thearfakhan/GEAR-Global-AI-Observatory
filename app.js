const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const labels = {overview:'AI capability overview',compute:'Compute',research:'Research',chips:'Chips & hardware',investment:'Public investment',programs:'National programs'};
let db = {}, sources = [], status = {};
let selected = 'China', layer = 'overview';
let globe = {rotation:[-85,-15,0],scale:286,projection:null,path:null,d3:null,landPath:null,landG:null,markerG:null,auto:false,raf:null,startPt:null,startRot:null};

async function loadData(){
  const [c,s,st] = await Promise.all([
    fetch('./data/countries.json').then(r=>r.json()),
    fetch('./data/sources.json').then(r=>r.json()),
    fetch('./data/ingestion_status.json').then(r=>r.json()).catch(()=>({last_run:null,sources:[]}))
  ]);
  db=c;sources=s;status=st;
}

function sourceForCountry(name){const id=db[name].source_id;return sources.find(s=>s.id===id)||{};}
function renderCountry(name){
  if(!db[name]) return; selected=name;
  const d=db[name], m=d[layer], src=sourceForCountry(name);
  $('#country-name').textContent=name; $('#country-code').textContent=d.code; $('#country-select').value=name;
  $('#primary-card').innerHTML=`<small>${labels[layer]}</small><div class="big">${m.value}</div><p>${m.label}</p><small>${m.note}</small>`;
  $('#metric-list').innerHTML=['compute','research','chips','investment','programs'].map(k=>`<button class="metric-row" data-metric="${k}"><div><span>${labels[k]}</span><b>${d[k].value}</b></div><p>${d[k].label}</p></button>`).join('');
  $$('[data-metric]').forEach(b=>b.addEventListener('click',()=>setLayer(b.dataset.metric)));
  $('#source-card').textContent=`${src.publisher||'Official source'} · ${src.url||''}`;
  $('#dossier-title').textContent=name; $('#dossier-summary').textContent=d.summary;
  $('#dossier-tags').innerHTML=['Compute','Research','Hardware','Investment','Programs'].map(t=>`<span>${t}</span>`).join('');
  $('#ledger').innerHTML=[
    ['Publisher',src.publisher||'—'],['Source URL',src.url||'—'],['Refresh policy',src.refresh||'—'],['Example observation',d[layer].value+' · '+d[layer].label],['Versioning','New releases create new observations; old values remain in git history.']
  ].map(([a,b])=>`<div class="ledger-row"><span>${a}</span><b>${b}</b></div>`).join('');
  updateGlobe(); renderCompare();
}
function setLayer(k){layer=k;$('#layer-label').textContent=labels[k];$$('.layer').forEach(b=>b.classList.toggle('active',b.dataset.layer===k));renderCountry(selected);}

function setupUI(){
  const names=Object.keys(db);
  $('#country-select').innerHTML=names.map(n=>`<option>${n}</option>`).join('');
  $('#country-select').value=selected; $('#country-select').addEventListener('change',e=>renderCountry(e.target.value));
  $$('.layer').forEach(b=>b.addEventListener('click',()=>setLayer(b.dataset.layer)));
  $$('.nav').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.page;$$('.page').forEach(p=>p.hidden=p.id!==`page-${id}`);$$('.nav').forEach(n=>n.classList.toggle('active',n===b));}));
  $('#compare-a').innerHTML=names.map(n=>`<option>${n}</option>`).join(''); $('#compare-b').innerHTML=names.map(n=>`<option>${n}</option>`).join('');
  $('#compare-a').value='United States'; $('#compare-b').value='China';
  ['#compare-a','#compare-b','#compare-layer'].forEach(s=>$(s).addEventListener('change',renderCompare));
  $('#source-registry').innerHTML=sources.filter(s=>s.parser).map(s=>{const st=(status.sources||[]).find(x=>x.id===s.id);return `<div class="source-row"><div><strong>${new URL(s.url).hostname}</strong><small>${s.country} · ${s.publisher}</small></div><div><em>${st?.ok===true?'CHECKED':st?.ok===false?'CHECK FAILED':'ALLOWLISTED'}</em><small>${s.refresh}</small></div></div>`}).join('');
  $('#learning-pipeline').innerHTML=[['1','Verified corpus','Only accepted source records'],['2','Dataset builder','Country · metric · number · unit · period · evidence'],['3','Candidate retraining','Scheduled when enough new verified data accumulates'],['4','Held-out evaluation','Precision · recall · F1 · numeric extraction · date accuracy'],['5','Drift checks','Compare candidate behavior with production baseline'],['6','Promotion gate','Deploy only after acceptance; retain rollback']].map(x=>`<div class="learning-row"><i>${x[0]}</i><div><b>${x[1]}</b><span>${x[2]}</span></div></div>`).join('');
  setupTraining();
}
function renderCompare(){if(!Object.keys(db).length)return;const a=$('#compare-a').value,b=$('#compare-b').value,k=$('#compare-layer').value;$('#compare-grid').innerHTML=[[a,db[a]],[b,db[b]]].map(([name,d])=>`<div class="panel compare-card"><h3>${name}</h3><div class="big">${d[k].value}</div><strong>${d[k].label}</strong><p>${d[k].note}</p><p>${sourceForCountry(name).publisher||''}</p></div>`).join('');}
function setupTraining(){const btn=$('#train'),bar=$('#progress'),st=$('#train-status');btn.addEventListener('click',()=>{btn.disabled=true;let p=0;st.textContent='Building candidate dataset from accepted records…';const t=setInterval(()=>{p+=10;bar.style.width=p+'%';if(p===30)st.textContent='Validating units and observation dates…';if(p===50)st.textContent='Training candidate extractor…';if(p===70)st.textContent='Running held-out evaluation…';if(p===90)st.textContent='Checking regressions and drift…';if(p>=100){clearInterval(t);st.innerHTML='<span class="yellow-text"><b>Candidate finished.</b></span> Promotion remains gated by evaluation.';btn.disabled=false;setTimeout(()=>bar.style.width='0%',1500);}},160);});}

async function setupGlobe(){
  try{
    const [d3,topo,worldMod]=await Promise.all([
      import('https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm'),
      import('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm'),
      import('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json/+esm')
    ]);
    globe.d3=d3; const world=worldMod.default; const land=topo.feature(world,world.objects.land);
    const svg=d3.select('#world-svg'); globe.landG=svg.select('#land-layer'); globe.markerG=svg.select('#markers'); $('#loading')?.remove();
    globe.projection=d3.geoOrthographic().translate([350,350]).scale(globe.scale).rotate(globe.rotation).clipAngle(90); globe.path=d3.geoPath(globe.projection);
    globe.landPath=globe.landG.append('path').datum(land).attr('fill','rgba(255,255,255,.035)').attr('stroke','rgba(255,255,255,.36)').attr('stroke-width',.7);
    globe.landG.append('path').datum(d3.geoGraticule10()).attr('class','graticule').attr('fill','none').attr('stroke','rgba(255,255,255,.13)').attr('stroke-width',.5);
    const drag=d3.drag().on('start',e=>{stopAuto();globe.startPt=[e.x,e.y];globe.startRot=globe.rotation.slice();}).on('drag',e=>{globe.rotation=[globe.startRot[0]+(e.x-globe.startPt[0])*.34,Math.max(-72,Math.min(72,globe.startRot[1]-(e.y-globe.startPt[1])*.34)),0];updateGlobe();});
    svg.call(drag); $('#world-svg').addEventListener('wheel',e=>{e.preventDefault();globe.scale=Math.max(220,Math.min(355,globe.scale+(e.deltaY<0?14:-14)));updateGlobe();},{passive:false});
    $('#zin').onclick=()=>{globe.scale=Math.min(355,globe.scale+18);updateGlobe()}; $('#zout').onclick=()=>{globe.scale=Math.max(220,globe.scale-18);updateGlobe()}; $('#home').onclick=()=>{stopAuto();globe.scale=286;globe.rotation=[-85,-15,0];updateGlobe()}; $('#auto').onclick=()=>globe.auto?stopAuto():startAuto();
    updateGlobe();
  }catch(err){const l=$('#loading');if(l)l.textContent='Interactive globe unavailable. Country profiles remain usable.';console.error(err)}
}
function front(coord){return globe.d3.geoDistance(coord,[-globe.rotation[0],-globe.rotation[1]])<Math.PI/2}
function updateGlobe(){if(!globe.projection)return;globe.projection.scale(globe.scale).rotate(globe.rotation);globe.landPath.attr('d',globe.path);globe.landG.select('.graticule').attr('d',globe.path);const rows=Object.entries(db);const gs=globe.markerG.selectAll('g.marker').data(rows,d=>d[0]).join(enter=>{const g=enter.append('g').attr('class','marker').style('cursor','pointer');g.append('circle').attr('r',14).attr('fill','none').attr('stroke','#f5c84b').attr('stroke-opacity',.38);g.append('circle').attr('r',6).attr('fill','#f5c84b').attr('stroke','#fff').attr('stroke-width',1.2);g.append('text').attr('x',12).attr('y',4).attr('font-size',10).attr('font-weight',650).attr('fill','#fff');return g});gs.each(function(d){const p=globe.projection(d[1].coord),v=front(d[1].coord),g=globe.d3.select(this);g.attr('display',v?'':'none').attr('transform',p?`translate(${p[0]},${p[1]})`:null);g.select('text').text(d[0]);g.selectAll('circle').attr('stroke-width',d[0]===selected?2:1.2);}).on('click',(e,d)=>renderCountry(d[0])).on('mouseenter',(e,d)=>{const m=d[1][layer],box=$('#earth-box').getBoundingClientRect(),tip=$('#tip');tip.innerHTML=`<b>${d[0]}</b><div class="yellow-text" style="margin-top:5px;font-weight:800">${m.value}</div><div style="margin-top:4px">${m.label}</div>`;tip.hidden=false;tip.style.left=Math.max(8,Math.min(e.clientX-box.left+12,box.width-270))+'px';tip.style.top=Math.max(8,e.clientY-box.top+12)+'px';}).on('mouseleave',()=>$('#tip').hidden=true);$('#earth-photo').style.transform=`scale(${Math.max(.87,Math.min(1.12,globe.scale/286))}) rotate(${globe.rotation[0]*.03}deg)`;}
function tick(){if(!globe.auto)return;globe.rotation[0]+=.2;updateGlobe();globe.raf=requestAnimationFrame(tick)}
function startAuto(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;globe.auto=true;$('#auto').textContent='Pause';globe.raf=requestAnimationFrame(tick)}
function stopAuto(){globe.auto=false;if(globe.raf)cancelAnimationFrame(globe.raf);globe.raf=null;$('#auto').textContent='Auto rotate'}

await loadData();setupUI();renderCountry(selected);renderCompare();await setupGlobe();
