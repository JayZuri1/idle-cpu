
const KEY='idleServerV1';
const fresh=()=>({cash:0,demand:3,temp:30,data:0,throttle:false,purgeCd:0,
 tier:0,mk:{},mkEv:30,ev:'',evT:0,nextEv:40,
 lv:{cores:0,clock:0,vms:0,ram:0,disk:0,cool:0,psu:0,net:0,fw:0,lb:0}});
let S=fresh();
try{const r=localStorage.getItem(KEY);if(r){const o=JSON.parse(r);S=Object.assign(fresh(),o,{lv:Object.assign(fresh().lv,o.lv)})}}catch(e){}

const U={
 cores:{n:'CPU cores',base:50,g:1.5,max:15,d:l=>`${1+l} → ${2+l} cores · +10 user capacity each`},
 clock:{n:'Clock speed',base:80,g:1.7,max:20,d:l=>`${(2+l*.3).toFixed(1)} → ${(2.3+l*.3).toFixed(1)} GHz · +20% capacity, runs hotter`},
 vms:{n:'Cluster',base:300,g:2.2,max:12,d:l=>`${1+l} → ${2+l} VMs · +35% capacity each`},
 ram:{n:'RAM stick',base:40,g:1.45,max:40,d:l=>`${2+l*4} → ${6+l*4} GB · 8 users per GB`},
 disk:{n:'Storage drive',base:30,g:1.5,max:40,d:l=>`${20+l*40} → ${60+l*40} GB · users generate data`},
 cool:{n:'Cooling',base:100,g:2.3,max:6,d:l=>`${['Stock fan','Heatsink','Dual fans','Liquid loop','Big radiator','Chiller','Cryo'][l]} → ${['Heatsink','Dual fans','Liquid loop','Big radiator','Chiller','Cryo','Maxed'][l]}`},
 psu:{n:'Power supply',base:70,g:1.5,max:25,d:l=>`${(300+l*220)*tm()} → ${(520+l*220)*tm()} W · overdraw causes brownouts`},
 net:{n:'Network bandwidth',base:60,g:1.55,max:30,d:l=>`${(1+l)*14*tm()} → ${(2+l)*14*tm()} users of bandwidth`},
 fw:{n:'Firewall',base:150,g:1.9,max:5,d:l=>`Blocks DDoS junk · keeps ${Math.min(100,40+l*15)}% → ${Math.min(100,55+l*15)}% income in attacks`},
 lb:{n:'Load balancer',base:200,g:1.8,max:8,d:l=>`Spreads load · heat -${l*6}% → -${l*6+6}%`}
};
const cost=k=>Math.floor(U[k].base*Math.pow(U[k].g+.04,S.lv[k])*Math.pow(3,S.tier)*(S.mk[k]||1));
const L=S.lv;
const cpuCap=()=>Math.floor((1+L.cores)*10*(1+.2*L.clock)*(1+.35*L.vms)*tm()*(brown()?.6:1)*(S.throttle?.5:1));
const ramCap=()=>(2+L.ram*4)*8*tm();
const diskCap=()=>(20+L.disk*40)*tm();
const maxUsers=()=>Math.min(cpuCap(),ramCap(),netCap());
const served=()=>Math.floor(Math.min(S.demand*(S.ev==='spike'?2:S.ev==='ddos'?2:1),maxUsers()));
const load=()=>Math.min(1,served()/Math.max(1,Math.floor(cpuCap()/(S.throttle?.5:1))));
const diskFull=()=>S.data>=diskCap();
const income=()=>served()*.6*(S.throttle?.7:1)*(diskFull()?.5:1)*(S.ev==='ddos'?Math.min(1,.4+.15*L.fw):1)-powerDraw()*.002;

