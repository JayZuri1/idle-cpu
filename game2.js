const fm=n=>{const a=Math.abs(n);return (n<0?'-':'')+(a<100?a.toFixed(1):fmt(a))};
const fmt=n=>n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e4?(n/1e3).toFixed(1)+'K':Math.floor(n).toLocaleString();

function tick(dt){
 // demand grows on its own
 S.demand=Math.min(S.demand*(1+.004*dt)+.25*dt*tm(),maxUsers()*1.3+5);
 mkT+=dt;
 if(mkT>=2){mkT=0;for(const k in U){let m=S.mk[k]||1;m+=(1-m)*.04+(Math.random()-.5)*.1;m=Math.max(.6,Math.min(1.8,m));S.mk[k]=m;(MH[k]=MH[k]||[]).push(m);if(MH[k].length>14)MH[k].shift()}}
 S.mkEv-=dt;
 if(S.mkEv<=0){S.mkEv=50+Math.random()*70;const ks=Object.keys(U),k=ks[Math.floor(Math.random()*ks.length)],up=Math.random()<.6;S.mk[k]=Math.max(.6,Math.min(1.8,(S.mk[k]||1)*(up?1.4:.6)));newsMsg=up?U[k].n+' shortage! Prices are surging.':U[k].n+' is on clearance. Prices dropped.'}
 S.nextEv-=dt;
 if(S.ev){S.evT-=dt;if(S.evT<=0)S.ev=''}
 else if(S.nextEv<=0){S.nextEv=90+Math.random()*120;const sp=Math.random()<.5;S.ev=sp?'spike':'ddos';S.evT=sp?15:20;sfx.alarm()}
 const s=served();
 S.cash=Math.max(0,S.cash+income()*dt);
 if(auto){autoT+=dt;while(autoT>=.5){autoT-=.5;S.cash+=1+L.clock*.5+served()*.02}}
 // data
 S.data=Math.min(diskCap(),S.data+s*.004*dt);
 const full=diskFull();if(full&&!wasFull)sfx.full();wasFull=full;
 // heat: target depends on load, clock, cooling
 const target=28+85*load()*(1+.1*L.clock)*(1+.1*S.tier)*(1-.06*L.lb)/(1+.6*L.cool);
 S.temp+=(target-S.temp)*Math.min(1,.15*dt);
 if(!S.throttle&&S.temp>=95){S.throttle=true;lastAlarm=0;sfx.alarm()}
 if(S.throttle){lastAlarm+=dt;if(lastAlarm>2){lastAlarm=0;sfx.alarm()}}
 if(S.throttle&&S.temp<=70)S.throttle=false;
 if(S.purgeCd>0)S.purgeCd=Math.max(0,S.purgeCd-dt);
}

function build(){
 $('ups').innerHTML=Object.keys(U).map(k=>`<div class="up"><div class="n">${U[k].n} <span id="l_${k}" style="color:var(--mute);font-weight:400"></span><span class="mk" id="m_${k}"></span></div><div class="d" id="d_${k}"></div><button data-k="${k}" id="b_${k}"></button></div>`).join('');
 $('ups').onclick=e=>{const k=e.target.dataset&&e.target.dataset.k;if(k)buy(k)};
}
function buy(k){
 const c=cost(k);if(S.cash<c||S.lv[k]>=U[k].max)return;
 S.cash-=c;S.lv[k]++;sfx.buy();flash(k);
}
let auto=true,autoT=0,mkT=0,newsMsg='',MH={},rackPrevN=0;
$('click').onclick=()=>{auto=!auto;$('click').textContent='Auto-handle: '+(auto?'On':'Off');sfx.click()};
$('purge').onclick=()=>{if(S.purgeCd>0)return;S.data*=.6;S.purgeCd=20;sfx.purge()};
$('reset').onclick=()=>{if(confirm('Erase all progress?')){try{localStorage.removeItem(KEY)}catch(e){}S=fresh();location.reload()}};

