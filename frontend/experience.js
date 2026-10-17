"use strict";
let authWidget=null,enrollWidget=null,verificationId=null;
let activeAuthView='login',humanSiteKey='',humanApiReady=false,humanLoadTimer=null;
function humanStatus(view,message,verified=false){
  const host=$(view==='enroll'?'enrollCaptcha':'authCaptcha');
  const button=$(view==='enroll'?'enrollSubmit':'loginSubmit');
  let status=$(host.id+'Status');
  if(!status){status=document.createElement('p');status.id=host.id+'Status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');host.after(status);}
  status.textContent=message;button.disabled=!verified;
}
function humanToken(widget){
  if(!window.turnstile||widget===null)return '';
  try{return turnstile.getResponse(widget)||'';}catch{return '';}
}
function resetHuman(widget){
  if(widget===null)return;
  const view=widget===enrollWidget?'enroll':'login';
  humanStatus(view,'Please complete the fresh human-verification challenge.');
  try{turnstile.reset(widget);}catch{humanStatus(view,'Challenge reset failed. Reload the page and try again.');}
}
function renderHuman(view){
  if(view!=='login'&&view!=='enroll')return;
  if(!humanSiteKey||!humanApiReady){humanStatus(view,'Human verification is loading. If it does not appear, check the message below.');return;}
  const existing=view==='enroll'?enrollWidget:authWidget;
  if(existing!==null)return;
  humanStatus(view,'Checking your browser…');
  try{
    const widget=turnstile.render(view==='enroll'?'#enrollCaptcha':'#authCaptcha',{
      sitekey:humanSiteKey,theme:'dark',action:'auth',appearance:'always',
      callback:()=>humanStatus(view,'Human verification complete. You can submit this form.',true),
      'expired-callback':()=>humanStatus(view,'Human verification expired. Complete the challenge again.'),
      'timeout-callback':()=>humanStatus(view,'Human verification timed out. Retry the challenge.'),
      'error-callback':code=>{humanStatus(view,'Human verification error '+String(code)+'. Check your site key, allowed hostname, connection and browser content blockers.');return true;}
    });
    if(view==='enroll')enrollWidget=widget;else authWidget=widget;
  }catch(e){humanStatus(view,'Human verification could not render: '+e.message);}
}
async function initHuman(){
  humanStatus('login','Loading human verification…');humanStatus('enroll','Human verification will load when signup opens.');
  try{
    const config=await json('/auth/config');
    $('authSetup').textContent=config.ready?config.message:'Verified signup needs email sender, invitation and free Turnstile keys configured. Contact the administrator. Existing accounts need one-time email linking.';
    humanSiteKey=config.site_key||'';
    if(!humanSiteKey){humanStatus(activeAuthView,'Turnstile site key is missing. Configure it and restart the backend.');return;}
    window.traceVigilTurnstileReady=()=>{
      if(!window.turnstile)return;
      clearTimeout(humanLoadTimer);humanApiReady=true;renderHuman(activeAuthView);
    };
    if(window.turnstile){window.traceVigilTurnstileReady();return;}
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=traceVigilTurnstileReady&render=explicit';script.async=true;script.defer=true;
    script.onload=()=>window.traceVigilTurnstileReady();
    script.onerror=()=>{clearTimeout(humanLoadTimer);humanStatus(activeAuthView,'Could not load Cloudflare human verification. Check your network or browser content blocker, then reload.');};
    humanLoadTimer=setTimeout(()=>{if(!humanApiReady)humanStatus(activeAuthView,'Cloudflare did not finish loading. Check the connection or browser content blocker, then reload.');},15000);
    document.head.appendChild(script);
  }catch(e){$('authSetup').textContent=e.message;humanStatus(activeAuthView,'Human verification configuration could not load. Reload after checking the server.');}
}
function authView(view){
  activeAuthView=view;$('authform').hidden=view!=='login';$('enrollform').hidden=view!=='enroll';$('verifyform').hidden=view!=='verify';
  renderHuman(view);
}
function requireHuman(widget,view){
  const value=humanToken(widget);
  if(!value){humanStatus(view,'Complete human verification before submitting.');notice('Complete human verification first. No request was sent.');}
  return value;
}
$('signup').onclick=()=>authView('enroll');$('backLogin').onclick=()=>authView('login');$('restartEnroll').onclick=()=>{authView('enroll');resetHuman(enrollWidget);};
async function actionBusy(button,task,verb='Working…'){
  if(button.disabled)return;const started=performance.now(),old=button.textContent;button.disabled=true;button.classList.add('is-loading');button.setAttribute('aria-busy','true');button.textContent=verb;
  try{return await task();}finally{await new Promise(resolve=>setTimeout(resolve,Math.max(0,350-(performance.now()-started))));button.disabled=false;button.classList.remove('is-loading');button.removeAttribute('aria-busy');button.textContent=old;}
}
$('authform').onsubmit=async e=>{e.preventDefault();const captchaToken=requireHuman(authWidget,'login');if(!captchaToken)return;try{await actionBusy($('loginSubmit'),async()=>{
  const b=await json('/login',{method:'POST',body:JSON.stringify({email:$('username').value,password:$('password').value,captcha_token:captchaToken})});
  token=b.access_token;sessionStorage.setItem('token',token);$('password').value='';
  welcomeAfterLogin(b.display_name||b.username||'analyst');await boot();
},'Signing in…');}catch(err){notice(err.message);}finally{resetHuman(authWidget);}};
$('enrollform').onsubmit=async e=>{e.preventDefault();const captchaToken=requireHuman(enrollWidget,'enroll');if(!captchaToken)return;try{await actionBusy($('enrollSubmit'),async()=>{
  const b=await json('/signup',{method:'POST',body:JSON.stringify({email:$('enrollEmail').value,username:$('enrollUsername').value,display_name:$('enrollName').value,password:$('enrollPassword').value,confirm_password:$('enrollConfirm').value,invitation_code:$('enrollInvite').value,accept_policy:$('enrollConsent').checked,legacy_username:$('legacyUsername').value,captcha_token:captchaToken})});
  verificationId=b.challenge_id;$('username').value=$('enrollEmail').value;authView('verify');notice(b.message);$('emailCode').focus();$('enrollPassword').value='';$('enrollConfirm').value='';$('enrollInvite').value='';
},'Sending code…');}catch(err){notice(err.message);}finally{resetHuman(enrollWidget);}};
$('verifyform').onsubmit=async e=>{e.preventDefault();try{await actionBusy($('verifySubmit'),async()=>{
  const b=await json('/auth/verify',{method:'POST',body:JSON.stringify({challenge_id:verificationId,code:$('emailCode').value})});verificationId=null;$('emailCode').value='';sessionStorage.setItem('tracevigilNewAccount',$('username').value.trim().toLowerCase());authView('login');notice(b.message);
},'Verifying…');}catch(err){notice(err.message);}};
// Only explicit successful login calls this helper. Restoring a saved session,
// refreshing data, changing pages and verifying an email never play a greeting.
let welcomedToken=null,welcomeSpeech=null,cancelPendingWelcome=null;
function welcomeAfterLogin(displayName){
  if(!token||welcomedToken===token)return;
  welcomedToken=token;
  const freshAccount=sessionStorage.getItem('tracevigilNewAccount')===$('username').value.trim().toLowerCase();
  if(freshAccount)sessionStorage.removeItem('tracevigilNewAccount');
  const synth=window.speechSynthesis;
  if(!synth||!window.SpeechSynthesisUtterance)return;
  if(cancelPendingWelcome)cancelPendingWelcome();
  const loginToken=token,text=(freshAccount?'Welcome to TraceVigil AI, ':'Welcome back, ')+displayName+'.';
  let timer=null,finished=false;
  const voices=()=>{try{return synth.getVoices();}catch{return [];}};
  function cleanup(){clearTimeout(timer);synth.removeEventListener('voiceschanged',onVoices);cancelPendingWelcome=null;}
  function cancel(){finished=true;cleanup();}
  function speak(){
    if(finished)return;finished=true;cleanup();
    if(sessionStorage.getItem('token')!==loginToken)return;
    const available=voices(),english=available.filter(v=>/^en(?:[-_]|$)/i.test(v.lang));
    const voice=english.find(v=>v.localService&&v.default)||english.find(v=>v.localService)||english.find(v=>v.default)||english[0]||available.find(v=>v.default)||available.find(v=>v.localService)||available[0];
    const speech=new window.SpeechSynthesisUtterance(text);
    if(voice)speech.voice=voice;
    speech.lang=voice?.lang||'en-IN';speech.volume=.4;speech.rate=.92;speech.pitch=1;
    // Keep the utterance alive until the browser finishes. Never retry or replay
    // on voice-list changes, errors or page interaction after this one attempt.
    welcomeSpeech=speech;
    const release=()=>{if(welcomeSpeech===speech)welcomeSpeech=null;};
    speech.onend=release;speech.onerror=event=>{release();console.info('Welcome voice was unavailable or blocked:',event.error);};
    try{synth.cancel();synth.resume();synth.speak(speech);}catch{release();}
  }
  function onVoices(){if(voices().length)speak();}
  cancelPendingWelcome=cancel;
  if(voices().length){speak();return;}
  synth.addEventListener('voiceschanged',onVoices);
  // Some devices populate their voices asynchronously; others expose only a
  // default voice. The timeout still makes just one attempt with that default.
  timer=setTimeout(speak,1200);onVoices();
}
// Asking for the list early helps browsers load device voices before login.
try{window.speechSynthesis?.getVoices();}catch{}
window.addEventListener('pagehide',()=>{
  if(cancelPendingWelcome)cancelPendingWelcome();
  if(window.speechSynthesis)window.speechSynthesis.cancel();
  welcomeSpeech=null;
});
async function visibleRefresh(id,task){
  const button=$(id);let status=$(id+'Status');if(!status){status=document.createElement('small');status.id=id+'Status';status.setAttribute('role','status');button.after(status);}
  status.textContent=' Refreshing…';
  try{await actionBusy(button,task,'Refreshing…');status.textContent=' Updated '+new Date().toLocaleTimeString();}
  catch(e){status.textContent=' Refresh failed';notice(e.message);}
}
$('refreshOverview').onclick=()=>visibleRefresh('refreshOverview',loadOverview);
$('refreshIncidents').onclick=()=>visibleRefresh('refreshIncidents',incidents);
$('refreshHistory').onclick=()=>visibleRefresh('refreshHistory',history);