const $=id=>document.getElementById(id);
let AC=null,hum=null,humG=null,humF=null,snd=true,lastAlarm=0,wasFull=false,rackSig='';
function initAudio(){
 if(AC){if(AC.resume)AC.resume();return}
 try{AC=new (window.AudioContext||window.webkitAudioContext)();
 hum=AC.createOscillator();hum.type='sawtooth';hum.frequency.value=60;
 humF=AC.createBiquadFilter();humF.type='lowpass';humF.frequency.value=200;
 humG=AC.createGain();humG.gain.value=0;
 hum.connect(humF);humF.connect(humG);humG.connect(AC.destination);hum.start();}catch(e){AC=null}
}
function beep(f,d,type,v,f2){
 if(!AC||!snd)return;
 const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;
 o.type=type||'square';o.frequency.setValueAtTime(f,t);
 if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
 g.gain.setValueAtTime(v||.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
 o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d);
}
const sfx={click:()=>beep(900,.05,'square',.03,1400),
 buy:()=>{beep(520,.09,'triangle',.06);setTimeout(()=>beep(780,.14,'triangle',.06),80)},
 purge:()=>beep(400,.3,'sawtooth',.04,80),
 alarm:()=>{beep(880,.15,'square',.04);setTimeout(()=>beep(660,.15,'square',.04),180)},
 full:()=>beep(150,.4,'sawtooth',.05)};
