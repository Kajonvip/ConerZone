"use client";

import { useMemo, useState } from "react";

type Tab = "script" | "subtitles" | "export";

export default function Home() {
  const [tab, setTab] = useState<Tab>("script");
  const [projectName, setProjectName] = useState("My Movie Recap");
  const [script, setScript] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [notice, setNotice] = useState("");

  const wordCount = useMemo(
    () => script.trim() ? script.trim().split(/\s+/).length : 0,
    [script]
  );

  function downloadText(filename: string, content: string, type = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("ဖိုင်ကို ဖုန်းထဲသို့ download လုပ်ရန် စတင်လိုက်ပါပြီ။");
  }

  function exportSrt() {
    const lines = subtitleText.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      setNotice("SRT ထုတ်ရန် subtitle စာသားကို အရင်ထည့်ပါ။");
      return;
    }
    const srt = lines.map((line, index) => {
      const start = index * 4;
      const end = start + 4;
      const timestamp = (seconds: number) => {
        const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
        const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${hours}:${minutes}:${secs},000`;
      };
      return `${index + 1}\n${timestamp(start)} --> ${timestamp(end)}\n${line}`;
    }).join("\n\n");
    downloadText("conerzone-subtitles.srt", srt);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">CZ</div>
        <div className="brand-copy">
          <strong>ConerZone</strong>
          <span>AI Movie Recap Studio</span>
        </div>
        <div className="sidebar-label">WORKSPACE</div>
        <button className={tab === "script" ? "nav-item active" : "nav-item"} onClick={() => setTab("script")}>✍️ <span>Recap Script</span></button>
        <button className={tab === "subtitles" ? "nav-item active" : "nav-item"} onClick={() => setTab("subtitles")}>▤ <span>Subtitles</span></button>
        <button className={tab === "export" ? "nav-item active" : "nav-item"} onClick={() => setTab("export")}>↗ <span>Export Center</span></button>
        <div className="sidebar-bottom">
          <div className="status-dot" />
          <span>Starter version · v0.1</span>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div><span className="eyebrow">YOUR CREATIVE WORKSPACE</span><h1>Movie Recap Studio</h1></div>
          <div className="topbar-pill"><span className="status-dot" /> Local workspace</div>
        </header>

        <section className="welcome-card">
          <div className="welcome-content">
            <span className="welcome-tag">CONERZONE STUDIO</span>
            <h2>Turn your ideas into<br /><em>movie stories.</em></h2>
            <p>Write recap scripts, prepare subtitles, and export your work in one simple workspace.</p>
          </div>
          <div className="film-art" aria-hidden="true"><div className="film-circle">▶</div><div className="film-line" /></div>
        </section>

        <section className="project-row">
          <div><span className="section-kicker">CURRENT PROJECT</span><h3>Project details</h3></div>
          <label className="project-input-label">Project name<input value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label="Project name" /></label>
        </section>

        <div className="workspace-card">
          <div className="tab-bar">
            <button className={tab === "script" ? "tab active-tab" : "tab"} onClick={() => setTab("script")}>Recap Script</button>
            <button className={tab === "subtitles" ? "tab active-tab" : "tab"} onClick={() => setTab("subtitles")}>Subtitle Maker</button>
            <button className={tab === "export" ? "tab active-tab" : "tab"} onClick={() => setTab("export")}>Export</button>
          </div>

          {tab === "script" && <div className="editor-panel">
            <div className="editor-heading"><div><span className="section-kicker">01 / WRITING ROOM</span><h3>Recap script</h3></div><span className="word-count">{wordCount} words</span></div>
            <p className="helper">မြန်မာဘာသာဖြင့် recap ဇာတ်ကြောင်းကို ဒီနေရာမှာ ရေးသားနိုင်ပါတယ်။</p>
            <textarea value={script} onChange={(event) => setScript(event.target.value)} placeholder="ဒီဇာတ်ကားရဲ့ အစမှာ… ဇာတ်လမ်းအကျဉ်းကို ဒီမှာရေးပါ။" rows={10} />
            <div className="editor-actions"><button className="button secondary" onClick={() => { setScript(""); setNotice(""); }}>Clear</button><button className="button primary" onClick={() => downloadText("conerzone-recap-script.txt", `Project: ${projectName}\n\n${script}`)}>Download script ↗</button></div>
          </div>}

          {tab === "subtitles" && <div className="editor-panel">
            <div className="editor-heading"><div><span className="section-kicker">02 / CAPTIONS</span><h3>Subtitle maker</h3></div><span className="word-count">SRT export</span></div>
            <p className="helper">စာကြောင်းတစ်ကြောင်းစီကို line အသစ်မှာ ရေးပါ။ လက်ရှိ starter က တစ်ကြောင်းကို ၄ စက္ကန့်စီ သတ်မှတ်ပြီး SRT ဖိုင်ထုတ်ပေးပါတယ်။</p>
            <textarea value={subtitleText} onChange={(event) => setSubtitleText(event.target.value)} placeholder={"ပထမ subtitle စာကြောင်း\nဒုတိယ subtitle စာကြောင်း"} rows={10} />
            <div className="editor-actions"><button className="button secondary" onClick={() => setSubtitleText("")}>Clear</button><button className="button primary" onClick={exportSrt}>Download .srt ↗</button></div>
          </div>}

          {tab === "export" && <div className="editor-panel">
            <div className="editor-heading"><div><span className="section-kicker">03 / DELIVERY</span><h3>Export center</h3></div><span className="word-count">Starter</span></div>
            <div className="export-item"><div className="export-icon">TXT</div><div><strong>Recap script</strong><p>Download the current script as a text file.</p></div><button className="button secondary" onClick={() => downloadText("conerzone-recap-script.txt", `Project: ${projectName}\n\n${script}`)}>Export</button></div>
            <div className="export-item"><div className="export-icon">SRT</div><div><strong>Subtitles</strong><p>Export lines as a basic subtitle file.</p></div><button className="button secondary" onClick={exportSrt}>Export</button></div>
            <div className="notice-box">MP4 rendering, AI voice-over, online AI, video URL importing, and Android APK packaging are not connected yet. They require additional backend services and testing.</div>
          </div>}
          {notice && <div className="inline-notice" role="status">{notice}</div>}
        </div>

        <footer><span>© ConerZone Studio</span><span>Build your story, one scene at a time.</span></footer>
      </section>
    </main>
  );
}