function bar(id,pct,color){const f=$(id);f.style.width=Math.min(100,pct)+'%';f.style.background=color||''}
function render(){
 $('cash').textContent='$'+fmt(S.cash);
 $('rate').textContent='$'+fm(income())+'/s';
 $('demand').textContent='Demand: '+fmt(S.demand)+' users';
 const s=served(),m=maxUsers();
 $('uT').textContent=fmt(s)+' / '+fmt(m);bar('uB',s/m*100);
 const hot=S.temp>=95||S.throttle?'var(--hot)':S.temp>75?'var(--cu)':'var(--cool)';
 $('hT').textContent=Math.round(S.temp)+'°C';bar('hB',(S.temp-25)/80*100,hot);
 const ramUse=Math.min(100,s/ramCap()*100);
 $('rT').textContent=fm(s/(8*tm()))+' / '+(2+L.ram*4)+' GB';bar('rB',ramUse,ramUse>95?'var(--cu)':'');
 $('sT').textContent=fm(S.data)+' / '+fmt(diskCap())+' GB';bar('sB',S.data/diskCap()*100,diskFull()?'var(--hot)':S.data/diskCap()>.8?'var(--cu)':'');
 $('temp').textContent=Math.round(S.temp)+'°';
 $('clock').textContent=(2+L.clock*.3).toFixed(1)+' GHz · '+(1+L.cores)+'c';
 $('chip').className='chip '+(S.throttle?'hot':S.temp>75?'warm':'');
 const st=$('status');
 if(S.throttle){st.textContent='CPU is throttling! Capacity and income are halved. Buy cooling or wait to cool below 70°.';st.style.color='var(--hot)'}
 else if(brown()){st.textContent='Brownout! Power draw exceeds your PSU. Capacity cut by 40%.';st.style.color='var(--hot)'}
 else if(diskFull()){st.textContent='Disk full — income cut by 70%. Purge logs or buy storage.';st.style.color='var(--hot)'}
 else if(S.demand>m){st.textContent=netCap()<Math.min(cpuCap(),ramCap())?'Max users reached: network bandwidth is the bottleneck.':ramCap()<cpuCap()?'Max users reached: RAM is the bottleneck.':'Max users reached: upgrade CPU or add a virtual server.';st.style.color='var(--cu)'}
 else{st.textContent='Running smoothly.';st.style.color='var(--ok)'}
 $('purge').textContent=S.purgeCd>0?'Purge logs ('+Math.ceil(S.purgeCd)+'s)':'Purge logs (−40%)';
 $('purge').disabled=S.purgeCd>0;
 for(const k in U){
  const maxed=L[k]>=U[k].max;
  $('l_'+k).textContent='Lv '+L[k];
  $('d_'+k).textContent=maxed?'Maxed out':U[k].d(L[k]);
  const b=$('b_'+k);b.textContent=maxed?'Max':'$'+fmt(cost(k));b.disabled=maxed||S.cash<cost(k);
 }
}
build();
$('net').innerHTML=Array.from({length:14},(_,i)=>`<i style="animation-delay:-${(i*.21).toFixed(2)}s"></i>`).join('');
$('mig').onclick=migrate;
let prevCores=0;
function cells(id,v,bad){const e=$(id);if(!e.children.length)e.innerHTML='<i></i>'.repeat(10);const n=Math.round(Math.min(1,v)*10);[...e.children].forEach((c,i)=>{c.className=i<n?'l'+(bad?' bad':''):''})}
function renderBoard(){
 const cores=Math.min(16,1+L.cores),g=$('grid'),ld=load(),t=Date.now()/600,key=cores+'|'+S.tier;
 if(g.dataset.k!==key){const grow=prevCores&&cores>prevCores&&g.dataset.t===''+S.tier;g.dataset.k=key;g.dataset.t=''+S.tier;
  let h='';for(let i=0;i<16;i++){const nw=grow&&i===cores-1;h+=i<cores?`<div class="core on${nw?' new':''}"><i></i>${nw?'<em>+1 CORE</em>':''}</div>`:i===cores?'<div class="core add">+</div>':'<div class="core"></div>'}
  g.innerHTML=h;prevCores=cores}
 g.querySelectorAll('.core.on i').forEach((x,i)=>x.style.width=Math.max(8,Math.min(100,ld*100*(.8+.2*Math.sin(t+i*1.3))))+'%');
 $('frame').className='frame'+(S.throttle?' hot':S.temp>75?' warm':'')+(S.ev==='ddos'?' ddos':'');
 $('nc').textContent=cores+' CORES';
 $('bill').textContent='$'+(.6*(S.throttle?.7:1)*(diskFull()?.5:1)).toFixed(2);
 const nd=$('nodes'),nn=Math.min(13,1+L.vms);
 if(nd.dataset.n!==''+nn){nd.dataset.n=''+nn;nd.innerHTML='<i></i>'.repeat(nn)}
 const fa=$('fans'),fn=1+Math.floor(L.cool/2);
 if(fa.dataset.n!==''+fn){fa.dataset.n=''+fn;fa.innerHTML='<i class="fan"></i>'.repeat(fn)}
 fa.style.setProperty('--fan',Math.max(.12,1.6-(S.temp-30)/45).toFixed(2)+'s');
 const po=$('ports'),pn=Math.min(12,4+L.net*2),nr=served()/netCap();
 if(po.dataset.n!==''+pn){po.dataset.n=''+pn;po.innerHTML='<i class="pt"></i>'.repeat(pn)}
 if((window._pf=(window._pf||0)+1)%4===0)po.querySelectorAll('.pt').forEach(p=>p.classList.toggle('on',Math.random()<nr*.8+.1));
 cells('ramc',served()/ramCap());cells('pwc',powerDraw()/psuCap(),brown());
 const wp=$('wp');if(wp.dataset.k!==''+L.clock){wp.dataset.k=''+L.clock;const k=2+Math.min(10,L.clock);let d='';for(let x=0;x<=140;x+=2)d+=(x?'L':'M')+x+','+(12+9*Math.sin(x/70*2*Math.PI*k)).toFixed(1);wp.setAttribute('d',d)}
 $('wave').style.setProperty('--ws',(2.4/(1+L.clock*.25)).toFixed(2)+'s');
}
const cv=$('cv'),cx=cv.getContext('2d'),PT=[];
function sizeCv(){const d=Math.min(2,window.devicePixelRatio||1);cv.width=cv.clientWidth*d;cv.height=cv.clientHeight*d;cx.setTransform(d,0,0,d,0,0)}
sizeCv();addEventListener('resize',sizeCv);
let lf=performance.now();
function loop(now){
 const dt=Math.min(.05,(now-lf)/1000);lf=now;
 const w=cv.clientWidth,h=cv.clientHeight;
 if(w){
  const dd=S.ev==='ddos',col=dd?'#ff5a3c':TCOL[S.tier],r=Math.min(1,served()/Math.max(1,maxUsers()));
  const dm=S.demand*(S.ev?2:1),ov=Math.max(0,1-maxUsers()/Math.max(1,dm));
  cx.clearRect(0,0,w,h);
  cx.strokeStyle='rgba(62,230,160,.35)';cx.setLineDash([4,4]);cx.lineWidth=1;cx.beginPath();
  cx.moveTo(w*.04,h);cx.lineTo(w*.38,h*.35);cx.lineTo(w*.38,0);cx.moveTo(w*.96,h);cx.lineTo(w*.62,h*.35);cx.lineTo(w*.62,0);cx.stroke();cx.setLineDash([]);
  cx.strokeStyle=col;cx.globalAlpha=.25+r*.5;cx.beginPath();cx.moveTo(w/2,h*.45);cx.lineTo(w/2,0);cx.stroke();
  cx.globalAlpha=.7;cx.strokeRect(w*.42,h*.5,w*.16,h*.5);
  for(let i=1;i<5;i++){cx.beginPath();cx.moveTo(w*.42,h*(.5+i*.1));cx.lineTo(w*.58,h*(.5+i*.1));cx.stroke()}
  cx.globalAlpha=1;
  if(Math.random()<(4+22*r+(S.ev?14:0))*dt&&PT.length<160)PT.push({x:w*(.08+Math.random()*.84),y:h,v:50+Math.random()*50,drop:Math.random()<ov*.8,bad:dd&&Math.random()<.7});
  for(let i=PT.length-1;i>=0;i--){const p=PT[i];
   p.y-=p.v*dt*(.6+r);
   const k=Math.max(0,Math.min(1,(h-p.y)/(h*.6)));p.x+=(w/2-p.x)*Math.min(1,dt*2.5*k);
   if(p.y<-4||(p.drop&&p.y<h*.4)){PT.splice(i,1);continue}
   cx.fillStyle=p.drop||p.bad?'#ff5a3c':col;cx.fillRect(p.x-1.5,p.y-1.5,3,3)}
 }
 requestAnimationFrame(loop)}
requestAnimationFrame(loop);

let last=performance.now(),saveT=0;
setInterval(()=>{
 const now=performance.now();const dt=Math.min(1,(now-last)/1000);last=now;
 tick(dt);render();renderRack();renderExtra();renderBoard();updateHum();
 saveT+=dt;if(saveT>3){saveT=0;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
},100);

