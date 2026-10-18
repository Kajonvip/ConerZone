"use client";

import { useMemo, useState } from "react";

type View = "discover" | "studio" | "library";
type StudioTab = "script" | "subtitles" | "export";

const films = [
  { title: "Midnight Protocol", genre: "Thriller · 2025", tone: "blue", tag: "FEATURED", icon: "◈", desc: "One secret. One night. No way back." },
  { title: "Neon Horizon", genre: "Sci-Fi · 2024", tone: "purple", tag: "SCI-FI", icon: "✦", desc: "The future is closer than it looks." },
  { title: "Last Kingdom", genre: "Action · 2023", tone: "orange", tag: "ACTION", icon: "⚔", desc: "A forgotten heir returns home." },
  { title: "Silent Echo", genre: "Mystery · 2025", tone: "teal", tag: "MYSTERY", icon: "◉", desc: "Every silence hides a story." },
];

export default function Home() {
  const [view, setView] = useState<View>("discover");
  const [studioTab, setStudioTab] = useState<StudioTab>("script");
  const [projectName, setProjectName] = useState("My Movie Recap");
  const [script, setScript] = useState("");
  const [subtitleText, setSubtitleText] = useState("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const wordCount = useMemo(() => script.trim() ? script.trim().split(/\s+/).length : 0, [script]);
  const filteredFilms = films.filter((film) => (film.title + " " + film.genre).toLowerCase().includes(search.toLowerCase()));

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
    setNotice("Download စတင်ပါပြီ။ Downloads folder ကို စစ်ကြည့်ပါ။");
  }

  function exportSrt() {
    const lines = subtitleText.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) {
      setNotice("SRT ထုတ်ရန် subtitle စာသားကို အရင်ထည့်ပါ။");
      return;
    }
    const stamp = (seconds: number) => {
      const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
      const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
      const s = (seconds % 60).toString().padStart(2, "0");
      return `${h}:${m}:${s},000`;
    };
    const srt = lines.map((line, index) => `${index + 1}\n${stamp(index * 4)} --> ${stamp(index * 4 + 4)}\n${line}`).join("\n\n");
    downloadFile("conerzone-subtitles.srt", srt);
  }

  function exportScript() {
    if (!script.trim()) {
      setNotice("Download မလုပ်ခင် recap script ကို အရင်ရေးပါ။");
      return;
    }
    downloadFile("conerzone-recap-script.txt", `Project: ${projectName}\n\n${script}`);
  }

  return (
    <main className="steam-app">
      <aside className="side-nav">
        <a className="brand" href="#" onClick={() => setView("discover")} aria-label="ConerZone home">
          <span className="brand-symbol">CZ</span>
          <span className="brand-name">Coner<span>Zone</span><small>MOVIE RECAP STUDIO</small></span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <button className={view === "discover" ? "side-link selected" : "side-link"} onClick={() => setView("discover")}><span>⌂</span> Discover</button>
        <button className={view === "studio" ? "side-link selected" : "side-link"} onClick={() => setView("studio")}><span>✎</span> Recap Studio</button>
        <button className={view === "library" ? "side-link selected" : "side-link"} onClick={() => setView("library")}><span>▤</span> My Library</button>
        <div className="side-divider" />
        <div className="nav-caption">STUDIO TOOLS</div>
        <button className="side-link" onClick={() => { setView("studio"); setStudioTab("script"); }}><span>✦</span> Script Writer <i>SOON</i></button>
        <button className="side-link" onClick={() => { setView("studio"); setStudioTab("subtitles"); }}><span>▤</span> Subtitle Maker</button>
        <button className="side-link" onClick={() => { setView("studio"); setStudioTab("export"); }}><span>⇧</span> Export Center</button>
        <div className="sidebar-bottom"><span className="online-dot" /><div><strong>Studio Online</strong><small>Starter build · v0.2</small></div></div>
      </aside>

      <section className="content-area">
        <header className="top-header">
          <div className="mobile-brand"><span className="brand-symbol">CZ</span><strong>ConerZone</strong></div>
          <label className="search-box"><span>⌕</span><input aria-label="Search movies" value={search} onChange={(e) => { setSearch(e.target.value); setView("discover"); }} placeholder="Search movies, genres..." /></label>
          <div className="header-right"><span className="status-pill"><span className="online-dot" /> All systems ready</span><div className="avatar">CZ</div></div>
        </header>

        {view === "discover" && <div className="page-content">
          <div className="page-intro"><div><div className="eyebrow">YOUR CINEMATIC WORKSPACE</div><h1>Discover <span>stories.</span></h1><p>Find inspiration. Build your next movie recap.</p></div><button className="primary-button" onClick={() => setView("studio")}>＋ New project</button></div>
          <section className="hero-banner">
            <div className="hero-backdrop"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-glyph">▶</div></div>
            <div className="hero-copy"><span className="feature-label"><span /> THE CREATOR'S EDITION</span><h2>Your next<br /><em>great story</em><br />starts here.</h2><p>One workspace for your recap scripts, subtitles and creative projects.</p><button className="hero-button" onClick={() => setView("studio")}>Open Recap Studio <span>→</span></button></div>
            <div className="hero-foot"><span>CONERZONE ORIGINAL</span><span>CREATE · EDIT · EXPORT</span></div>
          </section>
          <div className="section-heading"><div><div className="eyebrow">PICK YOUR INSPIRATION</div><h2>Explore the collection</h2></div><span className="subtle-count">{filteredFilms.length} titles</span></div>
          <div className="film-grid">{filteredFilms.map((film) => <article className="film-card" key={film.title} onClick={() => { setProjectName(film.title + " Recap"); setView("studio"); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") { setProjectName(film.title + " Recap"); setView("studio"); } }}>
            <div className={"poster poster-" + film.tone}><span className="poster-tag">{film.tag}</span><span className="poster-symbol">{film.icon}</span><div className="poster-title">{film.title}</div><div className="poster-bottom">CZ ORIGINALS</div></div>
            <div className="film-info"><div><strong>{film.title}</strong><span>{film.genre}</span></div><button aria-label={"Create recap for " + film.title} onClick={(e) => { e.stopPropagation(); setProjectName(film.title + " Recap"); setView("studio"); }}>＋</button></div>
            <p className="film-desc">{film.desc}</p>
          </article>)}</div>
          {filteredFilms.length === 0 && <div className="empty-state">No titles match your search. Try another keyword.</div>}
          <section className="quick-start"><div className="quick-icon">✎</div><div><strong>Ready to tell the story?</strong><p>Start writing your recap and prepare subtitle files in one place.</p></div><button className="secondary-button" onClick={() => setView("studio")}>Launch Studio →</button></section>
        </div>}

        {view === "studio" && <div className="page-content">
          <div className="page-intro"><div><div className="eyebrow">CREATOR WORKSPACE</div><h1>Recap <span>Studio.</span></h1><p>Write your story, prepare subtitles, export your work.</p></div><span className="status-pill"><span className="online-dot" /> Local workspace</span></div>
          <div className="project-bar"><div className="project-badge">▶</div><label>PROJECT TITLE<input value={projectName} onChange={(e) => setProjectName(e.target.value)} aria-label="Project title" /></label><div className="project-stat"><span>{wordCount}</span><small>words</small></div></div>
          <div className="studio-panel"><div className="studio-tabs"><button className={studioTab === "script" ? "studio-tab active" : "studio-tab"} onClick={() => setStudioTab("script")}>✎ &nbsp; Recap Script</button><button className={studioTab === "subtitles" ? "studio-tab active" : "studio-tab"} onClick={() => setStudioTab("subtitles")}>▤ &nbsp; Subtitle Maker</button><button className={studioTab === "export" ? "studio-tab active" : "studio-tab"} onClick={() => setStudioTab("export")}>⇧ &nbsp; Export</button></div>
            {studioTab === "script" && <div className="tool-panel"><div className="tool-title"><div><div className="eyebrow">01 / WRITING ROOM</div><h2>Write your recap</h2></div><span className="mini-pill">{wordCount} words</span></div><p className="tool-help">မြန်မာဘာသာဖြင့် ဇာတ်လမ်းအကျဉ်းကို ဒီနေရာမှာ ရေးသားနိုင်ပါတယ်။</p><textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="ဒီဇာတ်ကားရဲ့ အစမှာ… ဇာတ်လမ်းအကျဉ်းကို ဒီမှာရေးပါ။" rows={12} /><div className="tool-actions"><button className="secondary-button" onClick={() => { setScript(""); setNotice(""); }}>Clear text</button><button className="primary-button" onClick={exportScript}>Download script ↗</button></div></div>}
            {studioTab === "subtitles" && <div className="tool-panel"><div className="tool-title"><div><div className="eyebrow">02 / CAPTIONS</div><h2>Subtitle maker</h2></div><span className="mini-pill">SRT export</span></div><p className="tool-help">စာကြောင်းတစ်ကြောင်းစီကို line အသစ်မှာ ရေးပါ။ တစ်ကြောင်းကို ၄ စက္ကန့်စီ သတ်မှတ်ပေးပါတယ်။</p><textarea value={subtitleText} onChange={(e) => setSubtitleText(e.target.value)} placeholder={"ပထမ subtitle စာကြောင်း\nဒုတိယ subtitle စာကြောင်း"} rows={12} /><div className="tool-actions"><button className="secondary-button" onClick={() => setSubtitleText("")}>Clear text</button><button className="primary-button" onClick={exportSrt}>Download .srt ↗</button></div></div>}
            {studioTab === "export" && <div className="tool-panel"><div className="tool-title"><div><div className="eyebrow">03 / DELIVERY</div><h2>Export center</h2></div><span className="mini-pill">Starter</span></div><div className="export-row"><div className="file-type">TXT</div><div><strong>Recap script</strong><p>Download your written script as a text file.</p></div><button className="secondary-button" onClick={exportScript}>Export</button></div><div className="export-row"><div className="file-type">SRT</div><div><strong>Subtitles</strong><p>Export subtitle lines with basic timestamps.</p></div><button className="secondary-button" onClick={exportSrt}>Export</button></div><div className="feature-notice">AI generation, voice-over, video editing and MP4 rendering are not connected yet. These features need additional implementation.</div></div>}
            {notice && <div className="inline-notice" role="status">{notice}</div>}
          </div>
        </div>}

        {view === "library" && <div className="page-content"><div className="page-intro"><div><div className="eyebrow">YOUR WORK IN PROGRESS</div><h1>My <span>Library.</span></h1><p>Start a project from your own movie idea.</p></div><button className="primary-button" onClick={() => setView("studio")}>＋ New project</button></div><div className="library-empty"><div className="library-empty-icon">▤</div><h2>Your library starts here.</h2><p>Your projects are not saved between browser sessions yet. Start a recap and download your work to keep it safe.</p><button className="primary-button" onClick={() => setView("studio")}>Create first recap →</button></div></div>}
        <footer className="site-footer"><span>© 2026 CONERZONE STUDIO</span><span>Built for stories worth telling.</span></footer>
      </section>
    </main>
  );
}
