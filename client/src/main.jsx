import React, { useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Link as LinkIcon, Sparkles, Film, Subtitles, Download, LoaderCircle, FileVideo, Settings, Eye, EyeOff, CheckCircle, AlertCircle, Server, KeyRound, X } from 'lucide-react';
import './style.css';

const DEFAULT_API = import.meta.env.VITE_API_BASE || (window.location.hostname === 'localhost' ? 'http://localhost:8787' : '');
const seed = [
  { id: 1, start: '00:00:01,000', end: '00:00:04,000', text: 'ConerZone မှ ကြိုဆိုပါတယ်။', x: 50, y: 84 },
  { id: 2, start: '00:00:04,000', end: '00:00:08,000', text: 'သင့်ရဲ့ Movie Recap ကို စတင်လိုက်ပါ။', x: 50, y: 84 }
];
const srtTime = value => String(value || '').trim().replace('.', ',');
const makeSrt = rows => rows.map((s, i) => (i + 1) + '\n' + srtTime(s.start) + ' --> ' + srtTime(s.end) + '\n' + s.text + '\n').join('\n');

function App() {
  const [apiBase, setApiBase] = useState(() => localStorage.getItem('conerzone-api-base') || DEFAULT_API);
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [showGroq, setShowGroq] = useState(false), [showGemini, setShowGemini] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true), [connection, setConnection] = useState('');
  const [video, setVideo] = useState(null), [url, setUrl] = useState('');
  const [busy, setBusy] = useState(''), [status, setStatus] = useState('Video ကို local preview ကြည့်ရန် ဖိုင်ရွေးပါ။');
  const [subs, setSubs] = useState(seed), [selected, setSelected] = useState(1), [fontSize, setFontSize] = useState(26);
  const [title, setTitle] = useState(''), [notes, setNotes] = useState(''), [script, setScript] = useState('');
  const fileRef = useRef(null), stageRef = useRef(null), dragRef = useRef(false);
  const active = subs.find(s => s.id === selected) || subs[0];
  const working = Boolean(busy);

  useEffect(() => () => { if (video?.objectUrl) URL.revokeObjectURL(video.objectUrl); }, [video?.objectUrl]);
  const update = (id, key, value) => setSubs(old => old.map(s => s.id === id ? { ...s, [key]: value } : s));
  function saveSettings() {
    const clean = apiBase.trim().replace(/\/$/, '');
    setApiBase(clean);
    if (clean) localStorage.setItem('conerzone-api-base', clean);
    else localStorage.removeItem('conerzone-api-base');
    setStatus('Backend URL ကို ဒီ browser မှာ သိမ်းထားပါပြီ။ API Key များကို သိမ်းမထားပါ။');
  }
  async function api(path, options = {}) {
    const base = apiBase.trim().replace(/\/$/, '');
    if (!base) throw new Error('Settings ထဲမှာ Backend URL ထည့်ပါ။ ဥပမာ https://your-backend.example.com');
    const headers = new Headers(options.headers || {});
    if (groqKey.trim()) headers.set('x-groq-api-key', groqKey.trim());
    if (geminiKey.trim()) headers.set('x-gemini-api-key', geminiKey.trim());
    let res;
    try { res = await fetch(base + path, { ...options, headers }); }
    catch { throw new Error('Backend ကို မဆက်သွယ်နိုင်ပါ။ Settings ထဲက Backend URL၊ deploy status နဲ့ CORS ကို စစ်ပါ။'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
    return data;
  }
  async function testConnection() {
    setBusy('test'); setConnection(''); setStatus('Backend နဲ့ API keys ကို စမ်းသပ်နေပါတယ်…');
    try {
      const d = await api('/api/ai/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groq: Boolean(groqKey.trim()), gemini: Boolean(geminiKey.trim()) }) });
      setConnection(d.message || 'Connection successful'); setStatus('API connection test ပြီးပါပြီ။');
    } catch (e) { setConnection(''); setStatus(e.message); }
    finally { setBusy(''); }
  }
  async function uploadFile(file) {
    if (!file) return;
    if (video?.objectUrl) URL.revokeObjectURL(video.objectUrl);
    const objectUrl = URL.createObjectURL(file);
    setVideo({ name: file.name, src: objectUrl, objectUrl, filename: null, file });
    setBusy('upload'); setStatus('Local preview အဆင်သင့်ဖြစ်ပါပြီ။ Server သို့ upload လုပ်နေပါတယ်…');
    try {
      const fd = new FormData(); fd.append('video', file);
      const d = await api('/api/upload', { method: 'POST', body: fd });
      setVideo(old => old ? { ...old, filename: d.filename, serverUrl: apiBase.replace(/\/$/, '') + d.url } : old);
      setStatus('Preview အလုပ်လုပ်နေပြီး server upload လည်း အောင်မြင်ပါပြီ။');
    } catch (e) { setStatus('Local Preview အလုပ်လုပ်ပါတယ်။ Server upload မအောင်မြင်ပါ — ' + e.message); }
    finally { setBusy(''); }
  }
  async function importUrl() {
    if (!url.trim()) return;
    if (video?.objectUrl) URL.revokeObjectURL(video.objectUrl);
    setVideo({ name: url.trim().split('/').pop().split('?')[0] || 'Remote video', src: url.trim(), filename: null });
    setStatus('Browser မှာ URL preview ဖွင့်ဖို့ ကြိုးစားနေပါတယ်။ Export အတွက် server import လိုအပ်ပါတယ်။');
    setBusy('url');
    try {
      const d = await api('/api/import-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      setVideo(old => old ? { ...old, filename: d.filename, name: d.name || old.name, serverUrl: apiBase.replace(/\/$/, '') + d.url } : old);
      setStatus('URL preview နှင့် server import အောင်မြင်ပါပြီ။');
    } catch (e) { setStatus('URL preview က browser/URL ပေါ်မူတည်ပါတယ်။ Server import မအောင်မြင်ပါ — ' + e.message); }
    finally { setBusy(''); }
  }
  async function createRecap() {
    setBusy('recap'); setStatus('Groq ဖြင့် recap script ထုတ်နေပါတယ်…');
    try {
      const d = await api('/api/ai/recap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, notes, language: 'Burmese', duration: '5 minutes' }) });
      setScript(d.text); setStatus('Recap script ထုတ်ပြီးပါပြီ (' + d.provider + ')');
    } catch (e) { setStatus(e.message); } finally { setBusy(''); }
  }
  async function improveSubs() {
    if (!subs.length) return setStatus('Subtitle line အရင်ထည့်ပါ။');
    setBusy('subtitle'); setStatus('Gemini က subtitle ကို ပြင်ဆင်နေပါတယ်…');
    try {
      const d = await api('/api/ai/subtitle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: subs.map(s => s.text).join('\n'), targetLanguage: 'Burmese', task: 'proofread' }) });
      const lines = d.text.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      setSubs(old => old.map((s, i) => ({ ...s, text: lines[i] || s.text })));
      setStatus('Subtitle ပြင်ဆင်ပြီးပါပြီ (' + d.provider + ')');
    } catch (e) { setStatus(e.message); } finally { setBusy(''); }
  }
  function moveSubtitle(e) {
    if (!dragRef.current || !active || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    update(active.id, 'x', Math.max(5, Math.min(95, ((e.clientX - r.left) / r.width) * 100)));
    update(active.id, 'y', Math.max(8, Math.min(92, ((e.clientY - r.top) / r.height) * 100)));
  }
  async function exportVideo() {
    if (!video?.filename) return setStatus('MP4 Export အတွက် video ကို backend သို့ upload/import အောင်မြင်ရပါမယ်။ Local preview တော့ အလုပ်လုပ်နိုင်ပါတယ်။');
    setBusy('export'); setStatus('FFmpeg က MP4 ထုတ်နေပါတယ်…');
    try {
      const d = await api('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: video.filename, srt: makeSrt(subs), fontSize, marginV: 35 }) });
      setStatus('MP4 export ပြီးပါပြီ။'); window.open(apiBase.replace(/\/$/, '') + d.url, '_blank', 'noopener');
    } catch (e) { setStatus(e.message); } finally { setBusy(''); }
  }
  function downloadSrt() {
    const a = document.createElement('a'), blob = new Blob(['\uFEFF' + makeSrt(subs)], { type: 'text/plain;charset=utf-8' });
    a.href = URL.createObjectURL(blob); a.download = 'conerzone-subtitles.srt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return <div className="app-shell">
    <header className="topbar"><img src="/conerzone-logo.svg" alt="ConerZone" className="logo" onError={e => { e.currentTarget.style.display = 'none'; }}/><div className="brand"><strong>ConerZone</strong><span>AI MOVIE RECAP STUDIO</span></div><div className="spacer"/><button className="settings-toggle" onClick={() => setSettingsOpen(v => !v)}><Settings size={16}/> API Settings</button><span className="api-pill"><i/> GROQ + GEMINI</span></header>
    <main>
      {settingsOpen && <section className="panel settings-panel">
        <div className="panel-heading"><div className="section-title"><KeyRound size={18}/><h2>API Settings & Connection</h2></div><button className="text-btn" onClick={() => setSettingsOpen(false)}><X size={16}/> Close</button></div>
        <div className="settings-grid">
          <div><label>Backend API URL</label><input className="text-input" value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="https://your-backend.example.com"/><small>Vercel frontend နဲ့ backend က သီးခြား deploy လုပ်ထားရင် backend URL ထည့်ပါ။</small></div>
          <div><label>Groq API Key</label><div className="secret-input"><input className="text-input" type={showGroq ? 'text' : 'password'} autoComplete="off" value={groqKey} onChange={e => setGroqKey(e.target.value)} placeholder="gsk_…"/><button onClick={() => setShowGroq(v => !v)} aria-label="Toggle Groq key visibility">{showGroq ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div><small>Recap script generation အတွက်။</small></div>
          <div><label>Gemini API Key</label><div className="secret-input"><input className="text-input" type={showGemini ? 'text' : 'password'} autoComplete="off" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIza…"/><button onClick={() => setShowGemini(v => !v)} aria-label="Toggle Gemini key visibility">{showGemini ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div><small>Subtitle correction အတွက်။</small></div>
        </div>
        <div className="settings-actions"><button className="secondary-btn" onClick={saveSettings}><Server size={15}/> Backend URL သိမ်းမယ်</button><button className="primary-btn" disabled={working} onClick={testConnection}>{busy === 'test' ? <LoaderCircle className="spin" size={15}/> : <CheckCircle size={15}/>} Connection စမ်းမယ်</button></div>
        {connection && <div className="connection-success"><CheckCircle size={15}/>{connection}</div>}
        <p className="tiny-note">API Key များကို ဒီ browser မှာ မသိမ်းထားပါ။ HTTPS backend ကိုသာ အသုံးပြုပါ။ Page ကို refresh လုပ်လျှင် key များကို ပြန်ထည့်ရပါမယ်။</p>
      </section>}
      <section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> CREATOR WORKSPACE</div><h1>Movie Recap <span>Studio</span></h1><p>ရုပ်ရှင်တင်ပါ၊ Recap ဖန်တီးပါ၊ မြန်မာစာတန်းထိုးပြင်ပြီး Export လုပ်ပါ။</p></div><div className="hero-icon"><Film size={34}/></div></section>
      <div className="workspace">
        <aside className="panel sidebar">
          <div className="section-title"><Upload size={17}/><h2>Video Source</h2></div>
          <button className="upload-zone" disabled={working} onClick={() => fileRef.current?.click()}><FileVideo size={27}/><b>Video Upload</b><span>MP4 · MOV · WEBM · MKV</span><small>ဖိုင်ရွေးရန် နှိပ်ပါ</small></button>
          <input ref={fileRef} hidden type="file" accept="video/*,.mkv" onChange={e => uploadFile(e.target.files?.[0])}/>
          <div className="or">OR IMPORT BY URL</div><div className="url-field"><LinkIcon size={16}/><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/video.mp4"/></div>
          <button className="secondary-btn full" disabled={working || !url.trim()} onClick={importUrl}>{busy === 'url' ? <LoaderCircle className="spin" size={15}/> : null} Preview / Import URL</button>
          <div className="divider"/>
          <div className="section-title"><Sparkles size={17}/><h2>AI Recap Writer</h2><span className="provider-tag">GROQ</span></div>
          <label>ရုပ်ရှင်အမည်</label><input className="text-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Movie title…"/>
          <label>ဇာတ်လမ်းအချက်အလက် / Notes</label><textarea className="text-input notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ဇာတ်လမ်းအကြောင်း၊ ဇာတ်ကောင်၊ အရေးကြီး scene များ…"/>
          <button className="primary-btn full" disabled={working} onClick={createRecap}>{busy === 'recap' ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>} Recap Script ဖန်တီးမယ်</button>
          <p className="tiny-note">API Key ကို Settings ထဲထည့်ပြီးမှ AI feature ကို သုံးနိုင်ပါတယ်။</p>
        </aside>
        <section className="editor-column">
          <div className="panel">
            <div className="panel-heading"><div className="section-title"><Film size={17}/><h2>Preview & Subtitle Editor</h2></div><span className="live-tag">LIVE PREVIEW</span></div>
            <div ref={stageRef} className="video-stage" onPointerMove={moveSubtitle} onPointerUp={() => { dragRef.current = false; }} onPointerCancel={() => { dragRef.current = false; }}>
              {video ? <video key={video.src} src={video.src} controls playsInline preload="metadata" onError={() => setStatus('Preview မဖွင့်နိုင်ပါ။ Video format သို့မဟုတ် URL ကို စစ်ပါ။')}/> : <div className="empty-preview"><Film size={36}/><b>Video Preview</b><span>Video upload လုပ်ပါ</span></div>}
              {video && active && <div className="subtitle-overlay" style={{ left: active.x + '%', top: active.y + '%', fontSize: fontSize + 'px' }} onPointerDown={e => { e.preventDefault(); dragRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}>{active.text}</div>}
            </div>
            <div className="preview-foot"><span>{video ? video.name : 'No video loaded'}</span><span>{video?.filename ? 'Server upload ready' : 'Local preview · server upload required for MP4 export'}</span></div>
          </div>
          <div className="panel">
            <div className="panel-heading"><div className="section-title"><Subtitles size={17}/><h2>Subtitle Tracks</h2></div><button className="text-btn" onClick={() => { const id = Math.max(0, ...subs.map(s => s.id)) + 1; setSubs(old => [...old, { id, start: '00:00:08,000', end: '00:00:12,000', text: 'စာတန်းအသစ် ရေးပါ…', x: 50, y: 84 }]); setSelected(id); }}>+ Add line</button></div>
            <div className="subtitle-list">{subs.map(s => <div key={s.id} className={'subtitle-row ' + (selected === s.id ? 'selected' : '')} onClick={() => setSelected(s.id)}><div className="sub-index">{String(s.id).padStart(2, '0')}</div><div className="sub-fields"><div className="time-fields"><input aria-label="Start time" value={s.start} onChange={e => update(s.id, 'start', e.target.value)}/><span>→</span><input aria-label="End time" value={s.end} onChange={e => update(s.id, 'end', e.target.value)}/></div><textarea rows={2} value={s.text} onChange={e => update(s.id, 'text', e.target.value)}/></div><button className="remove-btn" title="Remove subtitle" onClick={e => { e.stopPropagation(); setSubs(old => old.filter(x => x.id !== s.id)); }}>×</button></div>)}</div>
            <div className="subtitle-tools"><label className="font-control">Font size <input type="range" min="16" max="48" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}/><b>{fontSize}px</b></label><button className="secondary-btn" disabled={working || !subs.length} onClick={improveSubs}>{busy === 'subtitle' ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>} Gemini နဲ့ ပြင်မယ်</button></div>
            <div className="export-row"><button className="secondary-btn" disabled={!subs.length} onClick={downloadSrt}><Download size={15}/> SRT Download</button><button className="primary-btn" disabled={working || !video?.filename || !subs.length} onClick={exportVideo}>{busy === 'export' ? <LoaderCircle className="spin" size={15}/> : <Download size={15}/>} MP4 Export</button></div>
          </div>
          {script ? <div className="panel"><div className="panel-heading"><div className="section-title"><Sparkles size={17}/><h2>Generated Recap Script</h2></div><button className="text-btn" onClick={() => { navigator.clipboard.writeText(script); setStatus('Script copied.'); }}>Copy</button></div><textarea className="script-output" value={script} onChange={e => setScript(e.target.value)} rows={10}/><button className="secondary-btn" onClick={() => { const lines = script.split(/(?<=[.!?။])\s+/).filter(Boolean); if (!lines.length) return; setSubs(lines.map((text, i) => ({ id: i + 1, start: '00:00:' + String(i * 4).padStart(2, '0') + ',000', end: '00:00:' + String(i * 4 + 4).padStart(2, '0') + ',000', text, x: 50, y: 84 }))); setSelected(1); setStatus('Script ကို subtitle lines အဖြစ် ပြောင်းထားပါတယ်။'); }}>Script မှ Subtitle Lines ဖန်တီးမယ်</button></div> : null}
          <div className="status-line"><span className="status-dot"/><span>{working ? 'လုပ်ဆောင်နေပါတယ်… ' : ''}{status}</span></div>
        </section>
      </div>
      <footer>CONERZONE <span>•</span> GROQ + GEMINI <span>•</span> FFmpeg video engine</footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
