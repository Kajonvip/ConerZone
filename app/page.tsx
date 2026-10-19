"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Page = "home" | "editor" | "history" | "settings";
type SavedProject = { id: string; title: string; date: string; script: string; subtitles: string; settings: SubtitleSettings };
type SubtitleSettings = { x: number; y: number; fontSize: number; width: number; height: number; blur: number; textColor: string; outlineColor: string; font: string };
type VoiceMode = "story" | "dialogue" | "characters";

const defaultSubtitle: SubtitleSettings = { x: 50, y: 84, fontSize: 26, width: 82, height: 18, blur: 8, textColor: "#ffffff", outlineColor: "#111111", font: "Noto Sans Myanmar" };
const initialHistory: SavedProject[] = [];

function downloadFile(filename: string, content: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob(["\uFEFF", content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function Home() {
  const [page, setPage] = useState<Page>("home");
  const [projectName, setProjectName] = useState("My Movie Recap");
  const [script, setScript] = useState("");
  const [subtitleText, setSubtitleText] = useState("မြန်မာစာတန်းထိုးကို ဒီနေရာမှာ ပြင်ဆင်နိုင်ပါတယ်။");
  const [subtitle, setSubtitle] = useState<SubtitleSettings>(defaultSubtitle);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSource, setVideoSource] = useState("");
  const [videoError, setVideoError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<SavedProject[]>(initialHistory);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("story");
  const [voiceGender, setVoiceGender] = useState("auto");
  const [characterVoice, setCharacterVoice] = useState("auto");
  const [flip, setFlip] = useState(false);
  const [zoom, setZoom] = useState(21);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(105);
  const [saturation, setSaturation] = useState(110);
  const [border, setBorder] = useState(0);
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiStatus, setApiStatus] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [apiProvider, setApiProvider] = useState("gemini");
  const [showApiKey, setShowApiKey] = useState(false);
  const [serverStatus, setServerStatus] = useState<{ checked: boolean; providerConfigured: boolean; googleConfigured: boolean; endpointConfigured: boolean } | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const renderRecorderRef = useRef<MediaRecorder | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const objectUrlRef = useRef("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("conerzone-history-v1");
      if (saved) setHistory(JSON.parse(saved) as SavedProject[]);
    } catch { /* Ignore invalid browser storage. */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("conerzone-history-v1", JSON.stringify(history)); } catch { setNotice("Browser storage ပြည့်နေပါတယ်။ Project ကို JSON အဖြစ် Download လုပ်ထားပါ။"); }
  }, [history]);

  useEffect(() => () => { if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current); }, []);

  const wordCount = useMemo(() => script.trim() ? script.trim().split(/\s+/).length : 0, [script]);

  function selectVideo(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("video/")) { setVideoError("Video ဖိုင်ကိုသာ ရွေးချယ်ပါ။"); return; }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setVideoSource(objectUrl);
    setVideoUrl("");
    setVideoError("");
    setNotice("Video ကို Preview အတွက် ဖွင့်ထားပါတယ်။");
  }

  function loadVideoUrl() {
    const value = videoUrl.trim();
    if (!value || !/^https?:\/\//i.test(value)) { setVideoError("http:// သို့မဟုတ် https:// နဲ့စတဲ့ direct video URL ကို ထည့်ပါ။"); return; }
    setVideoSource(value);
    setVideoError("");
    setNotice("URL ကို Preview မှာ ဖွင့်ရန် ကြိုးစားနေပါတယ်။ Direct video link ဖြစ်ရပါမယ်။");
  }

  function saveProject() {
    const item: SavedProject = { id: String(Date.now()), title: projectName.trim() || "Untitled Recap", date: new Date().toLocaleString(), script, subtitles: subtitleText, settings: subtitle };
    setHistory((old) => [item, ...old.filter((x) => x.title !== item.title)].slice(0, 100));
    setNotice("Project ကို ဒီ Browser ရဲ့ History မှာ သိမ်းပြီးပါပြီ။");
  }

  function exportProject(item?: SavedProject) {
    const project = item ?? { id: String(Date.now()), title: projectName, date: new Date().toLocaleString(), script, subtitles: subtitleText, settings: subtitle };
    downloadFile((project.title || "conerzone-project").replace(/[^a-z0-9\u1000-\u109F_-]/gi, "-") + ".json", JSON.stringify(project, null, 2), "application/json;charset=utf-8");
    setNotice("Project JSON Download လုပ်နေပါတယ်။");
  }

  function exportSrt() {
    const lines = subtitleText.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) { setNotice("SRT ထုတ်ရန် စာတန်းထိုးစာသား ထည့်ပါ။"); return; }
    const stamp = (seconds: number) => [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((n) => String(n).padStart(2, "0")).join(":") + ",000";
    const srt = lines.map((line, index) => `${index + 1}\n${stamp(index * 4)} --> ${stamp(index * 4 + 4)}\n${line}`).join("\n\n");
    downloadFile("conerzone-subtitles.srt", srt);
    setNotice("SRT Download စတင်ပါပြီ။");
  }

  function updateSubtitle(key: keyof SubtitleSettings, value: string | number) {
    setSubtitle((old) => ({ ...old, [key]: value }));
  }

  function moveSubtitle(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    updateSubtitle("x", Math.max(5, Math.min(95, Math.round(((event.clientX - rect.left) / rect.width) * 100))));
    updateSubtitle("y", Math.max(5, Math.min(95, Math.round(((event.clientY - rect.top) / rect.height) * 100))));
  }

  const videoStyle = { transform: `${flip ? "scaleX(-1) " : ""}scale(${1 + zoom / 100})`, filter: `brightness(${1 + brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`, border: border + "px solid #ffffff" };

  function stopRenderedExport() {
    if (renderRecorderRef.current && renderRecorderRef.current.state !== "inactive") renderRecorderRef.current.stop();
  }

  async function exportRenderedVideo() {
    const video = videoRef.current as (HTMLVideoElement & { captureStream?: () => MediaStream }) | null;
    if (!video || !videoSource || !video.videoWidth) {
      setNotice("Video ကို အရင်ဖွင့်ပြီး Preview ထဲမှာ ပေါ်လာအောင် စောင့်ပါ။");
      return;
    }
    if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) {
      setNotice("ဒီ Browser မှာ Video Export မထောက်ပံ့ပါ။ Android Chrome နောက်ဆုံးဗားရှင်းနဲ့ စမ်းပါ။");
      return;
    }
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      setNotice("ဒီ Browser မှာ WebM rendering မထောက်ပံ့ပါ။");
      return;
    }
    const canvas = document.createElement("canvas");
    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const scale = Math.min(1, 1920 / sourceWidth);
    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) { setNotice("Canvas ကို ဖွင့်မရပါ။"); return; }
    const canvasStream = canvas.captureStream(30);
    let sourceStream: MediaStream | null = null;
    try { sourceStream = video.captureStream ? video.captureStream() : null; } catch { sourceStream = null; }
    const tracks = [...canvasStream.getVideoTracks(), ...(sourceStream?.getAudioTracks() ?? [])];
    const outputStream = new MediaStream(tracks);
    const chunks: BlobPart[] = [];
    let stopped = false;
    const lines = subtitleText.split("\\n").map((line) => line.trim()).filter(Boolean);
    const drawFrame = () => {
      if (stopped || !renderRecorderRef.current || renderRecorderRef.current.state !== "recording") return;
      try {
        const cw = canvas.width, ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.filter = `brightness(${1 + brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100})`;
        ctx.translate(cw / 2, ch / 2);
        ctx.scale((flip ? -1 : 1) * (1 + zoom / 100), 1 + zoom / 100);
        ctx.drawImage(video, -cw / 2, -ch / 2, cw, ch);
        ctx.restore();
        ctx.filter = "none";
        if (border > 0) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = border * scale;
          ctx.strokeRect(0, 0, cw, ch);
        }
        const currentLine = lines.length ? lines[Math.min(lines.length - 1, Math.floor(video.currentTime / 4))] : "";
        if (currentLine) {
          const fontSize = Math.max(12, subtitle.fontSize * scale);
          const maxWidth = cw * subtitle.width / 100;
          const centerX = cw * subtitle.x / 100;
          const centerY = ch * subtitle.y / 100;
          ctx.font = `600 ${fontSize}px "${subtitle.font}", sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const words = currentLine.split("");
          const wrapped: string[] = [];
          let line = "";
          for (const character of words) {
            const candidate = line + character;
            if (line && ctx.measureText(candidate).width > maxWidth - 20) { wrapped.push(line); line = character; }
            else line = candidate;
          }
          if (line) wrapped.push(line);
          const lineHeight = fontSize * 1.4;
          const boxHeight = Math.max(subtitle.height * ch / 100, wrapped.length * lineHeight + 14);
          const boxWidth = Math.min(maxWidth, Math.max(...wrapped.map((item) => ctx.measureText(item).width), 40) + 22);
          ctx.fillStyle = `rgba(0,0,0,${Math.min(0.8, subtitle.blur / 100)})`;
          ctx.fillRect(centerX - boxWidth / 2, centerY - boxHeight / 2, boxWidth, boxHeight);
          const startY = centerY - ((wrapped.length - 1) * lineHeight) / 2;
          wrapped.forEach((text, index) => {
            const y = startY + index * lineHeight;
            ctx.lineWidth = Math.max(1, fontSize / 13);
            ctx.strokeStyle = subtitle.outlineColor;
            ctx.strokeText(text, centerX, y, maxWidth - 10);
            ctx.fillStyle = subtitle.textColor;
            ctx.fillText(text, centerX, y, maxWidth - 10);
          });
        }
      } catch {
        stopped = true;
        if (renderRecorderRef.current?.state === "recording") renderRecorderRef.current.stop();
        setNotice("Video ကို Canvas မှာ ဖတ်မရပါ။ URL မှာ CORS ကန့်သတ်ချက်ရှိနိုင်ပါတယ်။ ကိုယ်ပိုင် Local video file ကို Upload လုပ်ပြီး စမ်းပါ။");
        return;
      }
      requestAnimationFrame(drawFrame);
    };
    try {
      const recorder = new MediaRecorder(outputStream, { mimeType });
      renderRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onerror = () => { stopped = true; setRendering(false); setNotice("Video rendering မအောင်မြင်ပါ။ ဖိုင်အရွယ်အစားသေးသေးနဲ့ ပြန်စမ်းပါ။"); };
      recorder.onstop = () => {
        stopped = true;
        setRendering(false);
        outputStream.getTracks().forEach((track) => track.stop());
        if (chunks.length) {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = (projectName.trim() || "conerzone-recap").replace(/[^a-z0-9\\u1000-\\u109F_-]/gi, "-") + ".webm";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 5000);
          setNotice("WebM video export ပြီးပါပြီ။ အသံ track ရရှိမှုက Browser နဲ့ source video ပေါ် မူတည်ပါတယ်။ MP4 လိုအပ်ရင် FFmpeg backend ထပ်ချိတ်ဆက်ရပါမယ်။");
        }
        renderRecorderRef.current = null;
      };
      if (video.ended || (Number.isFinite(video.duration) && video.currentTime >= video.duration)) video.currentTime = 0;
      setRendering(true);
      recorder.start(500);
      await video.play();
      requestAnimationFrame(drawFrame);
      video.addEventListener("ended", () => { if (recorder.state === "recording") recorder.stop(); }, { once: true });
      setNotice("Video rendering စတင်ပါပြီ။ Video အဆုံးထိ ဖွင့်ပြီးနောက် Download စတင်ပါမယ်။");
    } catch {
      setRendering(false);
      outputStream.getTracks().forEach((track) => track.stop());
      setNotice("Rendering စတင်မရပါ။ Video ကို Play လုပ်ထားပြီး Browser permission/format ကို စစ်ပါ။");
    }
  }

  return (
    <main className="studio-shell">
      <aside className="studio-sidebar">
        <button className="brand-lockup" onClick={() => setPage("home")}><span className="brand-mark"><img className="brand-logo" src="/conerzone-logo.svg" alt="ConerZone logo" /></span><span><strong>ConerZone</strong><small>MOVIE RECAP STUDIO</small></span></button>
        <div className="side-label">WORKSPACE</div>
        <button className={page === "home" ? "nav-item active" : "nav-item"} onClick={() => setPage("home")}><span>⌂</span> Home</button>
        <button className={page === "editor" ? "nav-item active" : "nav-item"} onClick={() => setPage("editor")}><span>▣</span> Recap Studio</button>
        <button className={page === "history" ? "nav-item active" : "nav-item"} onClick={() => setPage("history")}><span>◷</span> History <b>{history.length}</b></button>
        <button className={page === "settings" ? "nav-item active" : "nav-item"} onClick={() => setPage("settings")}><span>⚙</span> Settings</button>
        <div className="sidebar-note"><span className="status-dot" /><div><strong>Local Studio</strong><small>Browser-based workspace</small></div></div>
      </aside>

      <section className="studio-main">
        <header className="studio-topbar"><div className="mobile-brand"><span className="brand-mark"><img className="brand-logo" src="/conerzone-logo.svg" alt="ConerZone logo" /></span><strong>ConerZone</strong></div><div className="crumb">CONERZONE <span>/</span> {page.toUpperCase()}</div><div className="top-status"><span className="status-dot" /> Project workspace</div></header>

        {page === "home" && <div className="page-wrap">
          <div className="welcome-row"><div><div className="kicker">YOUR MOVIE RECAP WORKSPACE</div><h1>Make every story <em>count.</em></h1><p>ဗီဒီယိုတင်ပါ၊ မြန်မာစာတန်းထိုးပြင်ပါ၊ Recap Project ကို စီမံပါ။</p></div><button className="btn-primary" onClick={() => setPage("editor")}>＋ New Recap</button></div>
          <section className="home-hero"><div className="hero-decoration"><img className="hero-logo" src="/conerzone-logo.svg" alt="ConerZone movie studio" /></div><div className="hero-content"><div className="kicker">CONERZONE STUDIO</div><h2>Your story.<br /><em>Your voice.</em></h2><p>Movie Preview, Subtitle Styling နဲ့ Voice Plan တို့ကို Workspace တစ်ခုတည်းမှာ စီမံပါ။</p><button className="btn-primary" onClick={() => setPage("editor")}>Open Recap Studio <span>→</span></button></div><div className="hero-foot"><span>MYANMAR SUBTITLE WORKFLOW</span><span>CREATE · STYLE · SAVE</span></div></section>
          <div className="section-title"><div><div className="kicker">QUICK ACCESS</div><h2>Studio tools</h2></div></div>
          <div className="tool-cards">
            <button className="tool-card" onClick={() => setPage("editor")}><span className="tool-icon">▶</span><strong>Video Preview</strong><p>Local video upload သို့မဟုတ် direct URL ဖြင့် စတင်ပါ။</p><span className="card-link">Open Editor →</span></button>
            <button className="tool-card" onClick={() => { setPage("editor"); setNotice("Subtitle setting တွေကို အောက်မှာ ချိန်ညှိနိုင်ပါတယ်။"); }}><span className="tool-icon">文</span><strong>Myanmar Subtitles</strong><p>ဖောင့်၊ အရောင်၊ Outline၊ Blur နဲ့ နေရာချထားမှုကို ပြင်ပါ။</p><span className="card-link">Style subtitles →</span></button>
            <button className="tool-card" onClick={() => setPage("history")}><span className="tool-icon">◷</span><strong>Project History</strong><p>Browser ထဲမှာ သိမ်းထားတဲ့ Recap Project များကို ကြည့်ပါ။</p><span className="card-link">View history →</span></button>
          </div>
          <div className="notice-strip"><span>ⓘ</span><p>လက်ရှိဗားရှင်းမှာ Preview၊ Subtitle styling နဲ့ Project history ပါဝင်ပါတယ်။ AI voice generation နဲ့ MP4 rendering ကို API/backend ချိတ်ဆက်ပြီးမှ အသုံးပြုနိုင်ပါမယ်။</p></div>
        </div>}

        {page === "editor" && <div className="page-wrap">
          <div className="welcome-row"><div><div className="kicker">VIDEO & SUBTITLE WORKSPACE</div><h1>Recap <em>Studio.</em></h1><p>Preview ပေါ်က စာတန်းကို လက်နဲ့ရွှေ့ပြီး စိတ်ကြိုက်ပြင်ဆင်ပါ။</p></div><button className="btn-secondary" onClick={saveProject}>Save Project</button></div>
          <div className="project-name-row"><label>PROJECT NAME<input value={projectName} onChange={(e) => setProjectName(e.target.value)} /></label><span>{wordCount} script words</span></div>
          <div className="editor-layout">
            <div className="editor-left">
              <section className="panel preview-panel"><div className="panel-head"><div><div className="kicker">LIVE PREVIEW</div><h2>Video & Subtitles</h2></div><span className="tiny-status">PREVIEW</span></div>
                <div ref={stageRef} className="video-stage" onPointerMove={moveSubtitle} onPointerUp={() => setDragging(false)} onPointerCancel={() => setDragging(false)}>
                  {videoSource ? <video ref={videoRef} className="preview-video" src={videoSource} controls playsInline style={videoStyle} onTimeUpdate={(e) => setPlayhead(e.currentTarget.currentTime)} onError={() => setVideoError("ဒီ URL ကို Video အဖြစ်ဖွင့်မရပါ။ Direct .mp4/.webm link ကို စမ်းပါ။ CORS သို့မဟုတ် website protection ကြောင့် မရနိုင်ပါ။")} /> : <div className="video-placeholder"><span>▶</span><strong>Your movie preview</strong><small>Local video upload or direct video URL</small></div>}
                  <div className="subtitle-overlay" style={{ left: subtitle.x + "%", top: subtitle.y + "%", width: subtitle.width + "%", minHeight: subtitle.height + "px", transform: "translate(-50%, -50%)", fontSize: subtitle.fontSize + "px", color: subtitle.textColor, fontFamily: subtitle.font + ", sans-serif", textShadow: `-1px -1px 0 ${subtitle.outlineColor}, 1px -1px 0 ${subtitle.outlineColor}, -1px 1px 0 ${subtitle.outlineColor}, 1px 1px 0 ${subtitle.outlineColor}`, backgroundColor: `rgba(0,0,0,${subtitle.blur / 100})`, backdropFilter: `blur(${Math.round(subtitle.blur / 12)}px)`, borderRadius: "6px" }} onPointerDown={(e) => { setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerUp={() => setDragging(false)}>{subtitleText.split("\n").map((line) => line.trim()).filter(Boolean)[Math.min(Math.max(0, subtitleText.split("\n").map((line) => line.trim()).filter(Boolean).length - 1), Math.floor(playhead / 4))] || "မြန်မာစာတန်းထိုး"}</div>
                </div>
                <div className="video-inputs"><label className="upload-button">＋ Choose video file<input type="file" accept="video/*" onChange={(e) => selectVideo(e.target.files?.[0])} /></label><div className="url-entry"><input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste direct video URL..." aria-label="Video URL" /><button className="btn-secondary" onClick={loadVideoUrl}>Load URL</button></div><button className="btn-primary render-button" onClick={rendering ? stopRenderedExport : exportRenderedVideo} disabled={!videoSource}>{rendering ? "Stop render ■" : "Render WebM video ↗"}</button></div>
                {videoError && <div className="error-note" role="alert">{videoError}</div>}
                <div className="small-note">မှတ်ချက် — YouTube/Facebook page link များက direct video file မဟုတ်တဲ့အတွက် အလုပ်မလုပ်နိုင်ပါ။ ကိုယ်ပိုင်/ခွင့်ပြုချက်ရှိတဲ့ video ကို အသုံးပြုပါ။</div>
              </section>
              <section className="panel script-panel"><div className="panel-head"><div><div className="kicker">RECAP SCRIPT</div><h2>Story notes</h2></div><span className="tiny-status">{wordCount} WORDS</span></div><textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="ဒီဇာတ်ကားရဲ့ အစမှာ... မြန်မာလို recap script ရေးပါ။" rows={7} /><div className="panel-actions"><button className="btn-secondary" onClick={() => downloadFile("conerzone-script.txt", script)}>Download TXT</button><button className="btn-primary" onClick={() => downloadFile("conerzone-project.json", JSON.stringify({ projectName, script, subtitleText, subtitle }, null, 2), "application/json")}>Export Project JSON</button></div></section>
            </div>
            <div className="editor-right">
              <section className="panel"><div className="panel-head"><div><div className="kicker">SUBTITLE DESIGN</div><h2>Text appearance</h2></div></div>
                <label className="field-label">Subtitle text<textarea className="compact-textarea" value={subtitleText} onChange={(e) => setSubtitleText(e.target.value)} rows={3} /></label>
                <label className="field-label">Myanmar font<select value={subtitle.font} onChange={(e) => updateSubtitle("font", e.target.value)}><option>Noto Sans Myanmar</option><option>Myanmar Text</option><option>Padauk</option></select></label>
                <div className="two-fields"><label className="field-label">Text color<input type="color" value={subtitle.textColor} onChange={(e) => updateSubtitle("textColor", e.target.value)} /></label><label className="field-label">Outline color<input type="color" value={subtitle.outlineColor} onChange={(e) => updateSubtitle("outlineColor", e.target.value)} /></label></div>
                <Range label="Font size" value={subtitle.fontSize} min={12} max={56} suffix="px" onChange={(v) => updateSubtitle("fontSize", v)} />
                <Range label="Subtitle width" value={subtitle.width} min={25} max={100} suffix="%" onChange={(v) => updateSubtitle("width", v)} />
                <Range label="Container height" value={subtitle.height} min={0} max={80} suffix="px" onChange={(v) => updateSubtitle("height", v)} />
                <Range label="Blur container" value={subtitle.blur} min={0} max={100} suffix="%" onChange={(v) => updateSubtitle("blur", v)} />
                <div className="position-controls"><Range label="Horizontal position" value={subtitle.x} min={5} max={95} suffix="%" onChange={(v) => updateSubtitle("x", v)} /><Range label="Vertical position" value={subtitle.y} min={5} max={95} suffix="%" onChange={(v) => updateSubtitle("y", v)} /></div>
                <div className="small-note">Preview ပေါ်က စာတန်းကို ဖိဆွဲရွှေ့နိုင်သလို slider နဲ့လည်း ချိန်နိုင်ပါတယ်။</div>
              </section>
              <section className="panel"><div className="panel-head"><div><div className="kicker">VOICE PLANNER</div><h2>Myanmar voice style</h2></div><span className="tiny-status">SETUP</span></div>
                <label className="field-label">Speaking format<select value={voiceMode} onChange={(e) => setVoiceMode(e.target.value as VoiceMode)}><option value="story">Storytelling — ဇာတ်ကြောင်းပြော</option><option value="dialogue">Dialogue — အပြန်အလှန်ပြော</option><option value="characters">Character voices — ဇာတ်ကောင်အလိုက်</option></select></label>
                <label className="field-label">Narrator voice<select value={voiceGender} onChange={(e) => setVoiceGender(e.target.value)}><option value="auto">Auto — အလိုအလျောက်</option><option value="male">ယောကျာ်းအသံ</option><option value="female">မိန်းမအသံ</option></select></label>
                {voiceMode === "characters" && <label className="field-label">Character voice mapping<select value={characterVoice} onChange={(e) => setCharacterVoice(e.target.value)}><option value="auto">Auto — ဇာတ်ကောင်အလိုက် ခွဲခြားရန်</option><option value="adult">လူကြီးအသံ</option><option value="child">ကလေးအသံ</option><option value="male">ယောကျာ်းအသံ</option><option value="female">မိန်းမအသံ</option><option value="elder">အဖိုး/အဖွားအသံ</option></select></label>}
                <div className="notice-strip compact"><span>ⓘ</span><p>ဒီနေရာက Voice preference ကိုသာ ရွေးထားတာဖြစ်ပြီး အသံထုတ်ပေးတဲ့ AI API ကို မချိတ်ဆက်ရသေးပါ။</p></div>
              </section>
              <section className="panel"><div className="panel-head"><div><div className="kicker">CREATIVE EDITS</div><h2>Visual adjustments</h2></div></div>
                <label className="check-row"><input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} /> Horizontal flip preview</label>
                <Range label="Zoom / crop" value={zoom} min={0} max={50} suffix="%" onChange={setZoom} />
                <Range label="Brightness" value={brightness} min={-50} max={50} suffix="%" onChange={setBrightness} />
                <Range label="Contrast" value={contrast} min={50} max={150} suffix="%" onChange={setContrast} />
                <Range label="Saturation" value={saturation} min={0} max={200} suffix="%" onChange={setSaturation} />
                <Range label="Video border" value={border} min={0} max={12} suffix="px" onChange={setBorder} />
                <div className="small-note">Flip, Crop, Brightness, Contrast နဲ့ Saturation တို့ကို export ထဲမှာပါ ထည့်ပေးပါတယ်။ ဒီ effects တွေက Copyright Claim ကို ရှောင်နိုင်မယ်လို့ အာမမခံပါ။</div>
              </section>
              {notice && <div className="notice-strip" role="status"><span>✓</span><p>{notice}</p></div>}
            </div>
          </div>
        </div>}

        {page === "history" && <div className="page-wrap"><div className="welcome-row"><div><div className="kicker">SAVED PROJECTS</div><h1>Project <em>History.</em></h1><p>ဒီ Browser မှာ သိမ်းထားတဲ့ Recap Project များကို ပြန်ဖွင့်ပြီး Download လုပ်ပါ။</p></div><button className="btn-primary" onClick={() => setPage("editor")}>＋ New Recap</button></div>
          {history.length === 0 ? <div className="empty-panel"><span>◷</span><h2>History မရှိသေးပါ</h2><p>Recap Studio ထဲက Save Project ကို နှိပ်ပြီး ဒီနေရာမှာ သိမ်းထားနိုင်ပါတယ်။</p><button className="btn-primary" onClick={() => setPage("editor")}>Open Studio</button></div> : <div className="history-list">{history.map((item) => <article className="history-item" key={item.id}><div className="history-thumb">▶</div><div className="history-info"><strong>{item.title}</strong><span>{item.date}</span><small>{item.script.length} script characters · {item.subtitles.split("\n").filter(Boolean).length} subtitle lines</small></div><div className="history-actions"><button className="btn-secondary" onClick={() => exportProject(item)}>Download JSON</button><button className="btn-secondary danger-button" onClick={() => setHistory((old) => old.filter((x) => x.id !== item.id))}>Delete</button></div></article>)}</div>}
          <div className="notice-strip"><span>ⓘ</span><p>History ကို လက်ရှိ Browser ရဲ့ local storage မှာ သိမ်းပါတယ်။ Browser data ရှင်းလိုက်ရင် ပျောက်နိုင်လို့ JSON backup ကို Download လုပ်ထားပါ။</p></div>
        </div>}

        {page === "settings" && <div className="page-wrap settings-page">
          <div className="welcome-row"><div><div className="kicker">ACCOUNT · INTEGRATIONS · SECURITY</div><h1>Studio <em>Settings.</em></h1><p>AI provider, Google account နဲ့ connection health ကို တစ်နေရာတည်းမှာ စီမံပါ။</p></div><button className="btn-secondary" disabled={checkingConnection} onClick={async () => { setCheckingConnection(true); try { const response = await fetch("/api/settings/status", { cache: "no-store" }); if (!response.ok) throw new Error("Backend status endpoint မရနိုင်ပါ။"); const data = await response.json(); setServerStatus(data); setApiStatus("Server configuration status ကို စစ်ဆေးပြီးပါပြီ။ Secret တန်ဖိုးများကို မပြသပါ။"); } catch { setServerStatus(null); setApiStatus("Connection status စစ်မရပါ။ Vercel deployment နဲ့ /api/settings/status route ကို စစ်ဆေးပါ။"); } finally { setCheckingConnection(false); } }}>{checkingConnection ? "Checking..." : "↻ Refresh status"}</button></div>
          <div className="settings-overview">
            <div className="settings-overview-card"><span className="settings-symbol">✦</span><div><small>AI PROVIDER</small><strong>{serverStatus?.providerConfigured ? "Configured on server" : "Not configured"}</strong><span className={serverStatus?.providerConfigured ? "connection-state online" : "connection-state offline"}><i />{serverStatus?.providerConfigured ? "Environment key found" : "Setup required"}</span></div></div>
            <div className="settings-overview-card"><span className="settings-symbol">G</span><div><small>GOOGLE ACCOUNT</small><strong>{serverStatus?.googleConfigured ? "OAuth configured" : "Not connected"}</strong><span className={serverStatus?.googleConfigured ? "connection-state online" : "connection-state offline"}><i />{serverStatus?.googleConfigured ? "Client ID found" : "Setup required"}</span></div></div>
            <div className="settings-overview-card"><span className="settings-symbol">⌁</span><div><small>API BACKEND</small><strong>{serverStatus?.endpointConfigured ? "Endpoint configured" : "Awaiting setup"}</strong><span className={serverStatus?.checked ? "connection-state online" : "connection-state offline"}><i />{serverStatus?.checked ? "Status checked" : "Not checked"}</span></div></div>
          </div>
          <div className="settings-layout">
            <div className="settings-main-column">
              <section className="settings-card"><div className="settings-section-head"><div className="settings-heading-icon">✦</div><div><div className="kicker">AI PROVIDER</div><h2>Connect your AI service</h2><p>မြန်မာ Recap Script နဲ့ Voice workflow အတွက် Provider ကို ပြင်ဆင်ပါ။</p></div><span className={serverStatus?.providerConfigured ? "settings-pill success" : "settings-pill"}>{serverStatus?.providerConfigured ? "CONFIGURED" : "NOT CONNECTED"}</span></div>
                <label className="field-label">AI provider<select value={apiProvider} onChange={(e) => setApiProvider(e.target.value)}><option value="gemini">Google Gemini</option><option value="openai">OpenAI-compatible API</option><option value="custom">Custom API endpoint</option></select></label>
                <label className="field-label">API endpoint URL <span className="field-hint">Optional · HTTPS recommended</span><input value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} placeholder={apiProvider === "gemini" ? "https://generativelanguage.googleapis.com" : "https://api.example.com/v1"} /></label>
                <label className="field-label">API key <span className="field-hint">Session only · Never saved to History</span><div className="secret-input"><input type={showApiKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste key for temporary validation only" autoComplete="new-password" spellCheck={false} /><button type="button" className="btn-secondary" onClick={() => setShowApiKey((v) => !v)}>{showApiKey ? "Hide" : "Show"}</button></div></label>
                <div className="settings-inline-note"><span>ⓘ</span><p>ဒီ API key field ကို Browser ထဲမှာ session အတွင်းသာ ကိုင်ထားပါတယ်။ လက်ရှိတွင် Provider ဆီသို့ request မပို့ပါ၊ Key ကို backend သို့လည်း မပို့ပါ။ Production ချိတ်ဆက်ရန် Vercel Environment Variables ထဲတွင် သိမ်းပြီး server-side API route ကနေ ခေါ်ပါ။</p></div>
                <div className="settings-actions"><button className="btn-primary" onClick={() => setApiStatus(apiEndpoint && !apiEndpoint.startsWith("https://") ? "လုံခြုံသော HTTPS endpoint ကို ထည့်ပါ။" : apiKey.trim() ? "Key ကို ဒီ session မှာသာ ရရှိထားပါတယ်။ အမှန်တကယ် Provider connection မစမ်းရသေးပါ။ Vercel server environment variable သတ်မှတ်ပြီး Refresh status ကိုနှိပ်ပါ။" : "Production API key ကို Vercel → Settings → Environment Variables မှာ ထည့်ပါ။ Browser မှာ key မထည့်ထားတာ ပိုလုံခြုံပါတယ်။")}>Validate setup</button><button className="btn-secondary" onClick={() => { setApiKey(""); setApiStatus("Session API key field ကို ရှင်းပြီးပါပြီ။"); }}>Clear session key</button></div>
              </section>
              <section className="settings-card"><div className="settings-section-head"><div className="settings-heading-icon google-mark">G</div><div><div className="kicker">GOOGLE ACCOUNT</div><h2>Google integration</h2><p>OAuth Client ID ကို server environment ကနေ စစ်ဆေးပါ။</p></div><span className={serverStatus?.googleConfigured ? "settings-pill success" : "settings-pill"}>{serverStatus?.googleConfigured ? "CONFIGURED" : "NOT CONNECTED"}</span></div>
                <label className="field-label">Google OAuth Client ID<input value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" autoComplete="off" /></label>
                <div className="settings-inline-note"><span>ⓘ</span><p>Client ID ကို Browser မှာ ပြသနိုင်ပေမယ့် OAuth login အလုပ်လုပ်ဖို့ Google Cloud OAuth consent screen, authorized origins, redirect URI နဲ့ server callback တို့ကို သတ်မှတ်ဖို့ လိုပါတယ်။ Client Secret ကို frontend မှာ မထည့်ပါနှင့်။</p></div>
                <button className="btn-secondary" onClick={() => setApiStatus(googleClientId.trim() ? "Client ID ကို field ထဲမှာသာ ထည့်ထားပါတယ်။ OAuth login မပြီးသေးပါ။ Google Cloud နဲ့ server callback configuration လိုအပ်ပါတယ်။" : "Google Cloud Console မှ Web OAuth Client ID ကို ရယူပြီး Vercel environment ထဲမှာ GOOGLE_CLIENT_ID သတ်မှတ်ပါ။")}>Check Google setup</button>
              </section>
            </div>
            <aside className="settings-side-column">
              <section className="settings-card security-card"><div className="settings-section-head"><div className="settings-heading-icon">♢</div><div><div className="kicker">SECURITY CENTER</div><h2>Key safety</h2></div></div><div className="security-row"><span>Browser key storage</span><b className="secure-label">SESSION ONLY</b></div><div className="security-row"><span>Secret values exposed</span><b className="secure-label">NO</b></div><div className="security-row"><span>Server env check</span><b className={serverStatus?.checked ? "secure-label" : "pending-label"}>{serverStatus?.checked ? "CHECKED" : "PENDING"}</b></div><p className="settings-desc">အမှန်တကယ် AI API call များကို server-side route မှသာ လုပ်ပါ။ Key ကို GitHub source code, client-side localStorage သို့မဟုတ် URL query ထဲ မထည့်ပါနှင့်။</p></section>
              <section className="settings-card"><div className="settings-section-head"><div className="settings-heading-icon">▤</div><div><div className="kicker">PROJECT DATA</div><h2>History backup</h2></div></div><p className="settings-desc">ဒီ Browser မှာ သိမ်းထားတဲ့ Project {history.length} ခုကို JSON အဖြစ် Download လုပ်နိုင်ပါတယ်။</p><button className="btn-secondary full-button" onClick={() => downloadFile("conerzone-history-backup.json", JSON.stringify(history, null, 2), "application/json")}>↓ Download backup</button></section>
              <section className="settings-card"><div className="settings-section-head"><div className="settings-heading-icon">⌘</div><div><div className="kicker">VERCEL SETUP</div><h2>Environment variables</h2></div></div><p className="settings-desc">Vercel → Project → Settings → Environment Variables မှာ သတ်မှတ်ပါ။</p><code className="env-code">AI_PROVIDER_API_KEY</code><code className="env-code">GOOGLE_CLIENT_ID</code><code className="env-code">AI_API_ENDPOINT</code><p className="field-hint">တန်ဖိုးများကို ဒီ website UI ထဲမှာ မထည့်ဘဲ Vercel Dashboard မှာသာ သိမ်းပါ။</p><button className="btn-secondary full-button" onClick={() => GenUI.openUrl("https://vercel.com/kajonvip-1574/coner-zone/settings/environment-variables")}>Open Vercel settings ↗</button></section>
            </aside>
          </div>
          {apiStatus && <div className="notice-strip" role="status"><span>ⓘ</span><p>{apiStatus}</p></div>}
          <div className="notice-strip"><span>✓</span><p>Connection Status က server environment variable ရှိ/မရှိကိုသာ ပြသပါတယ်။ Provider ကို အမှန်တကယ် authenticate လုပ်ခြင်း၊ Google Sign-in နဲ့ AI generation တို့အတွက် သီးခြား backend integration ကို ဆက်လက်တည်ဆောက်ရပါမယ်။</p></div>
        </div>}

        <footer className="studio-footer"><span>© 2026 CONERZONE</span><span>Made for stories worth telling.</span></footer>
      </section>
    </main>
  );
}

function Range({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="range-field"><span><span>{label}</span><b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} /></label>;
}
