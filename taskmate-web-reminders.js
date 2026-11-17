/* TaskMate Web 1.35.1 — pengingat selama halaman website aktif.
   BUKAN push server: tidak dapat mengirim notifikasi ketika browser ditutup.
   Tidak menimpa konfigurasi Supabase, foto, tema, maupun ikon. */
(() => {
  'use strict';
  if (window.TASKMATE_NATIVE_APP) return;

  const prefix = 'taskmate:web:reminders:v135:';
  const codeByShift = {1:'P7',2:'S14',3:'M22'};
  const fallbackHours = {1:['07:00','17:00'],2:['14:00','23:00'],3:['21:30','07:00']};
  const dayMs = 86400000;
  // Audio is best-effort while a website tab is open. Browsers do not allow
  // a webpage to override the sound of an OS notification or play while closed.
  let soundContext = null;
  let soundReady = false;
  function unlockReminderSound() {
    const AudioContextType = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextType) return false;
    try {
      if (!soundContext) soundContext = new AudioContextType();
      soundContext.resume().then(() => { soundReady = true; }).catch(() => {});
      // Trigger the audio engine from this direct user gesture, with no audible output.
      const osc = soundContext.createOscillator();
      const gain = soundContext.createGain();
      gain.gain.value = 0;
      osc.connect(gain); gain.connect(soundContext.destination);
      osc.start(); osc.stop(soundContext.currentTime + 0.01);
      return true;
    } catch(e) { console.warn('TaskMate web audio unlock', e); return false; }
  }
  function playReminderSound() {
    if (document.hidden || !soundContext || soundContext.state !== 'running') return false;
    try {
      const start = soundContext.currentTime + 0.02;
      for (const [i,frequency] of [784, 988, 784].entries()) {
        const oscillator = soundContext.createOscillator();
        const gain = soundContext.createGain();
        const at = start + i * 0.21;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        oscillator.connect(gain);gain.connect(soundContext.destination);
        gain.gain.setValueAtTime(0.0001,at);
        gain.gain.exponentialRampToValueAtTime(0.11,at + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001,at + 0.16);
        oscillator.start(at);oscillator.stop(at + 0.175);
      }
      return true;
    } catch(e) { console.warn('TaskMate web reminder sound',e); return false; }
  }
  let client = null, account = null, workspaceId = null;
  let snapshot = null, cacheTime = 0, running = false;

  function say(message, error = false) {
    const toast = document.getElementById('toast');
    if (!toast) { window.alert(message); return; }
    toast.textContent = message;
    toast.classList.toggle('show', true);
    toast.classList.toggle('error', error);
    toast.style.display = 'block';
    clearTimeout(say.timer);
    say.timer = setTimeout(() => {
      toast.classList.remove('show');
      toast.style.display = '';
    }, 6500);
  }
  const jakartaDay = (date = new Date()) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone:'Asia/Jakarta', year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(date).map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  };
  const at = (day, clock) => Date.parse(`${day}T${clock}:00+07:00`);
  function windowFor(day, shift) {
    const t = fallbackHours[shift];
    if (!t) return null;
    const start = at(day, t[0]);
    let end = at(day, t[1]);
    if (end <= start) end += dayMs;
    return {start,end};
  }
  function key(userId, wid) { return `${prefix}enabled:${userId}:${wid}`; }
  function sentKey(userId,wid,part) { return `${prefix}sent:${userId}:${wid}:${part}`; }
  function alreadySent(k) { try{return localStorage.getItem(k)==='1';}catch{return false;} }
  function markSent(k) { try{localStorage.setItem(k,'1');}catch{} }

  async function connect() {
    const cfg = window.TASKMATE_CONFIG;
    if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey || !window.supabase?.createClient) return null;
    if (!client) client = window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });
    const {data,error}=await client.auth.getSession();
    if (error || !data.session?.user) return null;
    const uid = data.session.user.id;
    if (account !== uid) {account=uid; workspaceId=null; snapshot=null; cacheTime=0;}
    const {data:membership,error:memberError} = await client.from('workspace_members')
      .select('workspace_id,status').eq('user_id',uid).eq('status','approved');
    if(memberError) throw memberError;
    const allowed = (membership||[]).map(x=>x.workspace_id);
    const preferred = localStorage.getItem('taskmate-current-workspace');
    const current = allowed.includes(preferred)?preferred:allowed[0];
    if (!current) return null;
    if (workspaceId!==current) {workspaceId=current; snapshot=null;cacheTime=0;}
    return {uid,wid:current};
  }
  async function loadData(uid,wid) {
    if(snapshot && Date.now()-cacheTime<90000) return snapshot;
    const now=Date.now();
    const days=[jakartaDay(new Date(now-dayMs)),jakartaDay(new Date(now)),jakartaDay(new Date(now+dayMs))];
    const [roster,links,tasks] = await Promise.all([
      client.from('shift_roster').select('work_date,shift_number,start_at,end_at').eq('workspace_id',wid).eq('user_id',uid).in('work_date',days),
      client.from('shift_staff_links').select('staff_key').eq('workspace_id',wid).eq('user_id',uid),
      client.from('tasks').select('id,title,due_at,status,assignee_id').eq('workspace_id',wid).gte('due_at',new Date(now-12*3600000).toISOString()).lte('due_at',new Date(now+24*3600000).toISOString())
    ]);
    if(roster.error) throw roster.error;
    if(links.error) console.warn('TaskMate web reminder: links',links.error.message);
    if(tasks.error) console.warn('TaskMate web reminder: tasks',tasks.error.message);
    let staffRows=[];
    const linked=(links.data||[]).map(x=>x.staff_key);
    if(linked.length){
      const result=await client.from('shift_staff_seed').select('staff_key,schedule')
        .eq('workspace_id',wid).in('staff_key',linked);
      if(!result.error)staffRows=result.data||[];
    }
    snapshot={roster:roster.data||[],staffRows,tasks:tasks.data||[],days};
    cacheTime=Date.now();
    return snapshot;
  }
  async function showNotification(title,body,tag,url='./?tab=shift') {
    if(!('Notification' in window)||Notification.permission!=='granted') return false;
    const opts={body,tag,icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',data:{url}};
    try {
      if ('serviceWorker' in navigator) {
        const reg=await navigator.serviceWorker.getRegistration();
        if(reg && reg.showNotification) {await reg.showNotification(title,opts);if(tag!=='taskmate-web-test')playReminderSound();return true;}
      }
      const note=new Notification(title,opts);
      note.onclick=()=>{window.focus();window.location.href=url;};
      if(tag!=='taskmate-web-test')playReminderSound();
      return true;
    } catch(err) { console.warn('TaskMate web notification error',err); return false; }
  }
  async function tick() {
    if(running||document.hidden||!navigator.onLine||Notification.permission!=='granted')return;
    running=true;
    try {
      const session=await connect(); if(!session)return;
      const {uid,wid}=session;
      if(localStorage.getItem(key(uid,wid))!=='1')return;
      const {roster,staffRows,tasks,days}=await loadData(uid,wid);
      const now=Date.now();
      const ownShifts=new Map();
      for(const r of roster) {
        const s=Number(r.shift_number);
        if(!windowFor(r.work_date,s))continue;
        ownShifts.set(`${r.work_date}:${s}`,{day:r.work_date,s,from:r.start_at,to:r.end_at});
      }
      for(const row of staffRows) for(const day of days) for(const s of [1,2,3]) {
        if(row.schedule?.[day]===codeByShift[s] && !ownShifts.has(`${day}:${s}`))
          ownShifts.set(`${day}:${s}`,{day,s});
      }
      for(const r of ownShifts.values()) {
        const fallback=windowFor(r.day,r.s);
        const start=r.from && Number.isFinite(Date.parse(r.from))?Date.parse(r.from):fallback.start;
        const end=r.to && Number.isFinite(Date.parse(r.to))?Date.parse(r.to):fallback.end;
        for(let slot=0;slot<8;slot++){
          const due=start+slot*2*3600000;
          if(due>=end||now<due||now-due>120000)continue;
          const k=sentKey(uid,wid,`shift:${r.day}:${r.s}:${slot}`);
          if(alreadySent(k))continue;
          const title=slot===0?`⏰ Shift ${r.s} dimulai`:`🔔 Pengingat Shift ${r.s}`;
          const body=slot===0?'Buka TaskMate untuk memeriksa penugasan shift Anda.':'Periksa progres checklist dan bukti pekerjaan shift Anda.';
          if(await showNotification(title,body,`taskmate-shift-${r.day}-${r.s}-${slot}`,`./?tab=shift&shift=${r.s}`))markSent(k);
        }
      }
      for(const task of tasks){
        if(!task.due_at||task.status==='done'||(task.assignee_id && task.assignee_id!==uid))continue;
        const remain=Date.parse(task.due_at)-now;
        if(!Number.isFinite(remain)||remain>30*60000||remain< -10*60000)continue;
        const k=sentKey(uid,wid,`deadline:${task.id}:${task.due_at}`);
        if(alreadySent(k))continue;
        const body=remain<0?'Deadline sudah lewat':`Sisa ${Math.max(1,Math.ceil(remain/60000))} menit`;
        if(await showNotification('⏰ Deadline TaskMate',`${task.title} • ${body}`,`taskmate-deadline-${task.id}`,'./?tab=tasks'))markSent(k);
      }
    } catch(e) {console.warn('TaskMate web reminders',e);} finally {running=false;}
  }
  async function requirePermission(){
    if(location.protocol!=='https:')throw Error('Notifikasi website membutuhkan HTTPS.');
    if(!('Notification' in window))throw Error('Browser ini tidak mendukung notifikasi.');
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted')throw Error('Izin notifikasi belum diberikan. Aktifkan di pengaturan browser.');
  }
  async function enable(){
    await requirePermission();
    const session=await connect();
    if(!session)throw Error('Login ke akun Cloud TaskMate terlebih dahulu.');
    localStorage.setItem(key(session.uid,session.wid),'1');
    say('✓ Pengingat website aktif. Nada pengingat dapat berbunyi saat halaman terbuka; website tertutup memerlukan Web Push server.');
    tick();
  }
  async function test(){
    await requirePermission();
    const ok=await showNotification('🔔 Tes Notifikasi TaskMate','Ini tes pengingat website. Bukan push dari server.','taskmate-web-test');
    say(ok?'✓ Tes dikirim. Jika suara tidak terdengar, cek volume media, mode senyap, dan izin suara browser.':'Notifikasi gagal ditampilkan. Cek izin browser atau service worker.',!ok);
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-action]');
    if(!button)return;
    const action=button.dataset.action;
    if(!['enable-push','shift-test-alarm'].includes(action))return;
    // Jika server Web Push sudah dikonfigurasi, jangan ambil alih aktivasi aslinya.
    if(action==='enable-push' && window.TASKMATE_CONFIG?.vapidPublicKey) return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    // Required: resume audio synchronously from the tap, before any await.
    unlockReminderSound();
    if(action==='shift-test-alarm')playReminderSound();
    (action==='enable-push'?enable():test()).catch(err=>say(err?.message||String(err),true));
  },true);
  function updateLabels(){
    const headings=[...document.querySelectorAll('h3')];
    for(const head of headings){
      if(!head.textContent.includes('Push reminder shift'))continue;
      head.textContent='🔔 Pengingat Shift (Website)';
      const panel=head.closest('.panel');
      if(!panel)continue;
      const enableBtn=panel.querySelector('[data-action="enable-push"]');
      if(enableBtn && !window.TASKMATE_CONFIG?.vapidPublicKey)enableBtn.textContent='Aktifkan pengingat di browser';
      const soundButton=panel.querySelector('[data-action="shift-test-alarm"]');
      if(soundButton && !window.TASKMATE_CONFIG?.vapidPublicKey)soundButton.textContent='🔊 Tes suara & notifikasi web';
      for(const p of panel.querySelectorAll('p')){
        if(p.textContent.includes('Petugas aktif menerima pengingat'))p.textContent='Pengingat saat shift dimulai, setiap 2 jam, dan menjelang deadline selama website terbuka.';
        if(p.textContent.includes('Push saat aplikasi tertutup'))p.textContent='Suara pengingat hanya dapat berbunyi saat website terbuka setelah Anda menekan Aktifkan/Tes. Jika website ditutup, diperlukan Web Push server; nada notifikasi dikendalikan pengaturan HP/browser.';
      }
    }
  }
  const observer=new MutationObserver(updateLabels);
  const boot=()=>{
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
    updateLabels();
    setInterval(()=>tick().catch(console.warn),40000);
    window.addEventListener('focus',()=>tick().catch(console.warn));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick().catch(console.warn)});
    tick().catch(console.warn);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
