const SB_URL="https://ounyutmpsqkhmjrgqqrt.supabase.co",SB_KEY="sb_publishable_t63cApaIeSQ7XbN82VG1BQ_KWP81-Ea";
(function(){
 const acct=document.querySelector('.acct');
 if(SB_URL.startsWith('PASTE')||!window.supabase){acct.style.display='none';return}
 const sb=supabase.createClient(SB_URL,SB_KEY);
 const gl=document.getElementById('gl'),gs=document.getElementById('gs');
 let user=null,ready=false;
 const score=o=>o?(o.tier||0)*1e9+Object.values(o.lv||{}).reduce((a,b)=>a+b,0)*1e5+(o.cash||0):-1;
 function apply(d){const lv=d.lv||{};Object.assign(S,d,{lv:S.lv});for(const k in S.lv)S.lv[k]=lv[k]||0;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
 async function push(){
  if(!user||!ready)return;
  const {error}=await sb.from('saves').upsert({user_id:user.id,data:JSON.stringify(S),score:score(S),updated_at:new Date().toISOString()});
  gs.textContent=error?'Cloud save failed: '+error.message:'Saved to cloud ('+user.email+')';
 }
 async function sync(u){
  try{
   const {data,error}=await sb.from('saves').select('data').eq('user_id',u.id).maybeSingle();
   if(error)throw error;
   if(data){const c=JSON.parse(data.data);if(score(c)>score(S)){apply(c);toast('Loaded your saved progress')}}
   ready=true;await push();
  }catch(e){gs.textContent='Sync failed: '+(e.message||e)}
 }
 window.cloudWipe=async()=>{if(user&&ready)try{await sb.from('saves').upsert({user_id:user.id,data:JSON.stringify(fresh()),score:0})}catch(e){}};
 sb.auth.onAuthStateChange((ev,session)=>{
  const u=session&&session.user||null;
  if(u&&user&&u.id===user.id){user=u;return}
  user=u;ready=false;
  if(!u){gl.textContent='Sign in with Google';gs.textContent='Progress is saved on this device only';return}
  gl.textContent='Sign out';gs.textContent='Syncing...';
  setTimeout(()=>sync(u),0);
 });
 gl.onclick=()=>user?sb.auth.signOut():sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
 $('reset').onclick=()=>{if(confirm('Erase all progress?')){try{localStorage.removeItem(KEY)}catch(e){}S=fresh();Promise.resolve(window.cloudWipe()).finally(()=>location.reload())}};
 setInterval(push,15000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)push()});
})();
