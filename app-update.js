/* TaskMate 1.36.0 — pemeriksa APK wajib update.
   Sumber kebenaran utama: rilis APK resmi GitHub, metadata RAW pendamping.
   Hanya berjalan di APK signed; tidak memasang APK tanpa izin Android. */
(() => {
  'use strict';
  if (window.TASKMATE_NATIVE_APP !== true) return;
  const currentCode = Number(window.TASKMATE_NATIVE_VERSION_CODE || 0);
  const currentName = String(window.TASKMATE_NATIVE_VERSION_NAME || '');
  if (!Number.isSafeInteger(currentCode) || currentCode <= 0) return;

  const owner = 'alfianwahyu035-boop';
  const repo = 'Task-new';
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/apk-update.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const checkIntervalMs = 2 * 60 * 1000;
  let lastCheck = 0;
  let checking = false;
  let displayedVersion = 0;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function versionCode(input) {
    const match = String(input ?? '').match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return null;
    const [major, minor, patch] = match.slice(1).map(Number);
    if (minor >= 100 || patch >= 1000) return null;
    const code = major * 100000 + minor * 1000 + patch;
    return Number.isSafeInteger(code) && code > 0 ? code : null;
  }
  function verifiedDownload(url, version) {
    try {
      const u = new URL(String(url));
      const path = `/${owner}/${repo}/releases/download/v${version}/TaskMate.apk`;
      return u.protocol === 'https:' && u.hostname === 'github.com' &&
        u.pathname === path && !u.search && !u.hash ? u.href : null;
    } catch { return null; }
  }
  async function fetchJson(url) {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), 9000);
    try {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`, {
        method:'GET', cache:'no-store', mode:'cors', signal:control.signal,
        headers: {Accept:'application/json'}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally { clearTimeout(timer); }
  }
  function normalizeManifest(data) {
    const name = String(data?.versionName ?? '').replace(/^v/, '');
    const code = versionCode(name);
    if (data?.released !== true || code === null || code !== Number(data.versionCode)) return null;
    const link = verifiedDownload(data.downloadUrl, name);
    return link ? {
      versionName:name,versionCode:code,downloadUrl:link,
      notes:String(data.notes || '').slice(0,450)
    } : null;
  }
  function normalizeRelease(data) {
    const name = String(data?.tag_name ?? '').replace(/^v/, '');
    const code = versionCode(name);
    if (code === null || data?.draft === true || data?.prerelease === true) return null;
    const asset = Array.isArray(data?.assets)
      ? data.assets.find(a=>a?.name === 'TaskMate.apk' && a?.state === 'uploaded') : null;
    const link = verifiedDownload(asset?.browser_download_url, name);
    return link ? {
      versionName:name,versionCode:code,downloadUrl:link,
      notes:`APK resmi TaskMate ${name} sudah tersedia.`
    } : null;
  }
  async function latestRelease() {
    // API dan RAW diperiksa bersamaan agar metadata versi lama tidak menutupi rilis baru.
    const settled = await Promise.allSettled([fetchJson(apiUrl), fetchJson(rawUrl)]);
    const release = settled[0].status === 'fulfilled' ? normalizeRelease(settled[0].value) : null;
    const manifest = settled[1].status === 'fulfilled' ? normalizeManifest(settled[1].value) : null;
    if (release) {
      // Metadata dipakai sebagai catatan hanya apabila cocok dengan versi rilis resmi.
      return {...release, notes:manifest?.versionCode === release.versionCode && manifest.notes
        ? manifest.notes : release.notes, mandatory:true};
    }
    if (manifest) return {...manifest,mandatory:true};
    throw new Error('Belum bisa mengambil informasi rilis APK dari GitHub.');
  }
  function toast(message) {
    const node = document.createElement('div');
    node.setAttribute('role','status');node.textContent=message;
    Object.assign(node.style,{position:'fixed',zIndex:'2147483647',bottom:'90px',left:'16px',right:'16px',
      maxWidth:'480px',margin:'auto',padding:'14px 18px',borderRadius:'14px',
      background:'#282b34',color:'#fff',font:'600 14px system-ui',boxShadow:'0 9px 28px #0005'});
    document.body.append(node);setTimeout(()=>node.remove(),5200);
  }
  function openDownload(href) {
    const link = document.createElement('a');
    link.href=href;link.target='_blank';link.rel='noopener noreferrer';
    document.body.appendChild(link);link.click();link.remove();
  }
  function showMandatoryPrompt(data) {
    if (document.getElementById('tm-apk-required-update')) {
      if (displayedVersion >= data.versionCode) return;
      document.getElementById('tm-apk-required-update').remove();
    }
    displayedVersion = data.versionCode;
    const overlay = document.createElement('div');
    overlay.id='tm-apk-required-update';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-label','TaskMate harus diperbarui');
    Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'2147483646',
      background:'rgba(10,16,27,.85)',display:'flex',alignItems:'center',
      justifyContent:'center',padding:'18px'});
    overlay.innerHTML = `<section style="box-sizing:border-box;width:100%;max-width:430px;background:#fff7e9;color:#29231e;
      padding:26px;border-radius:24px;box-shadow:0 20px 55px #0008;font-family:system-ui,sans-serif">
      <div style="font-size:37px">📦</div>
      <h2 style="font-size:24px;line-height:1.2;margin:8px 0">Pembaruan TaskMate Diperlukan</h2>
      <p style="font-size:14px;line-height:1.6">Tersedia versi <strong>${escapeHtml(data.versionName)}</strong>.
      Versi terpasang: <strong>${escapeHtml(currentName)}</strong>.</p>
      <p style="white-space:pre-wrap;background:#f1e3cf;padding:12px;border-radius:12px;font-size:13px;line-height:1.5">${escapeHtml(data.notes)}</p>
      <p style="font-size:12px;line-height:1.5;color:#605647">Tekan tombol di bawah untuk mengunduh APK resmi.
      Android akan meminta persetujuan pemasangan. Jangan uninstall versi lama jika tanda tangan APK sama.</p>
      <button type="button" id="tm-download-required-apk" style="display:block;width:100%;padding:15px;
       background:#237859;color:#fff;border:0;border-radius:13px;font:800 15px system-ui;cursor:pointer">
       ⬇ Update sekarang</button>
      <p style="margin:12px 0 0;font-size:11px;color:#776958;text-align:center">Perlu koneksi internet. Tutup APK jika ingin menunda pengunduhan.</p>
    </section>`;
    document.body.append(overlay);
    overlay.querySelector('#tm-download-required-apk').addEventListener('click',()=>openDownload(data.downloadUrl));
  }
  async function checkUpdate(manual=false,force=false) {
    if (checking) return;
    if (!navigator.onLine) {if(manual)toast('Perangkat offline. Periksa koneksi internet.');return;}
    if (!manual && !force && Date.now()-lastCheck < checkIntervalMs) return;
    checking=true;
    try {
      const latest = await latestRelease();
      lastCheck=Date.now();
      if (latest.versionCode > currentCode) showMandatoryPrompt(latest);
      else if(manual) toast(`TaskMate sudah versi terbaru (${currentName}).`);
    } catch (e) {
      console.warn('[TaskMate update required]',e);
      if(manual)toast('Gagal mengecek update. Periksa internet lalu coba lagi.');
    } finally {checking=false;}
  }
  function injectSettingsButton() {
    if (document.getElementById('tm-apk-check-update')) return;
    const heading = [...document.querySelectorAll('.section-header h2')]
      .find(el => el.textContent.trim() === 'Pengaturan aplikasi');
    if(!heading)return;
    const modeItem=[...document.querySelectorAll('.settings-item')]
      .find(el=>el.textContent.includes('Mode penyimpanan'));
    const holder=modeItem?.parentElement;
    if(!holder)return;
    const row=document.createElement('div');row.className='settings-item';row.id='tm-apk-check-update';
    row.style.display='flex';row.style.alignItems='center';row.style.justifyContent='space-between';row.style.gap='14px';
    row.innerHTML=`<div><h4>Versi APK TaskMate ${escapeHtml(currentName)}</h4><p>Cek apakah ada versi wajib terbaru.</p></div>
      <button type="button" class="btn outline sm">Cek update</button>`;
    row.querySelector('button').addEventListener('click',()=>checkUpdate(true,true));
    holder.append(row);
  }
  function boot() {
    checkUpdate(false,true);
    const app=document.getElementById('app');
    if(app)new MutationObserver(injectSettingsButton).observe(app,{childList:true,subtree:true});
    injectSettingsButton();
    setInterval(()=>{if(!document.hidden)checkUpdate();},checkIntervalMs);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate(false,true);});
    window.addEventListener('online',()=>checkUpdate(false,true));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
