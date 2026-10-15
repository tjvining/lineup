const peopleList=['Tj','Emma','Travis','Sabrina'];
const stages=[
 {key:'blue',name:'Blue Stage',color:'blue',acts:['The Tony Danza Tapdance Extravaganza','Alien Ant Farm','P.O.D.','Clutch','AFI','Ministry','Marilyn Manson','Evanescence','Slayer','Deftones','System of a Down']},
 {key:'gold',name:'Gold Stage',color:'gold',acts:['Speed of Light','Orgy','Filter','Coal Chamber','Down','Melvins','Mastodon','Knocked Loose','Underøath','The Prodigy']},
 {key:'diablo',name:'Diablo Stage',color:'diablo',acts:['Dead City','TSS','Violent Vira','Haywire','Pain of Truth','Sunami','Terror','Wage War','Poison the Well','Kittie','Snot','Norma Jean']},
 {key:'spiral',name:'Spiral Stage',color:'spiral',acts:['Showing Teeth','The Dark','Ego Kill Talent','Amira Elfeky','Dying Wish','Speed','Power Trip','Superheaven','Failure','Twin Tribes','Lords of Acid','Deafheaven','Glassjaw','She Wants Revenge','Boy Harsher']}
];
// Local-only prototype storage. The snw-planner-v1 key is deliberately separate from other microsites.
const STORAGE_KEY='snw-planner-v1';
let db={users:{}};try{db=JSON.parse(localStorage.getItem(STORAGE_KEY))||db}catch{}
let currentUser=localStorage.getItem(STORAGE_KEY+':active')||'';
// The remembered profile is the only profile permitted to make changes. Other tabs are read-only views.
let signedInUser=localStorage.getItem(STORAGE_KEY+':signed-in')||currentUser;
let chosenName='';let toastTimer;
let profilesRef=null;let firebaseReady=false;let pendingRemoteWrites=[];let localImportStarted=false;
const IMPORT_KEY=STORAGE_KEY+':firebase-imported';
const $=id=>document.getElementById(id);
function setSaveStatus(message){const target=$('saveStatus');if(target)target.textContent=message}
function personKey(person){return person.toLowerCase()}
function pickKey(act){return act.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db));$('viewingLabel').textContent=`VIEWING ${currentUser.toUpperCase()}’S PICKS`;setSaveStatus(firebaseReady?'SYNCED TO FIREBASE':'SAVED ON THIS DEVICE')}
function runRemoteWrite(write){if(!profilesRef)return;if(!firebaseReady){pendingRemoteWrites.push(write);return}write().then(()=>setSaveStatus('SYNCED TO FIREBASE')).catch(()=>setSaveStatus('FIREBASE SYNC ISSUE · LOCAL COPY SAVED'))}
function persistRemotePick(person,act,value){runRemoteWrite(()=>profilesRef.child(personKey(person)).child(pickKey(act)).set(value||null))}
function clearRemoteProfile(person){runRemoteWrite(()=>profilesRef.child(personKey(person)).remove())}
function flushRemoteWrites(){const queued=pendingRemoteWrites.splice(0);queued.reduce((chain,write)=>chain.then(()=>write()).catch(()=>setSaveStatus('FIREBASE SYNC ISSUE · LOCAL COPY SAVED')),Promise.resolve())}
function startFirebaseSync(){
 if(!window.firebase||!window.SNW_FIREBASE_CONFIG){setSaveStatus('LOCAL ONLY · FIREBASE UNAVAILABLE');return}
 try{if(!firebase.apps.length)firebase.initializeApp(window.SNW_FIREBASE_CONFIG);profilesRef=firebase.database().ref('sickNewWorldLineup/profiles');setSaveStatus('CONNECTING TO FIREBASE…');profilesRef.on('value',snapshot=>{
  const remote=snapshot.val()||{};const cached=db.users||{};const users={};const imports=[];
  peopleList.forEach(person=>{users[person]={};const remotePicks=remote[personKey(person)]||{};stages.forEach(stage=>stage.acts.forEach(act=>{const value=remotePicks[pickKey(act)];if(['must','love','maybe'].includes(value)){users[person][act]=value}else if(!localImportStarted&&!localStorage.getItem(IMPORT_KEY)&&['must','love','maybe'].includes(cached[person]?.[act])){const localValue=cached[person][act];users[person][act]=localValue;imports.push({person,act,value:localValue})}}))});
  db.users=users;localStorage.setItem(STORAGE_KEY,JSON.stringify(db));render();
  if(!localImportStarted&&!localStorage.getItem(IMPORT_KEY)){localImportStarted=true;if(imports.length){setSaveStatus('IMPORTING SAVED PICKS…');Promise.all(imports.map(item=>profilesRef.child(personKey(item.person)).child(pickKey(item.act)).set(item.value))).then(()=>{localStorage.setItem(IMPORT_KEY,'1');firebaseReady=true;setSaveStatus('SYNCED TO FIREBASE');flushRemoteWrites()}).catch(()=>{firebaseReady=true;imports.forEach(item=>pendingRemoteWrites.push(()=>profilesRef.child(personKey(item.person)).child(pickKey(item.act)).set(item.value)));setSaveStatus('FIREBASE SYNC ISSUE · LOCAL COPY SAVED');flushRemoteWrites()})}else{localStorage.setItem(IMPORT_KEY,'1');firebaseReady=true;setSaveStatus('SYNCED TO FIREBASE');flushRemoteWrites()}}else{firebaseReady=true;setSaveStatus('SYNCED TO FIREBASE');flushRemoteWrites()}
 },error=>{firebaseReady=false;setSaveStatus('FIREBASE SYNC ISSUE · LOCAL COPY SAVED');console.warn('Sick New World Firebase sync failed:',error.code||error.message)})}catch(error){setSaveStatus('FIREBASE SYNC ISSUE · LOCAL COPY SAVED');console.warn('Sick New World Firebase setup failed:',error.message)}
}
function pretty(t){let [h,m]=t.split(':').map(Number);let suffix=h>=12?'PM':'AM';return `${h%12||12}:${String(m).padStart(2,'0')} ${suffix}`}
function addMins(t,n){let [h,m]=t.split(':').map(Number);let x=h*60+m+n;return `${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`}
function schedule(stage,index){let start,duration=30;if(stage.key==='blue'){start=addMins('12:00',index*60);if(index===stage.acts.length-1)duration=90}else if(stage.key==='gold'){start=addMins('12:30',index*60);if(index===stage.acts.length-1)duration=90}else{start=addMins('12:00',index*45);duration=index===stage.acts.length-1?60:45}return {start,end:addMins(start,duration),duration}}

