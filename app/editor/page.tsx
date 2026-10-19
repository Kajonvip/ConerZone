"use client";

import { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

type Overlay = { x: number; y: number; width: number; height: number };
type SavedProject = {
  name: string;
  subtitle: string;
  font: string;
  fontSize: number;
  textColor: string;
  outlineColor: string;
  outlineWidth: number;
  blur: number;
  subtitleBox: Overlay;
  blurBox: Overlay;
  updatedAt: number;
};

const STORAGE_KEY = "conerzone-editor-project-v1";
const DEFAULT_PROJECT: SavedProject = {
  name: "Untitled project",
  subtitle: "ဒီနေရာမှာ မြန်မာစာတန်းထိုးကို ရိုက်ထည့်ပါ",
  font: "Noto Sans Myanmar",
  fontSize: 34,
  textColor: "#ffffff",
  outlineColor: "#000000",
  outlineWidth: 3,
  blur: 35,
  subtitleBox: { x: 10, y: 72, width: 80, height: 18 },
  blurBox: { x: 35, y: 25, width: 25, height: 20 },
  updatedAt: Date.now()
};

function openProjectDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("conerzone-local-projects", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("media")) db.createObjectStore("media");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local project storage."));
  });
}

async function storeMedia(file: File): Promise<void> {
  const db = await openProjectDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("media", "readwrite");
    transaction.objectStore("media").put(file, "current-video");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save video locally."));
  });
  db.close();
}

async function loadMedia(): Promise<Blob | null> {
  const db = await openProjectDb();
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const request = db.transaction("media", "readonly").objectStore("media").get("current-video");
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error("Could not restore local video."));
  });
  db.close();
  return result;
}

