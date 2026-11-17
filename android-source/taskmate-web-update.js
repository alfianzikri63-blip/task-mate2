/* TaskMate v1.36.0 — pemeriksa update wajib untuk GitHub Pages.
   Reload versi web ketika ada deployment baru. Tidak membutuhkan izin notifikasi OS. */
(() => {
  'use strict';
  if (window.TASKMATE_NATIVE_APP) return;
  const CURRENT_VERSION=String(window.TASKMATE_WEB_VERSION || '0.0.0');
  const INTERVAL=2*60*1000;
  let checking=false,latestShown='';
  function code(input) {
    const m=String(input || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
    if(!m)return null;
    const p=m.slice(1).map(Number);
    return p.some(x=>x>9999)?null:p[0]*100000000+p[1]*10000+p[2];
  }
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function getVersion() {
    const url=new URL('version.json',document.baseURI);
    url.searchParams.set('_',String(Date.now()));
    const c=new AbortController();const t=setTimeout(()=>c.abort(),8000);
    try {
      const r=await fetch(url,{cache:'no-store',signal:c.signal});
      if(!r.ok)throw Error(`HTTP ${r.status}`);
      const data=await r.json();
      if(code(data.version)===null)throw Error('Nomor versi tidak valid');
      return data;
    }finally{clearTimeout(t);}
  }
  function promptUpgrade(data){
    if(latestShown===data.version)return;
    latestShown=data.version;
    document.getElementById('tm-web-required-update')?.remove();
    const layer=document.createElement('div');
    layer.id='tm-web-required-update';
    layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
    layer.setAttribute('aria-label','TaskMate website perlu diperbarui');
    Object.assign(layer.style,{position:'fixed',zIndex:'2147483647',inset:'0',display:'flex',
      alignItems:'center',justifyContent:'center',background:'rgba(10,16,27,.84)',padding:'20px'});
    layer.innerHTML=`<section style="width:100%;max-width:430px;box-sizing:border-box;border-radius:24px;
      background:#fff7e9;color:#30251b;padding:26px;font-family:system-ui,sans-serif;box-shadow:0 15px 55px #0007">
      <div style="font-size:38px">🌐</div><h2 style="font-size:24px;margin:10px 0">Website TaskMate perlu diperbarui</h2>
      <p style="font-size:14px;line-height:1.55">Versi baru <b>${escapeHtml(data.version)}</b> telah tersedia.
      Anda masih menggunakan <b>${escapeHtml(CURRENT_VERSION)}</b>.</p>
      <p style="background:#f0e2cf;border-radius:12px;padding:12px;font-size:13px">${escapeHtml(String(data.notes||'Pembaruan aplikasi tersedia.').slice(0,400))}</p>
      <button type="button" id="tm-refresh-website" style="width:100%;background:#237859;color:#fff;border:0;
      border-radius:12px;padding:14px;font:800 15px system-ui;cursor:pointer">↻ Muat versi terbaru</button>
    </section>`;
    document.body.append(layer);
    layer.querySelector('#tm-refresh-website').addEventListener('click',async()=>{
      try { const reg=await navigator.serviceWorker?.getRegistration();await reg?.update(); }catch{}
      const url=new URL(location.href);
      url.searchParams.set('tm_web_ver',String(data.version));
      url.searchParams.set('tm_fresh',String(Date.now()));
      location.replace(url.href);
    });
  }
  async function check() {
    if(checking||document.hidden||!navigator.onLine)return;
    checking=true;
    try {
      const data=await getVersion();
      if(code(data.version)>code(CURRENT_VERSION))promptUpgrade(data);
    } catch(error){console.warn('TaskMate website update:',error);}
    finally{checking=false;}
  }
  function boot(){
    check();setInterval(check,INTERVAL);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
    window.addEventListener('online',check);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