function allEvents(){let events=[];stages.forEach(stage=>stage.acts.forEach((act,index)=>events.push({...schedule(stage,index),act,stage:stage.name})));return events}
function minuteValue(value){let [h,m]=value.split(':').map(Number);return h*60+m}
function summaryRow(event,detail,extra=''){return `<li class="summary-item"><div class="summary-item-main"><span class="summary-set-name">${event.act}</span><span class="summary-set-time">${pretty(event.start)}–${pretty(event.end)}</span></div><div class="summary-item-meta"><span>${event.stage}</span><span>${detail}</span>${extra}</div></li>`}
function renderSummaries(){
 const events=allEvents();
 const selected=events.filter(event=>db.users[currentUser]?.[event.act]).sort((a,b)=>a.start.localeCompare(b.start));
 $('personalSummaryTitle').textContent=`${currentUser||'Your'}’s picked sets`;$('personalCount').textContent=`${selected.length} ${selected.length===1?'SET':'SETS'}`;
 $('personalSummary').innerHTML=selected.length?selected.map(event=>{let value=db.users[currentUser][event.act];let label={must:'MUST SEE',love:'WOULD LOVE',maybe:'MAYBE'}[value];return summaryRow(event,`<span class="summary-priority ${value}">${label}</span>`)}).join(''):'<li class="summary-empty">No picks yet. Choose sets above to build your shortlist.</li>';
 const rank={must:5,love:3,maybe:1};let options=events.map(event=>{let preferences=peopleList.map(person=>db.users[person]?.[event.act]||'').filter(Boolean);let points=preferences.reduce((sum,value)=>sum+rank[value],0);return {...event,preferences,points,support:preferences.length}}).filter(event=>event.points>0).sort((a,b)=>minuteValue(a.end)-minuteValue(b.end)||minuteValue(a.start)-minuteValue(b.start));
 const best=[{score:0,picks:[]}];options.forEach((event,index)=>{let previous=-1;for(let j=index-1;j>=0;j--){if(minuteValue(options[j].end)<=minuteValue(event.start)){previous=j;break}}let base=best[previous+1];let take={score:base.score+event.points+event.support*.001,picks:[...base.picks,event]};let skip=best[index];best.push(take.score>skip.score?take:skip)});
 const groupPicks=best[options.length]?.picks||[];$('groupScore').textContent=`${groupPicks.length} ${groupPicks.length===1?'SET':'SETS'}`;
 $('groupSummary').innerHTML=groupPicks.length?groupPicks.sort((a,b)=>a.start.localeCompare(b.start)).map(event=>{let must=event.preferences.filter(v=>v==='must').length;let love=event.preferences.filter(v=>v==='love').length;let maybe=event.preferences.filter(v=>v==='maybe').length;let detail=`${event.support}/4 INTERESTED`;let parts=[must&&`${must} MUST`,love&&`${love} LOVE`,maybe&&`${maybe} MAYBE`].filter(Boolean).join(' · ');return summaryRow(event,detail,`<span class="summary-consensus">${parts}</span>`)}).join(''):'<li class="summary-empty">Once everyone adds picks, the best no-conflict group plan will show up here.</li>';
}
function renderPeople(){ $('people').innerHTML=peopleList.map(n=>`<button class="person-tab ${currentUser===n?'active':''} ${signedInUser===n?'owner':''}" data-person="${n}">${n}${signedInUser===n?' · YOU':''}</button>`).join('');document.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>{if(b.dataset.person===currentUser)return;currentUser=b.dataset.person;localStorage.setItem(STORAGE_KEY+':active',currentUser);render()}) }
function renderTimeline(){
 const events=[];stages.forEach(stage=>stage.acts.forEach((act,index)=>events.push({...schedule(stage,index),stage,act,index})));
 const editable=Boolean(currentUser&&signedInUser&&currentUser===signedInUser);
 const mobile=window.matchMedia('(max-width: 760px)').matches;
 const labels={must:'MUST SEE',love:'WOULD LOVE',maybe:'MAYBE'};
 if(mobile){
  const times=[...new Set(events.map(event=>event.start))].sort();
  let html='<div class="mobile-timeline-head"><span>ALL FOUR STAGES</span><span>SHARED SET-TIME ROWS</span></div><div class="mobile-stage-grid">';
  stages.forEach(stage=>{html+=`<div class="mobile-stage-heading ${stage.color}"><i></i><span>${stage.name}</span></div>`});
  times.forEach(time=>stages.forEach(stage=>{const event=events.find(item=>item.stage===stage&&item.start===time);if(!event){html+='<div class="mobile-empty-slot" aria-hidden="true"></div>';return}let value=db.users[currentUser]?.[event.act]||'';let label={must:'MUST',love:'LOVE',maybe:'MAYBE'}[value]||'';html+=`<div class="mobile-stage-slot"><button class="mobile-band ${value?`selected-${value}`:''} ${editable?'':'read-only'}" ${editable?`data-act="${encodeURIComponent(event.act)}"`:''}><span class="mobile-band-time">${pretty(event.start)}</span><span class="mobile-band-name">${event.act}</span><span class="priority-tag">${label}</span></button></div>`}));
  html+='</div>';$('timeline').className='timeline mobile-timeline';$('timeline').innerHTML=html;
 }else{
  const buckets={};events.forEach(event=>(buckets[event.start]??=[]).push(event));const times=Object.keys(buckets).sort();
  let html=`<div class="time-head">TIME</div>${stages.map(stage=>`<div class="stage-head ${stage.color}"><i class="stage-glyph"></i>${stage.name}<small>${stage.acts.length} SETS</small></div>`).join('')}`;
  times.forEach(time=>{html+=`<div class="time-cell">${pretty(time)}</div>`;stages.forEach(stage=>{let event=(buckets[time]||[]).find(item=>item.stage===stage);if(!event){html+='<div class="stage-cell"><div class="band-empty">· · ·</div></div>';return}let value=db.users[currentUser]?.[event.act]||'';let label=labels[value]||'';html+=`<div class="stage-cell"><button class="band ${value?`selected-${value}`:''} ${editable?'':'read-only'}" ${editable?`data-act="${encodeURIComponent(event.act)}"`:''}><div class="band-top"><span class="band-name">${event.act}</span><span class="band-time">${pretty(event.start)}</span></div><div class="band-meta"><span>${pretty(event.start)} — ${pretty(event.end)} · ${event.duration} MIN</span><span class="priority-tag">${label}</span></div></button></div>`})});
  $('timeline').className='timeline';$('timeline').innerHTML=html;
 }
 document.querySelectorAll('[data-act]').forEach(button=>button.onclick=()=>cycle(decodeURIComponent(button.dataset.act)));
 $('editHint').textContent=editable?'SELECT A SET TO SET YOUR PRIORITY':signedInUser?`VIEW ONLY · ${signedInUser.toUpperCase()} IS SIGNED IN`:'SIGN IN TO EDIT YOUR PICKS';
 $('clearBtn').disabled=!editable;$('shareBtn').textContent=editable?'COPY MY PICKS ↗':'COPY VIEWED PICKS ↗';renderSummaries();
}
function render(){if(!db.users[currentUser])db.users[currentUser]={};renderPeople();$('profileBtn').textContent=signedInUser?signedInUser[0]:'?';$('profileBtn').setAttribute('aria-label',signedInUser?`Signed in as ${signedInUser}. Change profile`:'Sign in to your profile');$('viewingLabel').textContent=currentUser?`VIEWING ${currentUser.toUpperCase()}’S PICKS`:'';document.querySelector('.title-row h2').textContent=currentUser?`${currentUser}’s schedule`:'Your schedule';renderTimeline()}