export default function EditorPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<SavedProject>(DEFAULT_PROJECT);
  const [videoUrl, setVideoUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("ဖိုင်တင်ပြီး စတင်တည်းဖြတ်နိုင်ပါပြီ။");
  const [busy, setBusy] = useState(false);
  const [selectedOverlay, setSelectedOverlay] = useState<"subtitle" | "blur">("subtitle");
  const [language, setLanguage] = useState<"my" | "en">("my");

  const t = language === "my"
    ? { editor: "Video Editor", import: "ဗီဒီယိုဖိုင်တင်ရန်", subtitle: "စာတန်းထိုး", blur: "Blur နေရာ", settings: "ပုံစံချိန်ညှိရန်", export: "Export", noVideo: "MP4, WebM, MOV စတဲ့ video ဖိုင်ကို ရွေးပါ", text: "စာတန်းထိုးစာသား", font: "ဖောင့်", size: "စာလုံးအရွယ်", color: "စာလုံးအရောင်", outline: "အနားသတ်အရောင်", outlineWidth: "အနားသတ်အထူ", blurAmount: "Blur အား", save: "Project သိမ်းရန်", backup: "Project Backup", restore: "Backup ပြန်ယူရန်", play: "ဖွင့်ရန်", pause: "ရပ်ရန်", ready: "အဆင်သင့်", exportNote: "Export ကို browser ထဲမှာ ပြုလုပ်ရန် FFmpeg engine လိုအပ်ပါတယ်။" }
    : { editor: "Video Editor", import: "Import video", subtitle: "Subtitles", blur: "Blur area", settings: "Adjust style", export: "Export", noVideo: "Choose an MP4, WebM, MOV or other browser-supported video", text: "Subtitle text", font: "Font", size: "Font size", color: "Text color", outline: "Outline color", outlineWidth: "Outline width", blurAmount: "Blur strength", save: "Save project", backup: "Backup project", restore: "Restore backup", play: "Play", pause: "Pause", ready: "Ready", exportNote: "Exporting in-browser requires the FFmpeg engine." };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProject({ ...DEFAULT_PROJECT, ...JSON.parse(raw) as Partial<SavedProject> });
    } catch {
      setNotice("Project setting များကို ပြန်ဖတ်မရပါ။ Project အသစ်ဖြင့် ဆက်လုပ်နိုင်ပါတယ်။");
    }
    let activeUrl = "";
    void loadMedia().then((blob) => {
      if (!blob) return;
      activeUrl = URL.createObjectURL(blob);
      setVideoUrl(activeUrl);
      setFileName(blob instanceof File ? blob.name : "restored-video");
      setNotice("သိမ်းထားသော video ကို ပြန်ဖွင့်ပြီးပါပြီ။");
    }).catch(() => setNotice("Local video restore မအောင်မြင်ပါ။ Video ကို ပြန်ရွေးပါ။"));
    return () => { if (activeUrl) URL.revokeObjectURL(activeUrl); };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsSaving(true);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, updatedAt: Date.now() }));
        setNotice("Auto-save ပြီးပါပြီ။");
      } catch {
        setNotice("Auto-save မအောင်မြင်ပါ။ Browser storage ကို စစ်ပါ။");
      } finally {
        setIsSaving(false);
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [project]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, updatedAt: Date.now() }));
        setIsSaving(false);
      } catch { setNotice("Storage ပြည့်နေသဖြင့် Auto-save မရပါ။"); }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [project]);

  const updateProject = useCallback(<K extends keyof SavedProject>(key: K, value: SavedProject[K]) => {
    setProject((previous) => ({ ...previous, [key]: value }));
  }, []);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setNotice("Video ဖိုင်ကိုသာ ရွေးပေးပါ။");
      return;
    }
    setBusy(true);
    setNotice("Video ကို ဒီစက်ထဲမှာ သိမ်းဆည်းနေပါတယ်…");
    try {
      await storeMedia(file);
      const nextUrl = URL.createObjectURL(file);
      setVideoUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return nextUrl; });
      setFileName(file.name);
      updateProject("name", file.name.replace(/\.[^.]+$/, "") || "Untitled project");
      setNotice("Video တင်ပြီးပါပြီ။");
    } catch {
      setNotice("Video သိမ်းဆည်းမရပါ။ ဖိုင်အရွယ်အစားနည်းသော ဖိုင်ကို စမ်းပါ။");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const updateOverlay = (key: "subtitleBox" | "blurBox", patch: Partial<Overlay>) => {
    setProject((previous) => ({ ...previous, [key]: { ...previous[key], ...patch } }));
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>, target: "subtitle" | "blur") => {
    if ((event.target as HTMLElement).dataset.resize === "true") return;
    event.preventDefault();
    setSelectedOverlay(target);
    const startX = event.clientX;
    const startY = event.clientY;
    const box = target === "subtitle" ? project.subtitleBox : project.blurBox;
    const stage = event.currentTarget.parentElement;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const move = (moveEvent: PointerEvent) => {
      const nextX = Math.max(0, Math.min(100 - box.width, box.x + ((moveEvent.clientX - startX) / rect.width) * 100));
      const nextY = Math.max(0, Math.min(100 - box.height, box.y + ((moveEvent.clientY - startY) / rect.height) * 100));
      updateOverlay(target === "subtitle" ? "subtitleBox" : "blurBox", { x: nextX, y: nextY });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  const resizeOverlay = (event: ReactPointerEvent<HTMLSpanElement>, target: "subtitle" | "blur") => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const box = target === "subtitle" ? project.subtitleBox : project.blurBox;
    const stage = event.currentTarget.parentElement?.parentElement;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const move = (moveEvent: PointerEvent) => {
      const width = Math.max(8, Math.min(100 - box.x, box.width + ((moveEvent.clientX - startX) / rect.width) * 100));
      updateOverlay(target === "subtitle" ? "subtitleBox" : "blurBox", { width });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "conerzone-project-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const restoreBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (typeof parsed !== "object" || parsed === null || !("subtitle" in parsed)) throw new Error("Invalid project backup");
      setProject({ ...DEFAULT_PROJECT, ...(parsed as Partial<SavedProject>) });
      setNotice("Project backup ပြန်ယူပြီးပါပြီ။ Video ဖိုင်ကို သီးခြားပြန်ရွေးရန် လိုနိုင်ပါတယ်။");
    } catch {
      setNotice("Backup file မှန်ကန်မှုမရှိပါ။");
    } finally { event.target.value = ""; }
  };

  const exportSrt = () => {
    const safeText = project.subtitle.replace(/\r?\n/g, "\\N");
    const end = Math.max(1, Math.floor(duration || 60));
    const stamp = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},000`;
    };
    const content = `1\n${stamp(0)} --> ${stamp(end)}\n${safeText}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name || "conerzone"}-subtitles.srt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("SRT subtitle file ကို download လုပ်ပြီးပါပြီ။");
  };

  const overlayStyle = (box: Overlay): CSSProperties => ({ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, minHeight: `${box.height}%` });

  return (
    <main className="editor-shell">
      <header className="editor-topbar">
        <a className="editor-brand" href="/"><span className="editor-logo">CZ</span><span>CONER<span>ZONE</span></span></a>
        <div className="editor-heading"><span className="editor-eyebrow">LOCAL-FIRST CREATOR WORKSPACE</span><h1>{t.editor}</h1></div>
        <div className="editor-top-actions">
          <button className="editor-ghost" onClick={() => setLanguage(language === "my" ? "en" : "my")}>{language === "my" ? "EN" : "မြန်မာ"}</button>
          <button className="editor-ghost" onClick={downloadBackup}>{t.backup}</button>
          <label className="editor-ghost file-label">{t.restore}<input type="file" accept="application/json,.json" onChange={restoreBackup} hidden /></label>
        </div>
      </header>

      <div className="editor-layout">
        <aside className="editor-sidebar">
          <div className="editor-panel">
            <div className="editor-panel-title"><span className="editor-step">01</span><h2>{t.import}</h2></div>
            <div className="import-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file && file.type.startsWith("video/")) { const dataTransfer = new DataTransfer(); dataTransfer.items.add(file); if (fileInputRef.current) { fileInputRef.current.files = dataTransfer.files; const synthetic = { target: fileInputRef.current } as ChangeEvent<HTMLInputElement>; void handleFile(synthetic); } } }}>
              <span className="import-icon">↥</span><strong>{fileName || "Import your video"}</strong><p>{t.noVideo}</p>
              <button className="editor-primary" disabled={busy} onClick={() => fileInputRef.current?.click()}>{busy ? "Saving…" : "Choose video"}</button>
              <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={handleFile} />
            </div>
            <p className="editor-muted small">{fileName ? `File: ${fileName}` : "Video file stays on this device."}</p>
          </div>

          <div className="editor-panel">
            <div className="editor-panel-title"><span className="editor-step">02</span><h2>{t.subtitle}</h2></div>
            <label className="editor-label">{t.text}<textarea value={project.subtitle} onChange={(event) => updateProject("subtitle", event.target.value)} rows={3} placeholder="မြန်မာစာတန်းထိုး ရိုက်ထည့်ပါ…" /></label>
            <label className="editor-label">{t.font}<select value={project.font} onChange={(event) => updateProject("font", event.target.value)}><option>Noto Sans Myanmar</option><option>Padauk</option><option>Myanmar Text</option><option>Arial</option></select></label>
            <label className="editor-label">{t.size}<span className="editor-range-value">{project.fontSize}px</span><input type="range" min="12" max="120" value={project.fontSize} onChange={(event) => updateProject("fontSize", Number(event.target.value))} /></label>
            <div className="editor-color-row"><label className="editor-label">{t.color}<input type="color" value={project.textColor} onChange={(event) => updateProject("textColor", event.target.value)} /></label><label className="editor-label">{t.outline}<input type="color" value={project.outlineColor} onChange={(event) => updateProject("outlineColor", event.target.value)} /></label></div>
            <label className="editor-label">{t.outlineWidth}<span className="editor-range-value">{project.outlineWidth}px</span><input type="range" min="0" max="10" value={project.outlineWidth} onChange={(event) => updateProject("outlineWidth", Number(event.target.value))} /></label>
          </div>

          <div className="editor-panel">
            <div className="editor-panel-title"><span className="editor-step">03</span><h2>{t.blur}</h2></div>
            <label className="editor-label">{t.blurAmount}<span className="editor-range-value">{project.blur}%</span><input type="range" min="0" max="100" value={project.blur} onChange={(event) => updateProject("blur", Number(event.target.value))} /></label>
            <p className="editor-muted small">Preview ပေါ်က Blur box ကို drag လုပ်ပြီး နေရာရွှေ့ပါ။ အရွယ်အစားပြောင်းရန် ညာဘက် handle ကို ဆွဲပါ။</p>
            <div className="editor-toggle-row"><button className={selectedOverlay === "subtitle" ? "editor-tab active" : "editor-tab"} onClick={() => setSelectedOverlay("subtitle")}>{t.subtitle}</button><button className={selectedOverlay === "blur" ? "editor-tab active" : "editor-tab"} onClick={() => setSelectedOverlay("blur")}>{t.blur}</button></div>
          </div>
        </aside>

        <section className="editor-workspace">
          <div className="workspace-toolbar"><div><span className="status-dot" /> {t.ready}</div><span>{fileName || project.name}</span><span>{isSaving ? "Saving…" : "Auto-saved locally"}</span></div>
          <div className="preview-wrap">
            {videoUrl ? <video ref={videoRef} className="video-preview" src={videoUrl} controls playsInline onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)} onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)} /> : <div className="preview-placeholder"><div className="placeholder-mark">CZ</div><h2>Make every story count.</h2><p>သင့် video ကို import လုပ်ပြီး မြန်မာစာတန်းထိုး၊ blur effect နဲ့ project စတင်ပါ။</p><button className="editor-primary" onClick={() => fileInputRef.current?.click()}>{t.import}</button></div>}
            <div className="overlay-stage" aria-label="Editable video overlays">
              <div className={selectedOverlay === "blur" ? "blur-overlay selected" : "blur-overlay"} style={{ ...overlayStyle(project.blurBox), backdropFilter: `blur(${project.blur / 12}px)`, WebkitBackdropFilter: `blur(${project.blur / 12}px)` }} onPointerDown={(event) => beginDrag(event, "blur")} role="button" tabIndex={0} aria-label="Drag blur overlay"><span className="overlay-tag">BLUR</span><span className="resize-handle" data-resize="true" onPointerDown={(event) => resizeOverlay(event, "blur")} /></div>
              <div className={selectedOverlay === "subtitle" ? "subtitle-overlay selected" : "subtitle-overlay"} style={{ ...overlayStyle(project.subtitleBox), fontFamily: project.font === "Noto Sans Myanmar" ? "sans-serif" : project.font, fontSize: `clamp(12px, ${project.fontSize / 7}px, 8vw)`, color: project.textColor, WebkitTextStroke: `${project.outlineWidth / 2}px ${project.outlineColor}`, paintOrder: "stroke fill" }} onPointerDown={(event) => beginDrag(event, "subtitle")} role="button" tabIndex={0} aria-label="Drag subtitle overlay"><span>{project.subtitle || "Subtitle preview"}</span><span className="resize-handle" data-resize="true" onPointerDown={(event) => resizeOverlay(event, "subtitle")} /></div>
            </div>
          </div>
          <div className="timeline-panel">
            <div className="timeline-head"><div><strong>Timeline</strong><span>Preview only · one subtitle track</span></div><span>{formatTime(currentTime)} / {formatTime(duration)}</span></div>
            <input className="timeline-scrubber" type="range" min="0" max={Math.max(1, duration)} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); }} />
            <div className="timeline-track"><span className="track-label">SUB</span><div className="track-clip">{project.subtitle || "Subtitle track"}</div></div>
            <div className="timeline-track"><span className="track-label">FX</span><div className="track-clip blur-clip">Blur overlay</div></div>
          </div>
          <div className="editor-bottom-actions"><div className="save-status"><span className="status-dot" />{notice}</div><div className="action-buttons"><button className="editor-ghost" onClick={() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, updatedAt: Date.now() })); setNotice("Project ကို local storage ထဲ သိမ်းပြီးပါပြီ။"); } catch { setNotice("Save မအောင်မြင်ပါ။"); } }}>{t.save}</button><button className="editor-primary" onClick={exportSrt}>{t.export} SRT</button></div></div>
          <p className="editor-footnote">{t.exportNote} ယခုအဆင့်တွင် SRT export ကို ပံ့ပိုးထားပြီး MP4 render ကို FFmpeg.wasm integration ပြီးမှ ဖွင့်နိုင်ပါမည်။</p>
        </section>
      </div>
    </main>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