function drawTimeline(traffic,legacy){
  const host=$('timeline'),hasTraffic=traffic&&Object.keys(traffic).length;
  const entries=Object.entries(hasTraffic?traffic:legacy||{}).filter(([k])=>/^\d{4}-\d{2}-\d{2} \d{2}$/.test(k)).sort(([a],[b])=>a.localeCompare(b));
  if(!entries.length){host.innerHTML='<p>No parseable capture-hour data yet.</p>';return;}
  const times=entries.map(([key])=>Date.parse(key.replace(' ','T')+':00:00Z'));
  const data=entries.map(([key,v])=>hasTraffic?v:{attacks:Number(v)});
  const series=hasTraffic?[['benign','Predicted BENIGN','#72ff9a'],['attacks','Predicted attacks','#ff718d'],['total','Total scored','#77e8ef']]:[['attacks','Predicted attacks','#ff718d']];
  const max=Math.max(1,...data.flatMap(v=>series.map(([k])=>v[k]||0))),minT=times[0],span=Math.max(3600000,times[times.length-1]-minT),W=900,H=280;
  const x=i=>55+(times[i]-minT)/span*810,y=v=>235-v/max*195;
  const axes=[0,.25,.5,.75,1].map(f=>'<line x1="55" x2="865" y1="'+y(max*f)+'" y2="'+y(max*f)+'" stroke="#254133"/><text x="45" y="'+(y(max*f)+4)+'" text-anchor="end" fill="#a0b6a8" font-size="11">'+Math.round(max*f)+'</text>').join('');
  host.innerHTML='<p>Counts by dataset capture hour; time gaps use their actual relative spacing. Missing hours are unobserved, not proven zero. '+(hasTraffic?'':'Older scan: only predicted attack counts are available.')+'</p><div class="chart-controls">'+series.map(([key,label,color])=>'<button type="button" data-series="'+key+'" aria-pressed="true" style="color:'+color+'">'+label+'</button>').join('')+'</div><svg class="timeline-chart" viewBox="0 0 '+W+' '+H+'" role="group" aria-label="Interactive traffic counts by capture hour">'+axes+series.map(([key,label,color])=>'<g data-line="'+key+'"><polyline points="'+data.map((v,i)=>x(i)+','+y(v[key]||0)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2"/>'+data.map((v,i)=>'<circle tabindex="0" role="button" data-point="'+i+'" cx="'+x(i)+'" cy="'+y(v[key]||0)+'" r="5" fill="'+color+'" aria-label="'+esc(entries[i][0]+' '+label+' '+(v[key]||0))+'"><title>'+esc(entries[i][0]+' '+label+': '+(v[key]||0))+'</title></circle>').join('')+'</g>').join('')+'<text x="55" y="265" fill="#a0b6a8" font-size="11">'+esc(entries[0][0])+'</text><text x="865" y="265" text-anchor="end" fill="#a0b6a8" font-size="11">'+esc(entries[entries.length-1][0])+'</text></svg><p class="timeline-selection" role="status">Hover, focus or select a point for exact counts. Toggle series above.</p><details><summary>Accessible capture-hour data table</summary>'+simpleTable(['Capture hour',...series.map(s=>s[1])],entries.map(([k],i)=>[k,...series.map(([key])=>data[i][key]||0)]))+'</details>';
  const select=point=>{const i=Number(point.dataset.point);host.querySelector('.timeline-selection').textContent=entries[i][0]+' · '+series.map(([key,label])=>label+': '+(data[i][key]||0)).join(' · ');};
  host.querySelectorAll('[data-point]').forEach(p=>{p.onmouseenter=()=>select(p);p.onfocus=()=>select(p);p.onclick=()=>select(p);p.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(p);}};});
  host.querySelectorAll('[data-series]').forEach(b=>b.onclick=()=>{const pressed=b.getAttribute('aria-pressed')==='true';b.setAttribute('aria-pressed',String(!pressed));host.querySelector('[data-line="'+b.dataset.series+'"]').style.display=pressed?'none':'';});
}
initHuman();drawTimeline({},{});