const layoutQuery=window.matchMedia('(max-width: 760px)');if(layoutQuery.addEventListener)layoutQuery.addEventListener('change',()=>render());else layoutQuery.addListener(()=>render());
function cycle(act){if(!signedInUser||currentUser!==signedInUser){showToast(`Sign in as ${currentUser} to edit this schedule.`);return}const u=db.users[currentUser];const next={'':'must',must:'love',love:'maybe',maybe:''};let now=u[act]||'';if(next[now])u[act]=next[now];else delete u[act];save();persistRemotePick(currentUser,act,u[act]||null);renderTimeline()}
function openLogin(){chosenName=currentUser||'';document.querySelectorAll('.name-choice').forEach(b=>b.classList.toggle('selected',b.dataset.name===chosenName));$('loginError').textContent='';$('password').value='';$('loginModal').classList.add('open')}
function makeLogin(){ $('nameGrid').innerHTML=peopleList.map(n=>`<button class="name-choice" data-name="${n}">${n}</button>`).join('');document.querySelectorAll('[data-name]').forEach(b=>b.onclick=()=>{chosenName=b.dataset.name;document.querySelectorAll('.name-choice').forEach(x=>x.classList.toggle('selected',x===b))}) }
function signIn(){if(!chosenName){$('loginError').textContent='Choose your planner profile first.';return}if($('password').value.toLowerCase()!=='sicknewworld'){$('loginError').textContent='That passphrase doesn’t match. Give it another go.';return}currentUser=chosenName;signedInUser=chosenName;localStorage.setItem(STORAGE_KEY+':active',currentUser);localStorage.setItem(STORAGE_KEY+':signed-in',signedInUser);$('loginModal').classList.remove('open');render();showToast(`You’re planning as ${currentUser}.`)}
function showToast(msg){let t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200)}
makeLogin();render();if(!peopleList.includes(currentUser)){openLogin()}else{render()}startFirebaseSync();
$('profileBtn').onclick=openLogin;$('closeModal').onclick=()=>$('loginModal').classList.remove('open');$('enterBtn').onclick=signIn;$('password').addEventListener('keydown',e=>{if(e.key==='Enter')signIn()});$('revealPass').onclick=()=>{let p=$('password');p.type=p.type==='password'?'text':'password';$('revealPass').textContent=p.type==='password'?'SHOW':'HIDE'};
const clearModal=$('clearModal');function openClearDialog(){if(!signedInUser||currentUser!==signedInUser)return;$('clearDescription').textContent=`This removes all priorities you’ve saved for ${currentUser}. This can’t be undone.`;clearModal.classList.add('open');$('confirmClear').focus()}function closeClearDialog(){clearModal.classList.remove('open')}function clearPicks(){if(!signedInUser||currentUser!==signedInUser)return;db.users[currentUser]={};save();clearRemoteProfile(currentUser);renderTimeline();closeClearDialog();showToast(`${currentUser}’s picks are cleared.`)}$('clearBtn').onclick=openClearDialog;$('clearClose').onclick=closeClearDialog;$('cancelClear').onclick=closeClearDialog;$('confirmClear').onclick=clearPicks;clearModal.onclick=e=>{if(e.target===clearModal)closeClearDialog()};$('shareBtn').onclick=async()=>{const priorities={must:'★ MUST SEE',love:'♡ WOULD LOVE',maybe:'? MAYBE'};const picks=allEvents().filter(event=>db.users[currentUser]?.[event.act]).sort((a,b)=>a.start.localeCompare(b.start)||a.stage.localeCompare(b.stage));const lines=picks.map((event,index)=>`${index+1}. ${pretty(event.start)}–${pretty(event.end)} · ${event.stage}\n   ${priorities[db.users[currentUser][event.act]]} · ${event.act}`);const out=`${currentUser}’s Sick New World plan\nSaturday, October 24, 2026 · In time order\n\n${lines.length?lines.join('\n'):'No picks yet — open the planner to choose your sets.'}\n\nSet times and artist placements are placeholders until the official schedule drops.`;try{await navigator.clipboard.writeText(out);showToast('Your picks are copied to the clipboard.')}catch{showToast('Clipboard access unavailable in this browser.')}};
$('loginModal').addEventListener('click',e=>{if(e.target===$('loginModal'))$('loginModal').classList.remove('open')});

