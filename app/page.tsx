"use client";

import { useMemo, useState } from "react";

type Movie = { id: number; title: string; genre: string; year: string; rating: string; description: string; image: string; category: string };

const movies: Movie[] = [
  { id: 1, title: "The Last Kingdom", genre: "Action • Adventure", year: "2024", rating: "8.7", description: "A lone warrior faces a kingdom on the edge of collapse.", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85", category: "Trending" },
  { id: 2, title: "Shadow City", genre: "Thriller • Mystery", year: "2025", rating: "8.2", description: "One secret can change an entire city.", image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85", category: "Popular" },
  { id: 3, title: "Beyond The Sea", genre: "Drama • Adventure", year: "2023", rating: "8.5", description: "A journey to find what was lost.", image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=85", category: "New Releases" },
  { id: 4, title: "Neon Nights", genre: "Sci-Fi • Action", year: "2025", rating: "7.9", description: "The future is closer than you think.", image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85", category: "Trending" },
  { id: 5, title: "Wild Earth", genre: "Documentary", year: "2024", rating: "9.0", description: "Discover the beautiful world we share.", image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=85", category: "Popular" },
  { id: 6, title: "The Hidden Door", genre: "Fantasy • Mystery", year: "2022", rating: "8.1", description: "Behind every door lies another story.", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=85", category: "New Releases" }
];

const categories = ["All", "Trending", "Popular", "New Releases"];

export default function Home() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Movie | null>(null);
  const filtered = useMemo(() => movies.filter((movie) => (category === "All" || movie.category === category) && movie.title.toLowerCase().includes(query.toLowerCase())), [category, query]);

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="ConerZone home"><span className="brand-mark">C<span>Z</span></span><span>CONER<span className="brand-accent">ZONE</span></span></a>
        <nav className="topnav"><a className="active" href="#home">Home</a><a href="#browse">Movies</a><a href="#browse">Series</a><a href="#browse">My List</a></nav>
        <label className="searchbox"><span>⌕</span><input aria-label="Search movies" placeholder="Search movies..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <button className="avatar" aria-label="Profile">K</button>
      </header>

      <section className="hero" id="home">
        <div className="hero-image" />
        <div className="hero-content">
          <div className="eyebrow"><span className="live-dot" /> CONERZONE ORIGINAL</div>
          <p className="hero-kicker">THE STORY STARTS HERE</p>
          <h1>Discover your next <span>favorite</span>.</h1>
          <p className="hero-description">Explore unforgettable stories, movie recaps, and cinematic worlds — all in one place.</p>
          <div className="hero-actions"><button className="primary-btn" onClick={() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth" })}>▶ Explore Movies</button><button className="secondary-btn" onClick={() => setSelected(movies[0])}>ⓘ More Info</button></div>
          <div className="hero-meta"><span>★ 8.7/10</span><span>2025</span><span>HD</span><span>Action • Adventure</span></div>
        </div>
        <div className="hero-index"><span>01</span><i /> 03</div>
      </section>

      <section className="browse-section" id="browse">
        <div className="section-heading"><div><p className="section-kicker">PICK YOUR NEXT WATCH</p><h2>Explore Movies</h2></div><div className="filters">{categories.map((item) => <button key={item} className={category === item ? "filter active-filter" : "filter"} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
        <div className="movie-grid">
          {filtered.map((movie) => <article className="movie-card" key={movie.id} onClick={() => setSelected(movie)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelected(movie); }}>
            <div className="poster" style={{ backgroundImage: `linear-gradient(0deg, rgba(7,10,17,.95), rgba(7,10,17,0) 70%), url("${movie.image}")` }}><span className="poster-rating">★ {movie.rating}</span><button className="play-button" aria-label={`More about ${movie.title}`} onClick={(event) => { event.stopPropagation(); setSelected(movie); }}>▶</button><span className="poster-tag">HD</span></div>
            <div className="movie-info"><h3>{movie.title}</h3><p>{movie.year} <span>•</span> {movie.genre}</p></div>
          </article>)}
          {filtered.length === 0 && <div className="empty-state">No movies found. Try another search.</div>}
        </div>
      </section>
      <footer className="footer"><a className="brand footer-brand" href="#home"><span className="brand-mark">C<span>Z</span></span><span>CONER<span className="brand-accent">ZONE</span></span></a><span>Stories worth staying for.</span><span>© 2026 ConerZone</span></footer>

      {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="movie-modal" role="dialog" aria-modal="true" aria-label={selected.title} onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button><div className="modal-poster" style={{ backgroundImage: `linear-gradient(0deg, #10131c, transparent), url("${selected.image}")` }} /><div className="modal-content"><p className="section-kicker">{selected.category.toUpperCase()}</p><h2>{selected.title}</h2><p className="modal-meta">★ {selected.rating} &nbsp; • &nbsp; {selected.year} &nbsp; • &nbsp; {selected.genre}</p><p>{selected.description}</p><button className="primary-btn" onClick={() => setSelected(null)}>✓ Got it</button></div></section></div>}
    </main>
  );
}