function updateHum(){
 if(!AC||!humG)return;
 const t=AC.currentTime,h=Math.max(0,S.temp-30);
 humG.gain.setTargetAtTime(snd?.015+h/80*.03:0,t,.2);
 hum.frequency.setTargetAtTime(55+h*1.2,t,.3);
 humF.frequency.setTargetAtTime(160+h*6,t,.3);
}
document.addEventListener('pointerdown',initAudio);
$('snd').onclick=()=>{initAudio();snd=!snd;$('snd').textContent=snd?'🔊 Sound on':'🔇 Sound off';if(snd)sfx.click()};
const TIERS=['Home PC','Rack Server','Data Center','Hyperscale','Quantum Farm'],TC=[3000,40000,600000,8e6],TCOL=['#e39a54','#2fd0c0','#4a8cff','#b07bff','#ff5cd6'];
const tm=()=>Math.pow(5,S.tier);
const powerDraw=()=>(80+(1+L.cores)*35+L.clock*18+L.vms*25+L.ram*6+L.disk*4+L.cool*10+L.net*8)*tm();
const psuCap=()=>(300+L.psu*220)*tm();
const brown=()=>powerDraw()>psuCap();
const netCap=()=>Math.floor((1+L.net)*14*tm()*(S.ev==='ddos'?.5:1));
function migrate(){const c=TC[S.tier];if(S.tier>=4||S.cash<c)return;S.tier++;S.cash=0;S.demand=3*tm();S.temp=30;S.data=0;S.throttle=false;S.ev='';S.nextEv=60;for(const k in L)L[k]=0;sfx.buy();setTimeout(sfx.buy,200);toast('Migrated to '+TIERS[S.tier]+'!');$('frame').animate([{transform:'scale(1.3) rotate(8deg)'},{transform:'scale(1)'}],{duration:700,easing:'ease-out'})}
function renderExtra(){
 document.body.style.setProperty('--tc',TCOL[S.tier]);
 const m=maxUsers(),s=served(),r=Math.min(1,s/Math.max(1,m)),pw=powerDraw()/psuCap(),nr=s/netCap();
 $('pT').textContent=Math.round(powerDraw())+' / '+Math.round(psuCap())+' W';
 $('pB').style.width=Math.min(100,pw*100)+'%';$('pB').style.background=pw>1?'var(--hot)':pw>.85?'var(--cu)':'';
 $('nT').textContent=fmt(s)+' / '+fmt(netCap());$('nB').style.width=Math.min(100,nr*100)+'%';
 $('net').className='net'+(S.ev==='ddos'?' ddos':'');$('net').style.setProperty('--pk',(3-2.6*r).toFixed(2)+'s');
 [...$('net').children].forEach((d,i)=>d.style.display=i<Math.ceil(r*14)?'':'none');
 const e=$('ev');e.className='ev '+S.ev;e.style.display=S.ev?'block':'none';
 e.textContent=S.ev==='spike'?'Traffic spike! Demand is 2x for '+Math.ceil(S.evT)+'s.':S.ev==='ddos'?'DDoS attack! Junk traffic floods the network for '+Math.ceil(S.evT)+'s. A firewall keeps your income.':'';
 $('clock').textContent=TIERS[S.tier]+' · '+(2+L.clock*.3).toFixed(1)+' GHz';
 $('tn').textContent='Tier '+(S.tier+1)+': '+TIERS[S.tier];
 $('td').textContent=S.tier>=4?'Top tier reached.':'Next: '+TIERS[S.tier+1]+'. Resets cash and upgrades. Capacity x5, costs x3, heat +10%.';
 const mg=$('mig');mg.textContent=S.tier>=4?'Max':'$'+fmt(TC[S.tier]);mg.disabled=S.tier>=4||S.cash<TC[S.tier];
 const rk=$('rack');rk.classList.toggle('brown',brown());
 const pu=rk.querySelector('.pwb i');if(pu)pu.style.width=Math.min(100,pw*100)+'%';
 const t=Date.now()/700;
 rk.querySelectorAll('.unit .mini i').forEach((x,i)=>x.style.width=Math.max(4,Math.min(100,load()*100*(.85+.15*Math.sin(t+i*1.7))))+'%');
 rk.querySelectorAll('.port').forEach(p=>p.classList.toggle('on',Math.random()<nr*.8+.1));
 const SP='\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
 for(const k in U){const m=S.mk[k]||1,h=MH[k]||[m];
  const sp=h.map(v=>SP[Math.max(0,Math.min(7,Math.round((v-.6)/1.2*7)))]).join('');
  const el=$('m_'+k);if(el){el.textContent=(m>1.05?'\u25b2 ':m<.95?'\u25bc ':'')+Math.round(m*100)+'% '+sp;el.className='mk '+(m>1.25?'hi':m<.8?'lo':'')}
  const b=$('b_'+k);if(b)b.classList.toggle('sale',m<.8)}
 $('news').textContent=newsMsg||'Parts market is calm.';
}
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),1700)}
function flash(k){
 toast('Upgraded: '+U[k].n+' Lv '+L[k]);
 $('frame').animate([{transform:'scale(1.15)',boxShadow:'0 0 32px var(--tc,#e39a54)'},{transform:'scale(1)'}],{duration:500,easing:'ease-out'});
 $('rack').animate([{boxShadow:'inset 0 0 30px #000,0 0 24px var(--tc,#2fd0c0)'},{boxShadow:'inset 0 0 30px #000,0 0 0 transparent'}],{duration:800});
 const row=$('b_'+k).closest('.up');
 row.animate([{boxShadow:'0 0 0 3px var(--cool)'},{boxShadow:'0 0 0 0 transparent'}],{duration:700});
 document.querySelectorAll('.fan').forEach(f=>f.animate([{filter:'brightness(2.2)'},{filter:'none'}],{duration:700}));
}
function renderRack(){
 const n=1+L.vms,bays=Math.min(6,1+Math.floor(L.disk/2)),sig=n+'-'+bays+'-'+L.cool+'-'+L.net+'-'+S.tier,r=$('rack');
 if(sig!==rackSig){rackSig=sig;
  let h='';for(let i=0;i<n;i++){h+=`<div class="unit"><div class="bays">${'<i class="bay"></i>'.repeat(bays)}</div><div class="id"><span class="led pw"></span><span class="led ac"></span><b>VM-${String(i+1).padStart(2,'0')}</b><span class="mini"><i></i></span></div><div class="fans"><i class="fan"></i><i class="fan"></i></div></div>`}
  h+=`<div class="unit sw"><span>SWITCH</span><div class="ports">${'<i class="port"></i>'.repeat(Math.min(16,4+L.net*2))}</div></div><div class="unit psu"><span>PSU</span><span class="pwb"><i></i></span></div><div class="unit cool"><span>${['Stock fan','Heatsink','Dual fans','Liquid loop','Radiator','Chiller','Cryo'][L.cool]}</span><span class="pipe" style="--p:${L.cool}"></span></div>`;
  r.innerHTML=h;if(rackPrevN&&n>rackPrevN)r.children[n-1].classList.add('new');rackPrevN=n;}
 r.style.setProperty('--load',load().toFixed(2));
 r.style.setProperty('--fan',Math.max(.12,1.6-(S.temp-30)/45).toFixed(2)+'s');
 r.className='rack'+(S.throttle?' hot':S.temp>75?' warm':'')+(diskFull()?' full':'');
 const lit=Math.round(Math.min(1,S.data/diskCap())*bays);
 r.querySelectorAll('.unit').forEach(u=>u.querySelectorAll('.bay').forEach((b,j)=>b.classList.toggle('on',j<lit)));
}