const mapModal=$('mapModal');const openMap=()=>mapModal.classList.add('open');$('mapBtn').onclick=openMap;$('heroMap').onclick=openMap;$('mapImage').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openMap()}};$('mapClose').onclick=()=>mapModal.classList.remove('open');mapModal.onclick=e=>{if(e.target===mapModal)mapModal.classList.remove('open')};document.addEventListener('keydown',e=>{if(e.key==='Escape'){mapModal.classList.remove('open');closeClearDialog()}});

const THEME_KEY=STORAGE_KEY+':theme';
function applyTheme(theme){const light=theme==='light';document.body.classList.toggle('light-mode',light);$('themeToggle').innerHTML=`<span class="theme-icon">${light?'☾':'☼'}</span><span class="theme-text">${light?'DARK':'LIGHT'}</span>`;$('themeToggle').setAttribute('aria-label',`Switch to ${light?'dark':'light'} mode`);document.querySelector('meta[name="theme-color"]').content=light?'#eee9e2':'#0b0d11';localStorage.setItem(THEME_KEY,light?'light':'dark')}
applyTheme(localStorage.getItem(THEME_KEY)||'dark');$('themeToggle').onclick=()=>applyTheme(document.body.classList.contains('light-mode')?'dark':'light');

const eventStart=new Date('2026-10-24T12:00:00-05:00');
function tickCountdown(){let until=eventStart.getTime()-Date.now();if(until<=0){if(!$('countdown').dataset.arrived){$('countdown').innerHTML='<div class="event-arrived">THE FESTIVAL IS ON · HAVE A LOUD ONE</div>';$('countdown').dataset.arrived='true';$('countdown').setAttribute('aria-label','Festival day is here')}return}let remaining=until;let days=Math.floor(remaining/86400000);remaining%=86400000;let hours=Math.floor(remaining/3600000);remaining%=3600000;let minutes=Math.floor(remaining/60000);let seconds=Math.floor((remaining%60000)/1000);$('countDays').textContent=String(days).padStart(2,'0');$('countHours').textContent=String(hours).padStart(2,'0');$('countMinutes').textContent=String(minutes).padStart(2,'0');$('countSeconds').textContent=String(seconds).padStart(2,'0');if(eventStart.getTime()<=Date.now())$('countdown').setAttribute('aria-label','Festival day is here')}
tickCountdown();setInterval(tickCountdown,1000);
