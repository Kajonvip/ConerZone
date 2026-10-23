import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Link as LinkIcon, Sparkles, Film, Subtitles, Download, LoaderCircle, FileVideo, Settings2, Eye, EyeOff, CheckCircle, KeyRound, Volume2, Mic2, Play, Trash2 } from 'lucide-react';
import './style.css';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8787').replace(/\/$/, '');

const seed = [{ id: 1, start: '00:00:00,000', end: '00:00:04,000', text: 'ConerZone မှ ကြိုဆိုပါတယ်။', x: 50, y: 68 }];
const stamp = n => { const ms = Math.max(0, Math.round(n * 1000)); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), z = ms % 1000; return [h,m,s].map(v => String(v).padStart(2,'0')).join(':') + ',' + String(z).padStart(3,'0'); };
const parseTime = t => { const p = String(t).replace(',', '.').split(':'); return (Number(p[0]||0)*3600 + Number(p[1]||0)*60 + Number(p[2]||0)); };
const makeSrt = rows => rows.map((s,i) => (i+1) + '\n' + s.start.replace('.', ',') + ' --> ' + s.end.replace('.', ',') + '\n' + s.text + '\n').join('\n');
const splitScript = text => text.split(/(?<=[.!?။])\s+/).map(s => s.trim()).filter(Boolean);

