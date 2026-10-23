import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Link as LinkIcon, Sparkles, Film, Subtitles, Download, LoaderCircle, FileVideo, Clapperboard, Trash2 } from 'lucide-react';
import './style.css';

const API = (import.meta.env.VITE_API_BASE || 'http://localhost:8787').replace(/\/$/, '');
const seed = [
  { id: 1, start: '00:00:01,000', end: '00:00:04,000', text: 'ConerZone မှ ကြိုဆိုပါတယ်။', x: 50, y: 84 },
  { id: 2, start: '00:00:04,000', end: '00:00:08,000', text: 'သင့်ရဲ့ Movie Recap ကို စတင်လိုက်ပါ။', x: 50, y: 84 }
];
const srtTime = value => String(value || '').trim().replace('.', ',');
const makeSrt = rows => rows.map((s, i) => (i + 1) + '\n' + srtTime(s.start) + ' --> ' + srtTime(s.end) + '\n' + s.text + '\n').join('\n');
async function api(path, options) {
  const res = await fetch(API + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}
function App() {
  const [video, setVideo] = useState(null), [url, setUrl] = useState('');
  const [busy, setBusy] = useState(''), [status, setStatus] = useState('Video upload လုပ်ပါ သို့မဟုတ် direct video URL ထည့်ပါ။');
  const [subs, setSubs] = useState(seed), [selected, setSelected] = useState(1), [fontSize, setFontSize] = useState(26);
  const [title, setTitle] = useState(''), [notes, setNotes] = useState(''), [script, setScript] = useState('');
  const fileRef = useRef(null), stageRef = useRef(null), dragRef = useRef(false);
  const active = subs.find(s => s.id === selected) || subs[0];
  const working = Boolean(busy);
  const update = (id, key, value) => setSubs(old => old.map(s => s.id === id ? { ...s, [key]: value } : s));
  async function uploadFile(file) {
    if (!file) return;
    setBusy('upload'); setStatus('Video upload လုပ်နေပါတယ်…');
    try {
      const fd = new FormData(); fd.append('video', file);
      const d = await api('/api/upload', { method: 'POST', body: fd });
      setVideo({ ...d, src: API + d.url }); setStatus('Upload ပြီးပါပြီ — ' + d.name);
    } catch (e) { setStatus(e.message); } finally { setBusy(''); }
  }
  async function importUrl() {
    setBusy('url'); setStatus('Direct URL မှ video ယူနေပါတယ်…');
    try {
      const d = await api('/api/import-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      setVideo({ ...d, src: API + d.url }); setStatus('URL import ပြီးပါပြီ — ' + d.name);
    } catch (e) { setStatus(e.message); } finally { setBusy(''); }
  }
  async function createRecap() {
    setBusy('recap'); setStatus('AI routing က recap အတွက် Groq ကို အသုံးပြုနေပါတယ်…');
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
    if (!video) return setStatus('Export မလုပ်ခင် video တင်ပါ။');
    setBusy('export'); setStatus('FFmpeg က MP4 ထုတ်နေပါတယ်…');
    try {
      const d = await api('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: video.filename, srt: makeSrt(subs), fontSize, marginV: 35 }) });
      setStatus('MP4 export ပြီးပါပြီ။'); window.open(API + d.url, '_blank', 'noopener');
    } catch (e) { setStatus(e.message); } finally { setBusy(''); }
  }
  function downloadSrt() {
    const a = document.createElement('a'), blob = new Blob(['\uFEFF' + makeSrt(subs)], { type: 'text/plain;charset=utf-8' });
    a.href = URL.createObjectURL(blob); a.download = 'conerzone-subtitles.srt'; a.click(); URL.revokeObjectURL(a.href);
  }
  return <div className="app-shell">
    <header className="topbar"><img src="/conerzone-logo.svg" alt="ConerZone" className="logo" onError={e => { e.currentTarget.style.display = 'none'; }}/><div className="brand"><strong>ConerZone</strong><span>AI MOVIE RECAP STUDIO</span></div><div className="spacer"/><span className="api-pill"><i/> GROQ + GEMINI</span></header>
    <main>
      <section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> CREATOR WORKSPACE</div><h1>Movie Recap <span>Studio</span></h1><p>ရုပ်ရှင်တင်ပါ၊ Recap ဖန်တီးပါ၊ မြန်မာစာတန်းထိုးပြင်ပြီး Export လုပ်ပါ။</p></div><div className="hero-icon"><Film size={34}/></div></section>
      <div className="workspace">
        <aside className="panel sidebar">
          <div className="section-title"><Upload size={17}/><h2>Video Source</h2></div>
          <button className="upload-zone" disabled={working} onClick={() => fileRef.current && fileRef.current.click()}><FileVideo size={27}/><b>Video Upload</b><span>MP4 · MOV · WEBM · MKV</span><small>ဖိုင်ရွေးရန် နှိပ်ပါ</small></button>
          <input ref={fileRef} hidden type="file" accept="video/*,.mkv" onChange={e => uploadFile(e.target.files && e.target.files[0])}/>
          <div className="or">OR IMPORT BY URL</div><div className="url-field"><LinkIcon size={16}/><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/video.mp4"/></div>
          <button className="secondary-btn full" disabled={working || !url.trim()} onClick={importUrl}>{busy === 'url' ? <LoaderCircle className="spin" size={15}/> : null} URL မှ ယူမယ်</button>
          <div className="divider"/>
          <div className="section-title"><Sparkles size={17}/><h2>AI Recap Writer</h2><span className="provider-tag">GROQ</span></div>
          <label>ရုပ်ရှင်အမည်</label><input className="text-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Movie title…"/>
          <label>ဇာတ်လမ်းအချက်အလက် / Notes</label><textarea className="text-input notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ဇာတ်လမ်းအကြောင်း၊ ဇာတ်ကောင်၊ အရေးကြီး scene များ…"/>
          <button className="primary-btn full" disabled={working} onClick={createRecap}>{busy === 'recap' ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>} Recap Script ဖန်တီးမယ်</button>
          <p className="tiny-note">ဇာတ်လမ်းအချက်အလက် မပေးထားလျှင် AI က ရုပ်ရှင်ကို ကြည့်ပြီးသားဟု မယူဆပါ။</p>
        </aside>
        <section className="editor-column">
          <div className="panel">
            <div className="panel-heading"><div className="section-title"><Film size={17}/><h2>Preview & Subtitle Editor</h2></div><span className="live-tag">LIVE PREVIEW</span></div>
            <div ref={stageRef} className="video-stage" onPointerMove={moveSubtitle} onPointerUp={() => { dragRef.current = false; }} onPointerLeave={() => { dragRef.current = false; }}>
              {video ? <video src={video.src} controls playsInline/> : <div className="empty-preview"><Film size={36}/><b>Video Preview</b><span>Video upload လုပ်ပါ</span></div>}
              {video && active && <div className="subtitle-overlay" style={{ left: active.x + '%', top: active.y + '%', fontSize: fontSize + 'px' }} onPointerDown={e => { e.preventDefault(); dragRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}>{active.text}</div>}
            </div>
            <div className="preview-foot"><span>{video ? video.name : 'No video loaded'}</span><span>Subtitle ကို ဖိဆွဲပြီး နေရာရွှေ့ပါ</span></div>
          </div>
          <div className="panel">
            <div className="panel-heading"><div className="section-title"><Subtitles size={17}/><h2>Subtitle Tracks</h2></div><button className="text-btn" onClick={() => { const id = Math.max(0, ...subs.map(s => s.id)) + 1; setSubs(old => [...old, { id, start: '00:00:08,000', end: '00:00:12,000', text: 'စာတန်းအသစ် ရေးပါ…', x: 50, y: 84 }]); setSelected(id); }}>+ Add line</button></div>
            <div className="subtitle-list">{subs.map(s => <div key={s.id} className={'subtitle-row ' + (selected === s.id ? 'selected' : '')} onClick={() => setSelected(s.id)}><div className="sub-index">{String(s.id).padStart(2, '0')}</div><div className="sub-fields"><div className="time-fields"><input aria-label="Start time" value={s.start} onChange={e => update(s.id, 'start', e.target.value)}/><span>→</span><input aria-label="End time" value={s.end} onChange={e => update(s.id, 'end', e.target.value)}/></div><textarea rows={2} value={s.text} onChange={e => update(s.id, 'text', e.target.value)}/></div><button className="remove-btn" title="Remove subtitle" onClick={e => { e.stopPropagation(); setSubs(old => old.filter(x => x.id !== s.id)); }}>×</button></div>)}</div>
            <div className="subtitle-tools"><label className="font-control">Font size <input type="range" min="16" max="48" value={fontSize} onChange={e => setFontSize(Number(e.target.value))}/><b>{fontSize}px</b></label><button className="secondary-btn" disabled={working || !subs.length} onClick={improveSubs}>{busy === 'subtitle' ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>} Gemini နဲ့ ပြင်မယ်</button></div>
            <div className="export-row"><button className="secondary-btn" disabled={!subs.length} onClick={downloadSrt}><Download size={15}/> SRT Download</button><button className="primary-btn" disabled={working || !video || !subs.length} onClick={exportVideo}>{busy === 'export' ? <LoaderCircle className="spin" size={15}/> : <Download size={15}/>} MP4 Export</button></div>
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