function App() {
  const [groqKey, setGroqKey] = useState(''), [geminiKey, setGeminiKey] = useState('');
  const [showGroq, setShowGroq] = useState(false), [showGemini, setShowGemini] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true), [connection, setConnection] = useState('');
  const [video, setVideo] = useState(null), [url, setUrl] = useState(''), [previewEnabled, setPreviewEnabled] = useState(false);
  const [analysis, setAnalysis] = useState(null), [scenePlan, setScenePlan] = useState([]), [backendFilename, setBackendFilename] = useState('');
  const [busy, setBusy] = useState(''), [status, setStatus] = useState('Video ဖိုင်ရွေးပါ။ ရွေးပြီးတာနဲ့ ဒီနေရာမှာပဲ preview ပေါ်လာပါမယ်။');
  const [subs, setSubs] = useState(seed), [selected, setSelected] = useState(1), [fontSize, setFontSize] = useState(25);
  const [blur, setBlur] = useState(8), [bgOpacity, setBgOpacity] = useState(68), [borderRadius, setBorderRadius] = useState(8);
  const [volume, setVolume] = useState(1), [title, setTitle] = useState(''), [notes, setNotes] = useState(''), [script, setScript] = useState('');
  const [voiceGender, setVoiceGender] = useState('female'), [voiceMode, setVoiceMode] = useState('story'), [voiceName, setVoiceName] = useState('my-MM');
  const fileRef = useRef(null), stageRef = useRef(null), dragRef = useRef(false), videoRef = useRef(null), objectUrlRef = useRef('');
  const active = subs.find(s => s.id === selected) || subs[0];
  const working = Boolean(busy);

  useEffect(() => { const boot = document.getElementById('boot-screen'); if (boot) boot.remove(); return () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); if (window.speechSynthesis) window.speechSynthesis.cancel(); }; }, []);
  useEffect(() => { if (videoRef.current) videoRef.current.volume = volume; }, [volume, video]);
  const update = (id, key, value) => setSubs(old => old.map(s => s.id === id ? { ...s, [key]: value } : s));

  function uploadFile(file) {
    if (!file) return;
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v|mkv|avi)$/i.test(file.name)) { setStatus('Video ဖိုင်မဟုတ်ပါ။ MP4 (H.264) ဖိုင်ကို ရွေးပါ။'); return; }
    if (file.size > 1024 * 1024 * 1024) { setStatus('ဒီဖိုင်က 1GB ထက်ကြီးပါတယ်။ ဖုန်း browser မလေးအောင် 1GB အောက် MP4 (H.264) ဖိုင်ကို အသုံးပြုပါ။'); return; }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const src = URL.createObjectURL(file); objectUrlRef.current = src;
    setVideo({ name: file.name, src, file, duration: 0, width: 0, height: 0 }); setPreviewEnabled(false); setStatus(file.size > 500 * 1024 * 1024 ? 'Video တင်ပြီးပါပြီ။ ဖိုင်ကြီးလို့ စတင်ဖွင့်ရန် အချိန်ယူနိုင်ပါတယ်။ MP4 (H.264) သုံးပါက ပိုချောမွေ့ပါမယ်။' : 'Local video ကို preview မှာ တင်ပြီးပါပြီ။ Play ခလုတ်ကို နှိပ်ကြည့်နိုင်ပါတယ်။');
    setScript(''); setSubs(seed); setSelected(1);
  }
  function importUrl() {
    if (!url.trim()) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = '';
    setVideo({ name: url.trim().split('/').pop().split('?')[0] || 'Remote video', src: url.trim(), duration: 0, width: 0, height: 0 }); setPreviewEnabled(false);
    setStatus('URL preview ထည့်ထားပါပြီ။ Website အချို့က browser playback ကို ပိတ်ထားနိုင်ပါတယ်။');
  }
  async function groqChat(prompt) {
    if (!groqKey.trim()) throw new Error('API Settings ထဲမှာ Groq API Key ထည့်ပါ။');
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + groqKey.trim() }, body: JSON.stringify({ model: 'llama-3.3-70b-versatile', temperature: 0.7, messages: [{ role: 'system', content: 'You are ConerZone, an expert movie recap writer. Write original Burmese-language narration. Do not claim to have watched a video unless the user supplies plot details. Avoid copying dialogue verbatim.' }, { role: 'user', content: prompt }] }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || 'Groq API request မအောင်မြင်ပါ။'); return d.choices?.[0]?.message?.content?.trim() || '';
  }
  async function geminiText(prompt) {
    if (!geminiKey.trim()) throw new Error('API Settings ထဲမှာ Gemini API Key ထည့်ပါ။');
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(geminiKey.trim()), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error?.message || 'Gemini API request မအောင်မြင်ပါ။'); return d.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() || '';
  }
  async function testKeys() {
    setBusy('test'); setConnection(''); setStatus('API Key များကို စမ်းသပ်နေပါတယ်…');
    try {
      const tests = [];
      if (groqKey.trim()) { await groqChat('Reply with exactly: GROQ OK'); tests.push('Groq OK'); }
      if (geminiKey.trim()) { await geminiText('Reply with exactly: GEMINI OK'); tests.push('Gemini OK'); }
      if (!tests.length) throw new Error('Groq သို့မဟုတ် Gemini API Key တစ်ခု အနည်းဆုံးထည့်ပါ။');
      setConnection(tests.join(' · ')); setStatus('API Key စမ်းသပ်မှု ပြီးပါပြီ။');
    } catch(e) { setStatus(e.message); } finally { setBusy(''); }
  }
  async function createRecap() {
    setBusy('recap'); setStatus('Groq AI က မြန်မာ recap script ရေးနေပါတယ်…');
    try {
      const text = await groqChat('Create an original Burmese movie recap narration, around 3–5 minutes when read aloud. Movie title: ' + (title || 'မသတ်မှတ်ရသေး') + '. Plot/scene notes supplied by user: ' + (notes || 'အသေးစိတ်ဇာတ်လမ်းအချက်အလက် မပေးထားပါ။ မသိသော scene များကို အမှန်အတိုင်းမတီထွင်ဘဲ user ပေးထားသည့်အချက်အလက်ကိုသာ အခြေခံပါ။') + '. Output narration only in natural spoken Burmese, split into short paragraphs, no headings or markdown.');
      setScript(text); const lines = splitScript(text);
      setSubs(lines.map((line,i) => ({ id:i+1, start:stamp(i*4.5), end:stamp((i+1)*4.5), text:line, x:50, y:82 })));
      setSelected(1); setStatus('Recap script နဲ့ subtitle lines ဖန်တီးပြီးပါပြီ။ အချိန်တွေကို စကားပြောအမြန်နှုန်းနဲ့ ကိုက်အောင် ပြန်ညှိပါ။');
    } catch(e) { setStatus(e.message); } finally { setBusy(''); }
  }
  async function improveSubs() {
    if (!subs.length) return setStatus('Subtitle line မရှိသေးပါ။ Recap ဖန်တီးပါ သို့မဟုတ် line ထည့်ပါ။');
    setBusy('subtitle'); setStatus('Gemini က မြန်မာစာတန်းထိုးကို ပြင်နေပါတယ်…');
    try {
      const fixed = await geminiText('Proofread and improve the following Burmese subtitle lines. Keep the same number of lines and return only the corrected lines, one per line. Do not add numbering or explanation.\n\n' + subs.map(s=>s.text).join('\n'));
      const lines = fixed.split(/\r?\n/).map(s=>s.replace(/^\s*\d+[.)、]\s*/, '').trim()).filter(Boolean);
      setSubs(old => old.map((s,i)=>({...s,text:lines[i] || s.text}))); setStatus('Gemini subtitle ပြင်ဆင်ပြီးပါပြီ။');
    } catch(e) { setStatus(e.message); } finally { setBusy(''); }
  }
  function moveSubtitle(e) {
    if (!dragRef.current || !active || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    update(active.id, 'x', Math.max(5,Math.min(95,((e.clientX-r.left)/r.width)*100)));
    update(active.id, 'y', Math.max(8,Math.min(92,((e.clientY-r.top)/r.height)*100)));
  }
  function downloadSrt() {
    if (!subs.length) return setStatus('SRT ထုတ်ရန် subtitle line မရှိသေးပါ။');
    const a=document.createElement('a'), blob=new Blob(['\uFEFF'+makeSrt(subs)],{type:'text/plain;charset=utf-8'});
    a.href=URL.createObjectURL(blob); a.download='conerzone-myanmar-recap.srt'; a.click(); URL.revokeObjectURL(a.href); setStatus('SRT ဖိုင် download စတင်ပါပြီ။');
  }
  function speakScript() {
    if (!script) return setStatus('အသံနားထောင်ရန် Recap Script အရင်ဖန်တီးပါ။');
    if (!('speechSynthesis' in window)) return setStatus('ဒီ browser မှာ Speech playback မရနိုင်ပါ။');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = voiceName; utterance.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const matching = voices.filter(v => /my|burmese/i.test(v.lang + ' ' + v.name));
    if (matching.length) utterance.voice = matching.find(v => voiceGender === 'male' ? /male|man|david/i.test(v.name) : /female|woman|zira/i.test(v.name)) || matching[0];
    utterance.onstart = () => setStatus('Browser မှာ voice preview ဖွင့်နေပါတယ်။ Myanmar voice မရှိလျှင် အသံမမှန်နိုင်ပါ။');
    utterance.onerror = () => setStatus('ဒီဖုန်း/browser မှာ Burmese voice မရနိုင်ပါ။'); window.speechSynthesis.speak(utterance);
  }

  async function analyzeMovie() {
    if (!video) return setStatus('Analyze လုပ်ရန် ရုပ်ရှင်ဖိုင်အရင်ရွေးပါ။');
    if (!geminiKey.trim()) return setStatus('Movie Analysis အတွက် Gemini API Key ထည့်ပါ။');
    setBusy('analyze'); setStatus('Video ကို backend ဆီတင်ပြီး scene များ ခွဲခြမ်းစိတ်ဖြာနေပါတယ်…');
    try {
      let uploaded;
      if (video.file) {
        const form = new FormData(); form.append('video', video.file);
        const up = await fetch(API_BASE + '/api/upload', {method:'POST',body:form});
        const d = await up.json(); if (!up.ok) throw new Error(d.error || 'Video upload မအောင်မြင်ပါ။'); uploaded=d;
      } else {
        const up = await fetch(API_BASE + '/api/import-url', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:video.src})});
        const d = await up.json(); if (!up.ok) throw new Error(d.error || 'Video URL import မအောင်မြင်ပါ။'); uploaded=d;
      }
      setBackendFilename(uploaded.filename);
      setStatus('FFmpeg က scene cut နဲ့ keyframe တွေရှာပြီး Gemini Vision က frame များကို ဖော်ပြနေပါတယ်…');
      const r = await fetch(API_BASE + '/api/analyze-movie',{method:'POST',headers:{'Content-Type':'application/json','x-gemini-api-key':geminiKey.trim()},body:JSON.stringify({filename:uploaded.filename,sampleLimit:12})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error || 'Movie analysis မအောင်မြင်ပါ။');
      setAnalysis(d); setScenePlan([]); setStatus('Movie analysis ပြီးပါပြီ။ Scene Timeline ကို စစ်ပြီး Auto Select Scenes ကိုနှိပ်ပါ။');
    } catch(e) { setStatus('Analyze Movie မအောင်မြင်ပါ: '+e.message+' — Backend deploy နဲ့ Gemini key ကို စစ်ပါ။'); }
    finally { setBusy(''); }
  }
  async function autoSelectScenes() {
    if (!analysis?.scenes?.length) return setStatus('Scene analysis အရင်လုပ်ပါ။');
    if (!script.trim()) return setStatus('Scene ရွေးရန် မြန်မာ Recap Script အရင်ဖန်တီးပါ။');
    if (!geminiKey.trim()) return setStatus('Auto Select Scenes အတွက် Gemini API Key ထည့်ပါ။');
    setBusy('select-scenes'); setStatus('Gemini က narration နဲ့ scene များကို ကိုက်ညီအောင် timeline စီစဉ်နေပါတယ်…');
    try {
      const targetDuration=Math.min(7200,Math.max(180,Math.round((video?.duration || analysis.duration)*0.1)));
      const r=await fetch(API_BASE+'/api/ai/scene-plan',{method:'POST',headers:{'Content-Type':'application/json','x-gemini-api-key':geminiKey.trim()},body:JSON.stringify({script,scenes:analysis.scenes,targetDuration})});
      const d=await r.json(); if(!r.ok) throw new Error(d.error||'Scene plan မအောင်မြင်ပါ။');
      setScenePlan(d.selections||[]); setStatus('AI Scene Timeline ဖန်တီးပြီးပါပြီ။ လက်ရှိအဆင့်မှာ render က မူရင်း video ကိုသုံးနေသေးပြီး scene-cut rendering ကို ဆက်ချိတ်ရပါမယ်။');
    } catch(e) { setStatus('Auto Select Scenes မအောင်မြင်ပါ: '+e.message); }
    finally { setBusy(''); }
  }

  async function renderFinalMp4() {
    if (!video) return setStatus('MP4 ထုတ်ရန် video အရင်တင်ပါ။');
    if (!subs.length) return setStatus('MP4 ထုတ်ရန် subtitle line မရှိပါ။');
    const narration = (script || subs.map(s => s.text).join(' ')).trim();
    if (!narration) return setStatus('အသံထုတ်ရန် Recap Script အရင်ဖန်တီးပါ။');
    setBusy('render'); setStatus('Video ကို backend ဆီ upload လုပ်နေပါတယ်…');
    try {
      let uploaded;
      if (video.file) {
        const form = new FormData(); form.append('video', video.file);
        const up = await fetch(API_BASE + '/api/upload', { method: 'POST', body: form });
        const ud = await up.json(); if (!up.ok) throw new Error(ud.error || 'Video upload မအောင်မြင်ပါ။'); uploaded = ud;
      } else {
        const up = await fetch(API_BASE + '/api/import-url', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({url: video.src}) });
        const ud = await up.json(); if (!up.ok) throw new Error(ud.error || 'URL မှ video import မအောင်မြင်ပါ။'); uploaded = ud;
      }
      setStatus('မြန်မာ AI voice ထုတ်နေပါတယ်…');
      const tr = await fetch(API_BASE + '/api/tts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({text:narration, gender:voiceGender}) });
      const td = await tr.json(); if (!tr.ok) throw new Error(td.error || 'Burmese TTS မအောင်မြင်ပါ။');
      setStatus('Video + voice + subtitle ကို MP4 အဖြစ် render လုပ်နေပါတယ်…');
      const er = await fetch(API_BASE + '/api/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({filename:uploaded.filename, audioFilename:td.filename, srt:makeSrt(subs), fontSize, marginV:40}) });
      const ed = await er.json(); if (!er.ok) throw new Error(ed.error || 'MP4 rendering မအောင်မြင်ပါ။');
      const a=document.createElement('a'); a.href=API_BASE+ed.url; a.download=ed.filename || 'conerzone-recap.mp4'; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove();
      setStatus('MP4 အပြီးသတ်ပါပြီ။ Download စတင်ပါပြီ။');
    } catch(e) { setStatus('MP4 export မအောင်မြင်ပါ: ' + e.message + ' — Backend URL, FFmpeg, Python edge-tts နဲ့ CORS settings ကို စစ်ပါ။'); }
    finally { setBusy(''); }
  }
  function addLine() {
    const id=Math.max(0,...subs.map(s=>s.id))+1, last=subs.length?parseTime(subs[subs.length-1].end):0;
    setSubs(old=>[...old,{id,start:stamp(last),end:stamp(last+4),text:'မြန်မာစာတန်းထိုးကို ဒီမှာရေးပါ…',x:50,y:82}]); setSelected(id);
  }
  return <div className="app-shell">
    <header className="topbar"><div className="brand-mark">CZ</div><div className="brand"><strong>ConerZone</strong><span>AI MOVIE RECAP STUDIO</span></div><div className="spacer"/><button className="settings-toggle" onClick={()=>setSettingsOpen(v=>!v)}><Settings2 size={16}/> API Settings</button><span className="api-pill">GROQ + GEMINI</span></header>
    <main>
      {settingsOpen && <section className="panel settings-panel">
        <div className="panel-heading"><div className="section-title"><KeyRound size={18}/><h2>AI API Settings</h2></div><span className="tiny-note">API Key သာလိုအပ်သည်</span></div>
        <div className="settings-grid">
          <div><label>Groq API Key</label><div className="secret-input"><input className="text-input" type={showGroq?'text':'password'} autoComplete="off" value={groqKey} onChange={e=>setGroqKey(e.target.value)} placeholder="gsk_…"/><button onClick={()=>setShowGroq(v=>!v)} aria-label="Groq key ပြ/ဖျောက်">{showGroq?<EyeOff size={16}/>:<Eye size={16}/>}</button></div><small>မြန်မာ Movie Recap Script ဖန်တီးရန်။</small></div>
          <div><label>Gemini API Key</label><div className="secret-input"><input className="text-input" type={showGemini?'text':'password'} autoComplete="off" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIza…"/><button onClick={()=>setShowGemini(v=>!v)} aria-label="Gemini key ပြ/ဖျောက်">{showGemini?<EyeOff size={16}/>:<Eye size={16}/>}</button></div><small>မြန်မာစာတန်းထိုး စစ်ဆေးပြင်ဆင်ရန်။</small></div>
        </div>
        <div className="settings-actions"><button className="primary-btn" disabled={working} onClick={testKeys}>{busy==='test'?<LoaderCircle className="spin" size={15}/>:<CheckCircle size={15}/>} API Key စမ်းမယ်</button></div>
        {connection&&<div className="connection-success"><CheckCircle size={15}/>{connection}</div>}
        <p className="tiny-note">သတိပြုရန် — ဒီပုံစံမှာ API Key ကို browser ကနေ AI provider ဆီ တိုက်ရိုက်ပို့ပါတယ်။ ကိုယ်ပိုင်အသုံးပြုမှုအတွက်သာ key ထည့်ပြီး အများသုံး website အဖြစ်မဖြန့်ဝေပါနှင့်။</p>
      </section>}
      <section className="hero"><div><div className="eyebrow"><Sparkles size={14}/> MOVIE RECAP WORKFLOW</div><h1>Movie Recap <span>Studio</span></h1><p>Video တင်ပါ → မြန်မာ recap ရေးပါ → အသံ preview နားထောင်ပါ → စာတန်းထိုးပြင်ပါ။</p></div><div className="hero-icon"><Film size={32}/></div></section>
      <div className="workspace">
        <aside className="panel sidebar">
          <div className="section-title"><Upload size={17}/><h2>၁။ Video တင်ရန်</h2></div>
          {!video && <button className="upload-zone" onClick={()=>fileRef.current?.click()}><FileVideo size={28}/><b>Video Upload</b><span>MP4 · MOV · WEBM · MKV</span><small>ဖိုင်ရွေးရန် နှိပ်ပါ</small></button>}
          <input ref={fileRef} hidden type="file" accept="video/*,.mkv" onChange={e=>{uploadFile(e.target.files?.[0]);e.target.value="";}}/>
          {video && <div className="inline-preview">
            <div className="inline-preview-head"><b>Video Preview</b><button className="text-btn" onClick={()=>fileRef.current?.click()}>ပြောင်းရွေးရန်</button></div>
            <div ref={stageRef} className={"video-stage "+(video.width && video.height && video.height>video.width ? "portrait-stage" : "landscape-stage")} style={{aspectRatio:video.width&&video.height?video.width+"/"+video.height:"16/9",width:video.width&&video.height&&video.height>video.width?"min(100%, 250px)":"100%"}} onPointerMove={moveSubtitle} onPointerUp={()=>{dragRef.current=false;}} onPointerCancel={()=>{dragRef.current=false;}}>
              {!previewEnabled ? <button className="safe-preview-start" onClick={()=>setPreviewEnabled(true)}><Play size={24}/><b>Preview ဖွင့်ရန် နှိပ်ပါ</b><span>ဖိုင်တင်ပြီးပါပြီ။ ဖုန်း browser အဆင်ပြေစေရန် video ကို ဒီခလုတ်နှိပ်မှ ဖွင့်ပါမယ်။</span></button> : <video ref={videoRef} key={video.src} src={video.src} controls playsInline webkit-playsinline="true" preload="auto" onLoadStart={()=>setStatus('Video ဖိုင်ကို browser ထဲသို့ ဖတ်နေပါတယ်…')} onLoadedMetadata={e=>{const el=e.currentTarget;setVideo(old=>old?{...old,duration:Number.isFinite(el.duration)?el.duration:0,width:el.videoWidth||old.width,height:el.videoHeight||old.height}:old);setStatus('Video အချက်အလက် ဖတ်ပြီးပါပြီ။ Play ခလုတ်ကိုနှိပ်ပါ။');}} onCanPlay={()=>setStatus('Video ဖွင့်ရန် အဆင်သင့်ပါပြီ။ Video ပေါ်က Play ခလုတ်ကိုနှိပ်ပါ။')} onError={e=>{const el=e.currentTarget;const code=el.error?.code;const reason=({1:'ဖွင့်ခြင်းကို ရပ်တန့်လိုက်ပါတယ်။',2:'ဖိုင်ဖတ်ရာတွင် အမှားရှိပါတယ်။',3:'Video codec ကို ဒီ browser က decode မလုပ်နိုင်ပါ။',4:'ဒီဖိုင်ပုံစံကို browser က မထောက်ပံ့ပါ။'})[code]||'Video ဖွင့်မရပါ။';setStatus(reason+' MP4 (H.264 video + AAC audio) ဖိုင်ဖြင့် ထပ်စမ်းပါ။ (MediaError '+(code||'မသိ')+')');}}/>}
              {previewEnabled && active && <div className="subtitle-overlay" style={{left:active.x+'%',top:active.y+'%',fontSize:fontSize+'px',backdropFilter:'blur('+blur+'px)',WebkitBackdropFilter:'blur('+blur+'px)',background:'rgba(0,0,0,'+(bgOpacity/100)+')',borderRadius:borderRadius+'px'}} onPointerDown={e=>{e.preventDefault();dragRef.current=true;e.currentTarget.setPointerCapture(e.pointerId);}}>{active.text}</div>}
            </div>
            <div className="preview-controls"><label><Volume2 size={16}/> အသံအတိုးအချဲ့ <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/><b>{Math.round(volume*100)}%</b></label></div>
            <div className="preview-foot"><span>{video.name}</span><span>{video.duration?Math.round(video.duration)+' sec':''}</span></div>
          </div>}
          <button className="secondary-btn full" disabled={working||!video} onClick={analyzeMovie}>{busy==='analyze'?<LoaderCircle className="spin" size={15}/>:<Film size={15}/>} Analyze Movie — AI နဲ့ ခွဲခြမ်းစိတ်ဖြာမယ်</button>
          <p className="tiny-note">FFmpeg scene detection + Gemini Vision keyframe analysis (server backend လိုအပ်သည်)။</p>
          <div className="or">OR VIDEO URL</div><div className="url-field"><LinkIcon size={16}/><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Direct .mp4 URL"/></div>
          <button className="secondary-btn full" disabled={!url.trim()} onClick={importUrl}>URL Preview ပြမယ်</button>
          <div className="divider"/>
          <div className="section-title"><Sparkles size={17}/><h2>၂။ AI Recap ဖန်တီးရန်</h2></div>
          <label>ရုပ်ရှင်အမည်</label><input className="text-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Movie title"/>
          <label>ဇာတ်လမ်း / Scene အချက်အလက်</label><textarea className="text-input notes" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="ဇာတ်လမ်း၊ ဇာတ်ကောင်၊ အရေးကြီး scene တွေကို ရေးပါ။ AI က video ကို တိုက်ရိုက်မကြည့်နိုင်သေးတာကြောင့် ဒီအချက်အလက်က လိုအပ်ပါတယ်။"/>
          <button className="primary-btn full" disabled={working} onClick={createRecap}>{busy==='recap'?<LoaderCircle className="spin" size={15}/>:<Sparkles size={15}/>} မြန်မာ Recap + Subtitle Generate</button>
          <div className="tiny-note">လက်ရှိ Groq က ပေးထားသော plot notes ကို အခြေခံပြီး script ရေးပေးပါတယ်။</div>
        </aside>
        <section className="editor-column">
          {analysis && <div className="panel">
            <div className="panel-heading"><div className="section-title"><Film size={17}/><h2>AI Scene Timeline</h2></div><span className="tiny-note">{analysis.sampled} frames</span></div>
            <p className="tiny-note">Movie duration: {Math.round(analysis.duration)} sec · Detected cuts: {analysis.sceneCount}. နမူနာ frame များအပေါ်အခြေခံထားသော analysis ဖြစ်သည်။</p>
            <div className="scene-timeline">{analysis.scenes.map(s=><div className="subtitle-row" key={s.index}><div className="sub-index">{String(s.index+1).padStart(2,'0')}</div><div className="sub-fields"><b>{s.start}s – {s.end}s</b><div>{s.description}</div>{s.mood&&<small>{s.mood}</small>}</div></div>)}</div>
            <button className="primary-btn full" disabled={working||!script} onClick={autoSelectScenes}>{busy==='select-scenes'?<LoaderCircle className="spin" size={15}/>:<Sparkles size={15}/>} Auto Select Scenes</button>
            {scenePlan.length>0 && <div className="scene-timeline"><h3>AI ရွေးချယ်ထားသော Timeline</h3>{scenePlan.map((s,i)=><div className="subtitle-row" key={i}><div className="sub-index">{i+1}</div><div className="sub-fields"><b>Scene #{s.sceneIndex+1} · {s.start}s–{s.end}s</b><div>{s.narration}</div><small>{s.reason}</small></div></div>)}</div>}
          </div>}

          <div className="panel">
            <div className="panel-heading"><div className="section-title"><Mic2 size={17}/><h2>၃။ Recap အသံရွေးချယ်ရန်</h2></div></div>
            <label>အသံအမျိုးအစား</label><div className="option-row"><button className={voiceGender==='male'?'choice active':'choice'} onClick={()=>setVoiceGender('male')}>ယောက်ျားအသံ</button><button className={voiceGender==='female'?'choice active':'choice'} onClick={()=>setVoiceGender('female')}>မိန်းမအသံ</button><button className={voiceGender==='auto'?'choice active':'choice'} onClick={()=>setVoiceGender('auto')}>Auto</button></div>
            <label>ပြောဆိုပုံစံ</label><div className="option-row wrap"><button className={voiceMode==='story'?'choice active':'choice'} onClick={()=>setVoiceMode('story')}>ဇာတ်ကြောင်းပြော</button><button className={voiceMode==='dialogue'?'choice active':'choice'} onClick={()=>setVoiceMode('dialogue')}>အပြန်အလှန်ပြော</button><button className={voiceMode==='characters'?'choice active':'choice'} onClick={()=>setVoiceMode('characters')}>Character တစ်ယောက်ချင်း</button></div>
            <label>အသံဘာသာစကား</label><select className="text-input" value={voiceName} onChange={e=>setVoiceName(e.target.value)}><option value="my-MM">မြန်မာ (my-MM)</option><option value="th-TH">Thai (th-TH)</option><option value="en-US">English (en-US)</option></select>
            <div className="settings-actions"><button className="secondary-btn" disabled={!script} onClick={speakScript}><Play size={15}/> Browser Voice Preview</button><span className="tiny-note">ဖုန်းထဲမှာ Myanmar voice ရှိမှ မြန်မာအသံထွက်ပါမယ်။</span></div>
          </div>
          <div className="panel">
            <div className="panel-heading"><div className="section-title"><Subtitles size={17}/><h2>၄။ Subtitle Editor</h2></div><button className="text-btn" onClick={addLine}>+ စာတန်းထည့်ရန်</button></div>
            <p className="tiny-note">Preview ထဲက စာတန်းကို လက်နဲ့ဖိဆွဲပြီး နေရာရွှေ့နိုင်ပါတယ်။</p>
            <div className="subtitle-list">{subs.map((s,i)=><div key={s.id} className={'subtitle-row '+(selected===s.id?'selected':'')} onClick={()=>setSelected(s.id)}><div className="sub-index">{String(i+1).padStart(2,'0')}</div><div className="sub-fields"><div className="time-fields"><input aria-label="Start time" value={s.start} onChange={e=>update(s.id,'start',e.target.value)}/><span>→</span><input aria-label="End time" value={s.end} onChange={e=>update(s.id,'end',e.target.value)}/></div><textarea rows={2} value={s.text} onChange={e=>update(s.id,'text',e.target.value)}/></div><button className="remove-btn" title="ဖျက်ရန်" onClick={e=>{e.stopPropagation();setSubs(old=>old.filter(x=>x.id!==s.id));}}><Trash2 size={15}/></button></div>)}</div>
            <div className="style-controls">
              <label className="font-control">စာလုံးအရွယ် <input type="range" min="14" max="48" value={fontSize} onChange={e=>setFontSize(Number(e.target.value))}/><b>{fontSize}px</b></label>
              <label className="font-control">နောက်ခံ Blur <input type="range" min="0" max="20" value={blur} onChange={e=>setBlur(Number(e.target.value))}/><b>{blur}px</b></label>
              <label className="font-control">နောက်ခံအမည်း <input type="range" min="0" max="100" value={bgOpacity} onChange={e=>setBgOpacity(Number(e.target.value))}/><b>{bgOpacity}%</b></label>
              <label className="font-control">ထောင့်ဝိုင်း <input type="range" min="0" max="24" value={borderRadius} onChange={e=>setBorderRadius(Number(e.target.value))}/><b>{borderRadius}px</b></label>
            </div>
            <div className="subtitle-tools"><button className="secondary-btn" disabled={working||!subs.length} onClick={improveSubs}>{busy==='subtitle'?<LoaderCircle className="spin" size={15}/>:<Sparkles size={15}/>} Gemini နဲ့ စာပြင်မယ်</button><button className="secondary-btn" disabled={!subs.length} onClick={downloadSrt}><Download size={15}/> SRT Download</button></div>
            {script&&<div className="script-wrap"><div className="panel-heading"><div className="section-title"><Sparkles size={17}/><h2>Generated Burmese Recap</h2></div><button className="text-btn" onClick={()=>{navigator.clipboard?.writeText(script);setStatus('Script copy လုပ်ပြီးပါပြီ။');}}>Copy Script</button></div><textarea className="script-output" value={script} onChange={e=>setScript(e.target.value)} rows={8}/></div>}
            <div className="export-row"><button className="primary-btn" disabled={working} onClick={renderFinalMp4}>{busy==='render'?<LoaderCircle className="spin" size={15}/>:<Download size={15}/>} Generate Final MP4 (Burmese Voice)</button></div>
            <p className="tiny-note">အရေးကြီး — ဒီအဆင့်မှာ browser preview၊ recap script၊ subtitle editor နဲ့ SRT download အလုပ်လုပ်ပါတယ်။ အပြီးသတ် Burmese voice ပါတဲ့ MP4 ကို ထုတ်ဖို့ video rendering/TTS backend လိုအပ်နေသေးပါတယ်။</p>
          </div>
          <div className="status-line"><span className="status-dot"/><span>{working?'လုပ်ဆောင်နေပါတယ်… ':''}{status}</span></div>
        </section>
      </div>
      <footer>CONERZONE <span>•</span> GROQ + GEMINI <span>•</span> LOCAL VIDEO PREVIEW</footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
