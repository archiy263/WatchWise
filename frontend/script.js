// ============================================================
//  WatchWise - Sidebar Dashboard SPA
// ============================================================

const API_BASE = "http://127.0.0.1:8000";

const ROUTES = {
    home: renderHome, browse: renderBrowse, discover: renderDiscover,
    sentiment: renderSentiment, predict: renderPredict, about: renderAbout
};

const GENRE_GRADIENT = {
    'Crime':'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
    'Action':'linear-gradient(135deg,#200122,#6f0000)',
    'Horror':'linear-gradient(135deg,#0d0d0d,#1a0000,#400000)',
    'Romance':'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
    'Comedy':'linear-gradient(135deg,#1a1a00,#2d2d00,#4a3800)',
    'Sci-Fi':'linear-gradient(135deg,#0a0a1a,#0d1b2a,#1b262c)',
    'Fantasy':'linear-gradient(135deg,#1a0533,#2d1b69,#11998e)',
    'Drama':'linear-gradient(135deg,#1c1c1c,#2d2d2d,#3e1f1f)',
    'Historical':'linear-gradient(135deg,#1a1000,#2d1f00,#4a3000)',
    'Sports':'linear-gradient(135deg,#0a1628,#1e3a5f,#0f2c5a)',
    'Animation':'linear-gradient(135deg,#0d1117,#1b2838,#0f2044)',
    'Thriller':'linear-gradient(135deg,#1a001a,#2d002d,#3d0033)',
    'Biography':'linear-gradient(135deg,#1a1400,#2d2200,#3d3000)',
};
function getPosterGradient(genres) {
    return GENRE_GRADIENT[genres.split(' ')[0]] || 'linear-gradient(135deg,#1a1a2e,#16213e)';
}

const TYPE_CONFIG = {
    movie:  { icon:'\u{1F3AC}', label:'Movie',      color:'#E77A4C', bg:'rgba(231,122,76,0.12)', border:'rgba(231,122,76,0.3)' },
    series: { icon:'\u{1F4FA}', label:'Web Series', color:'#E50914', bg:'rgba(229,9,20,0.08)',   border:'rgba(229,9,20,0.3)' },
    show:   { icon:'\u{1F4E1}', label:'TV Show',    color:'#FF9A6A', bg:'rgba(255,154,106,0.08)',  border:'rgba(255,154,106,0.3)' },
};

// ============================================================
//   ROUTING
// ============================================================
function navigate(page) {
    const app = document.getElementById('app');
    const fn = ROUTES[page] || renderHome;
    app.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'page';
    app.appendChild(container);
    fn(container);
    document.querySelectorAll('.sidebar-link').forEach(l =>
        l.classList.toggle('active', l.dataset.page === page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleRouting() {
    const hash = location.hash.replace('#', '') || 'home';
    navigate(hash);
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('DOMContentLoaded', () => {
    handleRouting();
    // Mobile menu
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('visible'); });
        overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); });
    }
    // Sidebar link clicks
    document.addEventListener('click', e => {
        const link = e.target.closest('[data-page]');
        if (link) {
            e.preventDefault();
            location.hash = '#' + link.dataset.page;
            sidebar.classList.remove('open');
            overlay.classList.remove('visible');
        }
    });
});

// ============================================================
//   POSTER CARD
// ============================================================
function posterCardHTML(movie) {
    const m = getMovieWithMeta(movie);
    const tc = TYPE_CONFIG[m.type] || TYPE_CONFIG.movie;
    const pFirst = m.platforms[0];
    const pCfg = PLATFORMS[pFirst?.n] || { color:'#888', label: pFirst?.n || '' };
    const gradient = getPosterGradient(m.genres);
    const initial = m.title.charAt(0).toUpperCase();
    const second = m.title.split(' ')[1]?.charAt(0) || '';
    const posterSrc = (typeof MOVIE_POSTERS !== 'undefined' && MOVIE_POSTERS[m.title])
        ? MOVIE_POSTERS[m.title]
        : `${API_BASE}/poster?title=${encodeURIComponent(m.title)}`;

    return `<div class="poster-card" data-title="${m.title.replace(/"/g, '&quot;')}">
        <div class="poster-banner" style="background:${gradient};">
            <img class="poster-img-real" src="${posterSrc}" loading="lazy"
                 onload="this.style.opacity='1';this.nextElementSibling.style.display='none';"
                 onerror="this.style.display='none';" alt="${m.title}">
            <div class="poster-initial">${initial}${second}</div>
            <div class="poster-type-badge" style="background:${tc.bg};color:${tc.color};border:1px solid ${tc.border};">${tc.icon} ${tc.label}</div>
            ${m.type !== 'movie' && m.seasons ? `<div class="poster-seasons">${m.seasons} S</div>` : ''}
            <div class="poster-overlay">
                <button class="poster-play-btn" onclick="event.stopPropagation();window.open('${m.trailerURL}','_blank');">&#9654; Trailer</button>
                <button class="poster-info-btn"><i class="fas fa-info"></i></button>
            </div>
        </div>
        <div class="poster-body">
            <div class="poster-title">${m.title}</div>
            <div class="poster-sub">${m.genres.split(' ').slice(0,2).join(' \u00b7 ')}${m.year !== '\u2014' ? ' \u00b7 '+m.year : ''}</div>
            <div class="poster-footer">
                ${m.rating !== '\u2014' ? `<span class="poster-rating"><i class="fas fa-star"></i> ${m.rating}</span>` : '<span></span>'}
                <span class="poster-platform" style="color:${pCfg.color};">${pCfg.label}</span>
            </div>
        </div>
    </div>`;
}

function addPosterListeners(container) {
    container.querySelectorAll('.poster-card').forEach(card => {
        card.addEventListener('click', () => {
            const dbMovie = MOVIES_DB.find(m => m.title === card.dataset.title);
            if (dbMovie) openMovieModal(getMovieWithMeta(dbMovie));
        });
    });
}

// ============================================================
//   DISPLAY MOVIES (paginated)
// ============================================================
function displayMovies(movies, containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    const PAGE_SIZE = 100;
    let idx = 0;

    if (movies.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);"><i class="fas fa-search" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:0.75rem;"></i>No results found</div>`;
        return;
    }

    function renderChunk() {
        const slice = movies.slice(idx, idx + PAGE_SIZE);
        const btn = grid.querySelector('.load-more-btn');
        const html = slice.map(m => posterCardHTML(m)).join('');
        if (btn) btn.insertAdjacentHTML('beforebegin', html);
        else grid.insertAdjacentHTML('beforeend', html);
        addPosterListeners(grid);
        idx += PAGE_SIZE;
    }

    renderChunk();

    if (movies.length > PAGE_SIZE) {
        const btn = document.createElement('button');
        btn.textContent = 'Load More';
        btn.className = 'btn-primary load-more-btn';
        btn.style.cssText = 'grid-column:1/-1;margin:1.5rem auto;';
        btn.onclick = () => { renderChunk(); if (idx >= movies.length) btn.remove(); };
        grid.appendChild(btn);
    }
}

// ============================================================
//   HOME (Dashboard)
// ============================================================
function renderHome(container) {
    const total = MOVIES_DB.length;
    const moviesCount = MOVIES_DB.filter(m => m.type === 'movie').length;
    const seriesCount = MOVIES_DB.filter(m => m.type === 'series').length;
    const showCount   = MOVIES_DB.filter(m => m.type === 'show').length;
    const langs = [...new Set(MOVIES_DB.map(m => m.lang))].length;

    container.innerHTML = `
    <div class="dash-hero">
        <!-- Animated Particles -->
        <div class="hero-particles"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>

        <!-- Connection Lines -->
        <div class="hero-connections"><div class="conn-line"></div><div class="conn-line"></div><div class="conn-line"></div></div>

        <!-- LEFT: Typography -->
        <div class="hero-left">
            <div class="hero-badge"><i class="fas fa-bolt"></i> Neural Engine Active · 3 AI Models Running</div>
            <h1>
                Your Next Obsession,
                <span class="line2"><span class="glow-text" data-text="Decoded by AI.">Decoded by AI.</span></span>
            </h1>
            <p>Experience entertainment intelligence — <strong>${total.toLocaleString()} titles</strong> analyzed through deep learning, with real-time sentiment scoring, predictive analytics, and hyper-personalized discovery.</p>
            <div class="hero-actions">
                <a href="#browse" data-page="browse" class="btn-primary"><i class="fas fa-rocket"></i> Explore Universe</a>
                <a href="#discover" data-page="discover" class="btn-secondary"><i class="fas fa-wand-magic-sparkles"></i> AI Discovery</a>
            </div>
            <div class="hero-live-stats">
                <div class="hero-live-stat"><div class="num">${moviesCount.toLocaleString()}</div><div class="lbl">Movies</div></div>
                <div class="hero-live-stat"><div class="num">${seriesCount.toLocaleString()}</div><div class="lbl">Web Series</div></div>
                <div class="hero-live-stat"><div class="num">${showCount}</div><div class="lbl">TV Shows</div></div>
                <div class="hero-live-stat"><div class="num">${langs}</div><div class="lbl">Languages</div></div>
            </div>
        </div>

        <!-- RIGHT: Visual Panel -->
        <div class="hero-right">
            <!-- Glow Orbs -->
            <div class="hero-orb orb-1"></div>
            <div class="hero-orb orb-2"></div>
            <div class="hero-orb orb-3"></div>

            <!-- Floating Card 1: Movie Preview -->
            <div class="float-card card-movie">
                <div class="fcard-poster"></div>
                <div class="fcard-title">Inception</div>
                <div class="fcard-meta">Sci-Fi · Thriller · 2010</div>
                <div class="fcard-rating">
                    <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-stroke"></i>
                    <span>8.8</span>
                    <div class="fcard-bar-wrap"><div class="fcard-bar" style="width:88%;"></div></div>
                </div>
            </div>

            <!-- Floating Card 2: AI Graph -->
            <div class="float-card card-graph">
                <div class="fgraph-header"><span>AI Match Score</span><span class="fgraph-badge">LIVE</span></div>
                <div class="fgraph-bars">
                    <div class="fgraph-bar" style="height:35%;"></div>
                    <div class="fgraph-bar" style="height:55%;"></div>
                    <div class="fgraph-bar" style="height:45%;"></div>
                    <div class="fgraph-bar" style="height:80%;"></div>
                    <div class="fgraph-bar" style="height:65%;"></div>
                    <div class="fgraph-bar" style="height:90%;"></div>
                    <div class="fgraph-bar" style="height:50%;"></div>
                    <div class="fgraph-bar" style="height:72%;"></div>
                </div>
                <div class="fgraph-labels"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Now</span></div>
            </div>

            <!-- Floating Card 3: Sentiment Score -->
            <div class="float-card card-sentiment">
                <div class="fsent-header"><i class="fas fa-face-smile-beam"></i><span>Sentiment AI</span></div>
                <div class="fsent-score">94%</div>
                <div class="fsent-label">Positive Score</div>
                <div class="fsent-ring"></div>
            </div>

            <!-- Floating Card 4: Genre Chart -->
            <div class="float-card card-genres">
                <div style="font-size:0.7rem;font-weight:600;margin-bottom:0.5rem;">Top Genres</div>
                <div class="fgenre-item"><div class="fgenre-dot" style="background:#E77A4C;"></div><div class="fgenre-name">Drama</div><div class="fgenre-pct">32%</div></div>
                <div class="fgenre-item"><div class="fgenre-dot" style="background:#FF9A6A;"></div><div class="fgenre-name">Action</div><div class="fgenre-pct">24%</div></div>
                <div class="fgenre-item"><div class="fgenre-dot" style="background:#FBBF24;"></div><div class="fgenre-name">Thriller</div><div class="fgenre-pct">18%</div></div>
                <div class="fgenre-item"><div class="fgenre-dot" style="background:#C4976B;"></div><div class="fgenre-name">Comedy</div><div class="fgenre-pct">14%</div></div>
            </div>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card"><span class="stat-icon"><i class="fas fa-layer-group"></i></span><div class="stat-label">Total Titles</div><div class="stat-val gradient-text">${total.toLocaleString()}</div></div>
        <div class="stat-card"><span class="stat-icon"><i class="fas fa-film"></i></span><div class="stat-label">Movies</div><div class="stat-val">${moviesCount.toLocaleString()}</div></div>
        <div class="stat-card"><span class="stat-icon"><i class="fas fa-tv"></i></span><div class="stat-label">Web Series</div><div class="stat-val">${seriesCount.toLocaleString()}</div></div>
        <div class="stat-card"><span class="stat-icon"><i class="fas fa-satellite-dish"></i></span><div class="stat-label">TV Shows</div><div class="stat-val">${showCount}</div></div>
        <div class="stat-card"><span class="stat-icon"><i class="fas fa-globe"></i></span><div class="stat-label">Languages</div><div class="stat-val">${langs}</div></div>
    </div>

    <div class="content-row"><div class="section-header"><div class="section-title">\u{1F525} Trending Indian Series</div><a href="#browse" data-page="browse" class="section-link">View All \u2192</a></div><div class="row-scroll" id="row-indian"></div></div>
    <div class="content-row"><div class="section-header"><div class="section-title"> International Hits</div><a href="#browse" data-page="browse" class="section-link">View All \u2192</a></div><div class="row-scroll" id="row-intl"></div></div>
    <div class="content-row"><div class="section-header"><div class="section-title"> Bollywood & Hindi Films</div><a href="#browse" data-page="browse" class="section-link">View All \u2192</a></div><div class="row-scroll" id="row-bolly"></div></div>
    <div class="content-row"><div class="section-header"><div class="section-title"> South Indian Blockbusters</div><a href="#browse" data-page="browse" class="section-link">View All \u2192</a></div><div class="row-scroll" id="row-south"></div></div>
    <div class="content-row"><div class="section-header"><div class="section-title"> Hollywood Classics</div><a href="#browse" data-page="browse" class="section-link">View All \u2192</a></div><div class="row-scroll" id="row-holly"></div></div>
    <div class="content-row"><div class="section-header"><div class="section-title"> Korean & Asian Cinema</div><a href="#browse" data-page="browse" class="section-link">View All \u2192</a></div><div class="row-scroll" id="row-asian"></div></div>`;

    const rows = [
        ['row-indian', m => m.type==='series' && m.country==='India'],
        ['row-intl',   m => m.type==='series' && m.country!=='India'],
        ['row-bolly',  m => m.type==='movie' && m.lang==='Hindi'],
        ['row-south',  m => m.type==='movie' && ['Telugu','Tamil','Malayalam','Kannada'].includes(m.lang)],
        ['row-holly',  m => m.type==='movie' && m.country==='USA'],
        ['row-asian',  m => ['Korean','Japanese','Mandarin'].includes(m.lang)],
    ];
    rows.forEach(([id, fn]) => {
        const el = container.querySelector(`#${id}`);
        const data = MOVIES_DB.filter(fn).slice(0,15);
        if (el && data.length) { el.innerHTML = data.map(m => posterCardHTML(m)).join(''); addPosterListeners(el); }
    });
}

// ============================================================
//   BROWSE
// ============================================================
function renderBrowse(container) {
    const languages = [...new Set(MOVIES_DB.map(m => m.lang))].sort();
    const platforms = [...new Set(MOVIES_DB.map(m => { const meta = MOVIE_META[m.title]; return meta?.platforms?.map(p => p.n) || []; }).flat())].sort();
    const moviesCount = MOVIES_DB.filter(m=>m.type==='movie').length;
    const seriesCount = MOVIES_DB.filter(m=>m.type==='series').length;
    const showCount   = MOVIES_DB.filter(m=>m.type==='show').length;

    container.innerHTML = `
    <div class="browse-header">
        <h1><span class="gradient-text">Browse</span> Catalog</h1>
        <p>${MOVIES_DB.length.toLocaleString()} titles across 10+ streaming platforms</p>
    </div>
    <div class="type-pills">
        <button class="type-pill active" data-type="all"><i class="fas fa-th-large"></i> All <span class="pill-count">${MOVIES_DB.length.toLocaleString()}</span></button>
        <button class="type-pill" data-type="movie"><i class="fas fa-film"></i> Movies <span class="pill-count">${moviesCount.toLocaleString()}</span></button>
        <button class="type-pill" data-type="series"><i class="fas fa-tv"></i> Web Series <span class="pill-count">${seriesCount.toLocaleString()}</span></button>
        <button class="type-pill" data-type="show"><i class="fas fa-satellite-dish"></i> TV Shows <span class="pill-count">${showCount}</span></button>
    </div>
    <div class="filter-bar">
        <div class="filter-search"><i class="fas fa-search"></i><input type="text" id="browse-search" placeholder="Search titles, genres, directors..."></div>
        <select class="filter-select" id="filter-lang"><option value="">All Languages</option>${languages.map(l=>`<option>${l}</option>`).join('')}</select>
        <select class="filter-select" id="filter-platform"><option value="">All Platforms</option>${platforms.map(p=>`<option>${p}</option>`).join('')}</select>
        <select class="filter-select" id="filter-sort"><option value="default">Recommended</option><option value="rating">Highest Rated</option><option value="year_new">Newest</option><option value="year_old">Oldest</option></select>
    </div>
    <p class="results-info" id="results-info"></p>
    <div class="poster-grid" id="browse-grid"></div>`;

    let currentType = 'all';
    container.querySelectorAll('.type-pill').forEach(chip => {
        chip.addEventListener('click', () => {
            container.querySelectorAll('.type-pill').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentType = chip.dataset.type;
            applyFilters();
        });
    });

    function applyFilters() {
        const q = (container.querySelector('#browse-search')?.value || '').toLowerCase();
        const lang = container.querySelector('#filter-lang')?.value;
        const plat = container.querySelector('#filter-platform')?.value;
        const sort = container.querySelector('#filter-sort')?.value;

        let filtered = MOVIES_DB.map(getMovieWithMeta).filter(m => {
            const tMatch = currentType === 'all' || m.type === currentType;
            const qMatch = !q || m.title.toLowerCase().includes(q) || m.overview.toLowerCase().includes(q) || m.genres.toLowerCase().includes(q) || (m.director||'').toLowerCase().includes(q);
            const lMatch = !lang || m.lang === lang;
            const pMatch = !plat || m.platforms.some(p => p.n === plat);
            return tMatch && qMatch && lMatch && pMatch;
        });

        if (sort === 'rating') filtered.sort((a,b) => (parseFloat(b.rating)||0)-(parseFloat(a.rating)||0));
        else if (sort === 'year_new') filtered.sort((a,b) => (parseInt(b.year)||0)-(parseInt(a.year)||0));
        else if (sort === 'year_old') filtered.sort((a,b) => (parseInt(a.year)||0)-(parseInt(b.year)||0));

        container.querySelector('#results-info').textContent = `${filtered.length.toLocaleString()} titles found`;
        displayMovies(filtered, 'browse-grid');
    }

    ['#browse-search','#filter-lang','#filter-platform','#filter-sort'].forEach(sel => {
        const el = container.querySelector(sel);
        if (el) { el.addEventListener('input', applyFilters); el.addEventListener('change', applyFilters); }
    });
    applyFilters();
}

// ============================================================
//   DISCOVER (AI Recommendations)
// ============================================================
function renderDiscover(container) {
    container.innerHTML = `
    <div class="tool-page">
        <h1><i class="fas fa-wand-magic-sparkles accent-icon"></i> AI Content Recommender</h1>
        <p class="page-desc">Get similar titles powered by TF-IDF + Cosine Similarity from ${MOVIES_DB.length.toLocaleString()}+ content database</p>
        <div class="glass-card">
            <div class="card-header"><i class="fas fa-wand-magic-sparkles accent-icon"></i><h2>Smart Discovery</h2></div>
            <p class="card-desc">Search by <strong>movie title</strong> or <strong>genre keyword</strong></p>
            <div class="modern-input">
                <i class="fas fa-search input-icon"></i>
                <input type="text" id="movie-search" placeholder="e.g. Inception, Breaking Bad, Action, Horror..." onkeydown="if(event.key==='Enter')getRecommendations()">
                <button class="btn-primary" onclick="getRecommendations()">Discover <i class="fas fa-arrow-right"></i></button>
            </div>
            <p class="tags-label">\u{1F3AC} Popular Titles</p>
            <div class="quick-tags">
                ${['RRR','Breaking Bad','Scam 1992 The Harshad Mehta Story','Inception','Mirzapur','Parasite','3 Idiots','Game of Thrones'].map(t =>
                    `<button class="quick-tag" onclick="document.getElementById('movie-search').value='${t}';getRecommendations()">${t}</button>`
                ).join('')}
            </div>
            <p class="tags-label">\u{1F3AD} Browse by Genre</p>
            <div class="quick-tags">
                ${['Action','Thriller','Drama','Comedy','Horror','Sci-Fi','Romance','Crime','Mystery','Animation','Biography','History','Historical','Sports','Fantasy','Documentary'].map(g =>
                    `<button class="quick-tag genre" onclick="document.getElementById('movie-search').value='${g}';getRecommendations()"><i class="fas fa-tag" style="font-size:0.6rem;"></i> ${g}</button>`
                ).join('')}
            </div>
            <div id="recommendation-results" class="results-container"></div>
        </div>
        <div class="glass-card info-card">
            <h3><i class="fas fa-circle-info" style="color:var(--accent);"></i> How it works</h3>
            <p>Our AI uses <strong>TF-IDF + Cosine Similarity</strong> \u2014 a content-based filtering algorithm. It analyzes genres, plot, and language vectors to find the most thematically similar titles. You can also search by genre to discover top-rated content in any category.</p>
        </div>
    </div>`;
}

// ============================================================
//   SENTIMENT AI
// ============================================================
function renderSentiment(container) {
    container.innerHTML = `
    <div class="tool-page">
        <h1><i class="fas fa-brain accent-icon"></i> Sentiment Analysis AI</h1>
        <p class="page-desc">Analyze movie reviews using multilingual BERT from HuggingFace</p>
        <div class="glass-card">
            <div class="card-header"><i class="fas fa-brain accent-icon"></i><h2>Review Analyzer</h2></div>
            <p class="card-desc">BERT Transformer \u00b7 Hindi, Tamil, English, Korean, Spanish and more</p>
            <div class="modern-input" style="flex-direction:column;align-items:stretch;">
                <div style="display:flex;align-items:flex-start;padding:0.3rem;">
                    <i class="fas fa-comment-dots input-icon" style="margin-top:0.7rem;"></i>
                    <textarea id="review-text" rows="4" style="background:none;border:none;outline:none;color:var(--text);font-family:inherit;font-size:0.95rem;padding:0.65rem 0;flex:1;resize:vertical;" placeholder="Write a movie or series review in any language..."></textarea>
                </div>
                <div style="padding:0 0.3rem 0.3rem;"><button class="btn-primary" onclick="analyzeSentiment()"><i class="fas fa-microchip"></i> Analyze with BERT</button></div>
            </div>
            <div class="quick-tags" style="margin-top:0.75rem;">
                <span style="color:var(--text-muted);font-size:0.78rem;">Samples:</span>
                ${[
                    ['Positive','Mirzapur is an absolute masterpiece! The writing, performances, and tension are all top-notch.'],
                    ['Mixed','Breaking Bad is well-crafted but the pacing in season 2 is quite slow.'],
                    ['Negative','Terrible writing, boring plot, and the acting is atrocious. Complete waste.']
                ].map(([l,t]) => `<button class="quick-tag" onclick="document.getElementById('review-text').value=\`${t}\`;analyzeSentiment()">${l}</button>`).join('')}
            </div>
            <div id="sentiment-results" class="results-container"></div>
        </div>
        <div class="glass-card info-card">
            <h3><i class="fas fa-circle-info" style="color:var(--accent);"></i> About the Model</h3>
            <p><strong>BERT (Bidirectional Encoder Representations from Transformers)</strong> reads the full context of a review bidirectionally and outputs a 1\u20135 star rating with a confidence percentage. Pre-trained on massive multilingual corpora.</p>
        </div>
    </div>`;
}

// ============================================================
//   POPULARITY PREDICTOR
// ============================================================
function renderPredict(container) {
    container.innerHTML = `
    <div class="tool-page">
        <h1><i class="fas fa-chart-line accent-icon"></i> Popularity Predictor AI</h1>
        <p class="page-desc">Predict a movie's global popularity score using our RandomForest ML model</p>
        <div class="glass-card">
            <div class="card-header"><i class="fas fa-chart-line accent-icon"></i><h2>Popularity Predictor</h2></div>
            <p class="card-desc">RandomForest Regression \u00b7 Predicts TMDB Popularity Scale (0\u2013100)</p>
            <div class="form-grid">
                <div><label class="input-label"><i class="fas fa-dollar-sign"></i> Budget (Millions USD)</label><div class="icon-input"><i class="fas fa-dollar-sign"></i><input type="number" id="budget-input" value="100" min="0"></div></div>
                <div><label class="input-label"><i class="fas fa-clock"></i> Runtime (Minutes)</label><div class="icon-input"><i class="fas fa-clock"></i><input type="number" id="runtime-input" value="120" min="1"></div></div>
                <div><label class="input-label"><i class="fas fa-tags"></i> Number of Genres</label><div class="icon-input"><i class="fas fa-tags"></i><input type="number" id="genres-input" value="3" min="1" max="8"></div></div>
            </div>
            <div class="quick-tags" style="margin-top:1.2rem;">
                <span style="color:var(--text-muted);font-size:0.78rem;">Presets:</span>
                ${[['Indie','5,90,1'],['Mid-Budget','50,110,2'],['Blockbuster','200,145,3'],['Epic','300,180,4']].map(([l,v]) => {
                    const [b,r,g] = v.split(',');
                    return `<button class="quick-tag" onclick="document.getElementById('budget-input').value=${b};document.getElementById('runtime-input').value=${r};document.getElementById('genres-input').value=${g};predictPopularity()">${l}</button>`;
                }).join('')}
            </div>
            <button onclick="predictPopularity()" class="btn-primary" style="width:100%;justify-content:center;margin-top:1.5rem;padding:0.85rem;font-size:1rem;">
                <i class="fas fa-globe"></i> Predict Popularity Score
            </button>
            <div id="popularity-results" class="results-container"></div>
        </div>
        <div class="glass-card info-card">
            <h3><i class="fas fa-circle-info" style="color:var(--accent);"></i> How it works</h3>
            <p><strong>RandomForest Regression</strong> trained on production features \u2014 budget, runtime, genre count \u2014 to predict TMDB-style popularity. Score \u2265 80 = Blockbuster, \u2265 60 = Hit, \u2265 40 = Average, < 40 = Limited Release.</p>
        </div>
    </div>`;
}

// ============================================================
//   ABOUT
// ============================================================
function renderAbout(container) {
    const total = MOVIES_DB.length;
    const moviesCount = MOVIES_DB.filter(m=>m.type==='movie').length;
    const seriesCount = MOVIES_DB.filter(m=>m.type==='series').length;

    container.innerHTML = `
    <div class="tool-page" style="max-width:1000px;">
        <h1>About <span class="gradient-text">WatchWise</span></h1>
        <p class="page-desc">AI-Based Entertainment Analytics & Recommendation System \u2014 Problem Domain 4</p>
        <div class="stats-grid" style="margin-bottom:2rem;">
            <div class="stat-card"><div class="stat-label">Total Titles</div><div class="stat-val gradient-text">${total.toLocaleString()}</div></div>
            <div class="stat-card"><div class="stat-label">Movies</div><div class="stat-val">${moviesCount.toLocaleString()}</div></div>
            <div class="stat-card"><div class="stat-label">Web Series</div><div class="stat-val">${seriesCount.toLocaleString()}</div></div>
            <div class="stat-card"><div class="stat-label">AI Models</div><div class="stat-val">3</div></div>
        </div>
        <div class="about-grid">
            <div class="about-card"><div class="about-card-icon">\u{1F3AC}</div><h3>Movie Recommendations</h3><p>TF-IDF + Cosine Similarity content-based filtering. Finds the most similar titles using genre, plot, and language vectors.</p><ul class="tech-list"><li class="tech-badge">TF-IDF</li><li class="tech-badge">Cosine Similarity</li><li class="tech-badge">Scikit-Learn</li></ul></div>
            <div class="about-card"><div class="about-card-icon">\u{1F9E0}</div><h3>Sentiment Analysis</h3><p>HuggingFace BERT Transformer model. Truly multilingual \u2014 understands context in Hindi, Tamil, English, Korean, and more.</p><ul class="tech-list"><li class="tech-badge">BERT</li><li class="tech-badge">HuggingFace</li><li class="tech-badge">PyTorch</li></ul></div>
            <div class="about-card"><div class="about-card-icon">\u{1F4CA}</div><h3>Popularity Prediction</h3><p>RandomForest Regression trained on production features \u2014 budget, runtime, genre count \u2014 to predict popularity scores.</p><ul class="tech-list"><li class="tech-badge">RandomForest</li><li class="tech-badge">Scikit-Learn</li><li class="tech-badge">Pandas</li></ul></div>
            <div class="about-card"><div class="about-card-icon">\u{1F4FA}</div><h3>OTT Platform Data</h3><p>Streaming availability for Netflix, Prime Video, Disney+ Hotstar, JioCinema, HBO Max, ZEE5, SonyLIV, Apple TV+, and more.</p><ul class="tech-list"><li class="tech-badge">Netflix</li><li class="tech-badge">Prime Video</li><li class="tech-badge">HBO Max</li></ul></div>
            <div class="about-card"><div class="about-card-icon">\u26A1</div><h3>Backend API</h3><p>FastAPI with Uvicorn ASGI server. REST endpoints with CORS enabled. Model loading cached at startup.</p><ul class="tech-list"><li class="tech-badge">FastAPI</li><li class="tech-badge">Python 3.9+</li><li class="tech-badge">Uvicorn</li></ul></div>
            <div class="about-card"><div class="about-card-icon">\u{1F310}</div><h3>Frontend SPA</h3><p>6-page Single Page Application with hash-based routing. Sidebar dashboard layout with poster cards and detail modals.</p><ul class="tech-list"><li class="tech-badge">HTML5</li><li class="tech-badge">CSS3</li><li class="tech-badge">Vanilla JS</li></ul></div>
        </div>
    </div>`;
}

// ============================================================
//   MOVIE CARD HTML (compact, for fallback/recommendation)
// ============================================================
function movieCardHTML(movie) {
    const tc = TYPE_CONFIG[movie.type] || TYPE_CONFIG.movie;
    const platforms = (movie.platforms || []).slice(0,3);
    const badges = platforms.map(p => {
        const cfg = PLATFORMS[p.n] || { color:'#555', label: p.n };
        return `<span class="platform-badge" style="background:${cfg.color}18;color:${cfg.color};border-color:${cfg.color}33;">${cfg.label}</span>`;
    }).join('');

    return `<div class="movie-card" data-title="${movie.title}" style="cursor:pointer;">
        <div class="movie-card-header">
            <div style="display:flex;justify-content:space-between;gap:0.4rem;">
                <div class="movie-title">${movie.title}</div>
                <span style="font-size:0.68rem;background:${tc.bg};color:${tc.color};border:1px solid ${tc.border};padding:0.1rem 0.4rem;border-radius:4px;white-space:nowrap;">${tc.icon} ${tc.label}</span>
            </div>
            <div class="movie-genres">${movie.genres.split(' ').slice(0,3).join(' \u00b7 ')}</div>
        </div>
        <div class="movie-overview">${movie.overview}</div>
        <div class="movie-card-footer">
            <div class="platform-badges-row">${badges}</div>
            <div style="display:flex;gap:0.4rem;margin-top:0.5rem;">
                <button class="trailer-btn" data-title="${movie.title}" onclick="event.stopPropagation();">&#9654; Trailer</button>
                <button class="movie-recommend-btn" data-movie="${movie.title}" onclick="event.stopPropagation();">Similar \u2192</button>
            </div>
        </div>
    </div>`;
}

function addCardListeners(container) {
    container.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const dbMovie = MOVIES_DB.find(m => m.title === card.dataset.title);
            if (dbMovie) openMovieModal(getMovieWithMeta(dbMovie));
        });
    });
    container.querySelectorAll('.trailer-btn').forEach(btn => {
        btn.addEventListener('click', () => window.open(trailerURL(btn.dataset.title), '_blank'));
    });
    container.querySelectorAll('.movie-recommend-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            location.hash = '#discover';
            setTimeout(() => { const inp = document.getElementById('movie-search'); if (inp) { inp.value = btn.dataset.movie; getRecommendations(); } }, 300);
        });
    });
}

// ============================================================
//   MOVIE DETAIL MODAL
// ============================================================
function openMovieModal(movie) {
    document.getElementById('movie-modal')?.remove();
    const tc = TYPE_CONFIG[movie.type] || TYPE_CONFIG.movie;
    const platforms = movie.platforms || [];
    const watchBtns = platforms.map(p => {
        const cfg = PLATFORMS[p.n] || { color:'#555', label:p.n };
        const isFree = p.t === 'free';
        const url = PLATFORM_URL[p.n] ? PLATFORM_URL[p.n](movie.title) : '#';
        return `<a href="${url}" target="_blank" class="watch-btn" style="background:${cfg.color}18;border:1px solid ${cfg.color}44;color:${cfg.color};">
            <i class="fas fa-play"></i> Watch on ${cfg.label}
            ${isFree ? '<span class="free-tag">FREE</span>' : '<span style="margin-left:auto;font-size:0.65rem;opacity:0.6;">Subscription</span>'}
        </a>`;
    }).join('');

    const starsHTML = movie.rating !== '\u2014'
        ? Array.from({length:5}).map((_,i) => `<i class="fas fa-star" style="color:${i < Math.round(movie.rating/2) ? '#FBBF24':'#333'};"></i>`).join('')
        : '';
    const extra = movie.type !== 'movie' && movie.seasons ? `<span class="modal-badge" style="background:rgba(255,255,255,0.06);">${movie.seasons} Seasons \u00b7 ${movie.episodes} Episodes</span>` : '';
    const posterUrl = (typeof MOVIE_POSTERS !== 'undefined' && MOVIE_POSTERS[movie.title]) || null;
    const gradient = getPosterGradient(movie.genres);

    const modal = document.createElement('div');
    modal.id = 'movie-modal';
    modal.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
        <div class="modal-box">
            <button class="modal-close" id="modal-close"><i class="fas fa-xmark"></i></button>
            <div class="modal-poster-header" style="${posterUrl ? `background:url('${posterUrl}') center/cover;` : `background:${gradient};`}">
                ${!posterUrl ? `<div class="modal-poster-initial">${movie.title.charAt(0)}</div>` : ''}
                <div class="modal-poster-type" style="background:${tc.bg};color:${tc.color};border:1px solid ${tc.border};">${tc.icon} ${tc.label}</div>
            </div>
            <div class="modal-content">
                <h2 class="modal-title">${movie.title}</h2>
                <div class="modal-meta-row">
                    <span class="modal-badge" style="background:rgba(255,255,255,0.05);">${movie.year}</span>
                    ${movie.rating !== '\u2014' ? `<span class="modal-badge" style="background:rgba(251,191,36,0.08);color:#FBBF24;">${starsHTML} ${movie.rating}/10</span>` : ''}
                    <span class="modal-badge" style="background:rgba(255,255,255,0.05);">${movie.lang} \u00b7 ${movie.country}</span>
                    ${extra}
                </div>
                ${movie.director && movie.director !== 'Unknown' ? `<p style="color:var(--text-dim);font-size:0.82rem;margin:0.5rem 0;"><i class="fas fa-user-tie" style="color:var(--accent);"></i> Directed by <strong style="color:var(--text);">${movie.director}</strong></p>` : ''}
                <div class="modal-genres">${movie.genres.split(' ').map(g=>`<span class="genre-tag">${g}</span>`).join('')}</div>
                <p class="modal-overview">${movie.overview}</p>
                <div class="modal-section">
                    <h3><i class="fab fa-youtube" style="color:#E50914;"></i> Trailer</h3>
                    <a href="${movie.trailerURL}" target="_blank" class="trailer-big-btn"><i class="fab fa-youtube"></i> Watch on YouTube</a>
                </div>
                <div class="modal-section">
                    <h3><i class="fas fa-tv" style="color:var(--accent);"></i> Where to Watch</h3>
                    <div class="watch-btns-grid">${watchBtns || '<p style="color:var(--text-muted);font-size:0.85rem;">Platform info unavailable</p>'}</div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="event.stopPropagation();location.hash='#discover';document.getElementById('movie-modal').remove();setTimeout(()=>{let i=document.getElementById('movie-search');if(i){i.value='${movie.title.replace(/'/g,"\\'")}';getRecommendations();}},300);">
                        <i class="fas fa-wand-magic-sparkles"></i> Find Similar
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('modal-open'));
    const close = () => { modal.classList.remove('modal-open'); setTimeout(() => modal.remove(), 250); };
    document.getElementById('modal-close').addEventListener('click', close);
    document.getElementById('modal-overlay').addEventListener('click', e => { if (e.target.id === 'modal-overlay') close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key==='Escape') { close(); document.removeEventListener('keydown', esc); } });
}

// ============================================================
//   API: RECOMMENDATIONS (with genre search + offline fallback)
// ============================================================
const KNOWN_GENRES = ["action","thriller","drama","comedy","horror","sci-fi","romance","crime",
    "mystery","animation","biography","history","historical","sports","fantasy","documentary",
    "adventure","musical","family","war","western","superhero","psychological","suspense"];

async function getRecommendations() {
    const query = (document.getElementById("movie-search")?.value || "").trim();
    const resultsDiv = document.getElementById("recommendation-results");
    if (!resultsDiv) return;
    if (!query) { resultsDiv.innerHTML = errBox("Please enter a movie title or genre."); return; }
    resultsDiv.innerHTML = loadingHTML("Finding similar content...");

    const lowerQuery = query.trim().toLowerCase();
    const isGenreSearch = KNOWN_GENRES.includes(lowerQuery) &&
        !MOVIES_DB.some(m => m.title.toLowerCase() === lowerQuery);

    if (isGenreSearch) {
        const matched = MOVIES_DB
            .map(m => getMovieWithMeta(m))
            .filter(m => {
                const g = m.genres.toLowerCase().replace(/[,|/\-]/g, " ");
                return g.includes(lowerQuery) ||
                    g.split(" ").includes(lowerQuery) ||
                    (lowerQuery === "history" && g.includes("historical")) ||
                    (lowerQuery === "historical" && g.includes("historical")) ||
                    (lowerQuery === "sci-fi" && (g.includes("science fiction") || g.includes("sci fi") || g.includes("sci-fi")));
            })
            .sort((a, b) => (parseFloat(b.rating)||0) - (parseFloat(a.rating)||0))
            .slice(0, 20);

        if (!matched.length) { resultsDiv.innerHTML = errBox(`No titles found for "<strong>${query}</strong>".`); return; }

        resultsDiv.innerHTML = `<div class="info-pill"><i class="fas fa-tag" style="color:var(--accent);"></i> Top <strong>${matched.length}</strong> <em>${query}</em> titles \u2014 sorted by rating</div>` +
            matched.map((m, i) => recCardHTML(m, i)).join('');
        addRecListeners(resultsDiv);
        return;
    }

    // Backend TF-IDF search
    try {
        const res = await fetch(`${API_BASE}/recommend?movie_title=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.error || !data.recommendations?.length) {
            const fallback = MOVIES_DB.filter(m => {
                const t = m.title.toLowerCase(), q = lowerQuery;
                return t.includes(q) || q.includes(t);
            }).slice(0, 6).map(m => getMovieWithMeta(m));

            if (fallback.length) {
                resultsDiv.innerHTML = `<div class="info-pill">Showing results from local database</div>` +
                    fallback.map((m, i) => recCardHTML(m, i)).join('');
                addRecListeners(resultsDiv);
                return;
            }
            resultsDiv.innerHTML = errBox(`No match for "<strong>${query}</strong>". Try a genre: Action, Drama, Horror.`);
            return;
        }
        if (data.recommendations?.length) {
            const matchedInfo = data.matched ? `<div class="info-pill"><i class="fas fa-check-circle" style="color:var(--success);"></i> Matched: <strong>${data.matched}</strong></div>` : "";
            const cards = data.recommendations.map((title, i) => {
                const dbMovie = MOVIES_DB.find(m => m.title === title);
                if (!dbMovie) return `<div class="recommendation-card" style="animation-delay:${i*0.06}s"><div class="rec-card-left"><div class="rec-num">${i+1}</div></div><div class="rec-card-center"><div class="rec-title">${title}</div></div></div>`;
                return recCardHTML(getMovieWithMeta(dbMovie), i);
            }).join('');
            resultsDiv.innerHTML = matchedInfo + cards;
            addRecListeners(resultsDiv);
        }
    } catch (err) {
        console.warn("Backend offline, using local DB");
        const fallback = MOVIES_DB.filter(m => {
            const t = m.title.toLowerCase(), q = lowerQuery;
            return t.includes(q) || q.includes(t);
        }).slice(0, 6).map(m => getMovieWithMeta(m));

        if (fallback.length) {
            resultsDiv.innerHTML = `<div class="info-pill">\u26A1 Offline Mode: Local results</div>` +
                fallback.map((m, i) => recCardHTML(m, i)).join('');
            addRecListeners(resultsDiv);
        } else {
            resultsDiv.innerHTML = errBox("No results found (offline mode).");
        }
    }
}

function recCardHTML(m, i) {
    const tc = TYPE_CONFIG[m.type] || TYPE_CONFIG.movie;
    const badges = (m.platforms||[]).slice(0,2).map(p => {
        const cfg = PLATFORMS[p.n] || { color:"#555", label: p.n };
        return `<span class="platform-badge" style="background:${cfg.color}18;color:${cfg.color};border-color:${cfg.color}33;">${cfg.label}</span>`;
    }).join("");
    return `<div class="recommendation-card" data-title="${m.title}" style="animation-delay:${i*0.05}s">
        <div class="rec-card-left"><div class="rec-num">${i+1}</div></div>
        <div class="rec-card-center">
            <div style="display:flex;align-items:center;gap:0.4rem;">
                <div class="rec-title">${m.title}</div>
                <span style="font-size:0.62rem;background:${tc.bg};color:${tc.color};border:1px solid ${tc.border};padding:0.08rem 0.35rem;border-radius:3px;">${tc.icon}</span>
            </div>
            <div style="font-size:0.73rem;color:var(--text-muted);">${m.genres.split(" ").slice(0,3).join(" \u00b7 ")} \u00b7 ${m.year}</div>
            <div class="platform-badges-row" style="margin-top:0.35rem;">${badges}</div>
        </div>
        <div class="rec-card-right">
            ${m.rating !== "\u2014" ? `<span style="color:var(--gold);font-size:0.78rem;"><i class="fas fa-star"></i> ${m.rating}</span>` : ""}
            <a href="${m.trailerURL}" target="_blank" class="trailer-btn" onclick="event.stopPropagation();">&#9654; Trailer</a>
        </div>
    </div>`;
}

function addRecListeners(container) {
    container.querySelectorAll('.recommendation-card').forEach(card => {
        card.addEventListener('click', () => {
            const dbMovie = MOVIES_DB.find(m => m.title === card.dataset.title);
            if (dbMovie) openMovieModal(getMovieWithMeta(dbMovie));
        });
    });
}

// ============================================================
//   API: SENTIMENT
// ============================================================
async function analyzeSentiment() {
    const text = document.getElementById("review-text")?.value;
    const resultsDiv = document.getElementById("sentiment-results");
    if (!resultsDiv) return;
    if (!text) { resultsDiv.innerHTML = errBox('Please write a review.'); return; }
    resultsDiv.innerHTML = loadingHTML('BERT model analyzing...');
    try {
        const res = await fetch(`${API_BASE}/sentiment`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({text}) });
        const data = await res.json();
        if (data.error) { resultsDiv.innerHTML = errBox(data.error); return; }
        const pos = data.sentiment === 'Positive';
        const starsHTML = Array.from({length:5}).map((_,i) => `<span style="color:${i<data.stars?'#FBBF24':'#444'};font-size:1.3rem;">\u2605</span>`).join('');
        const pct = Math.round(data.deep_learning_score * 100);
        resultsDiv.innerHTML = `<div class="sentiment-box ${pos?'positive':'negative'}">
            <h3 style="color:${pos?'var(--success)':'var(--danger)'};margin-bottom:0.5rem;"><i class="fas ${pos?'fa-smile-beam':'fa-frown-open'}"></i> ${data.sentiment} Review</h3>
            <div class="stars-row">${starsHTML}</div>
            <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
            <p style="color:var(--text-dim);font-size:0.85rem;"><i class="fas fa-robot"></i> Confidence: <strong>${pct}%</strong> \u00b7 <i class="fas fa-star"></i> ${data.stars}/5 Stars</p>
        </div>`;
    } catch { resultsDiv.innerHTML = errBox('Backend offline. Start: python start.py'); }
}

// ============================================================
//   API: POPULARITY
// ============================================================
async function predictPopularity() {
    const budget_m = parseFloat(document.getElementById("budget-input")?.value);
    const runtime = parseInt(document.getElementById("runtime-input")?.value);
    const num_genres = parseInt(document.getElementById("genres-input")?.value);
    const resultsDiv = document.getElementById("popularity-results");
    if (!resultsDiv) return;
    if (isNaN(budget_m)||isNaN(runtime)||isNaN(num_genres)) { resultsDiv.innerHTML = errBox('Enter valid numbers.'); return; }
    resultsDiv.innerHTML = loadingHTML('Running ML model...');
    try {
        const res = await fetch(`${API_BASE}/predict`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({budget_m, runtime, num_genres}) });
        const data = await res.json();
        if (data.error) { resultsDiv.innerHTML = errBox(data.error); return; }
        const score = data.popularity;
        const tier = score>=80?{label:'\u{1F3C6} Blockbuster',color:'var(--success)'}:score>=60?{label:'\u2B50 Hit',color:'var(--gold)'}:score>=40?{label:'\u{1F4FD} Average',color:'var(--accent2)'}:{label:'\u{1F3AC} Limited',color:'var(--text-muted)'};
        resultsDiv.innerHTML = `<div class="popularity-box">
            <p style="text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);font-size:0.78rem;">Predicted Popularity</p>
            <div class="pop-score">${score}</div>
            <div class="progress-bar-wrap"><div class="progress-bar-fill" id="pop-bar" style="width:0%"></div></div>
            <p style="margin-top:0.4rem;"><span style="background:${tier.color}18;color:${tier.color};border:1px solid ${tier.color}33;padding:0.2rem 0.7rem;border-radius:4px;font-size:0.82rem;">${tier.label}</span></p>
        </div>`;
        requestAnimationFrame(() => { document.getElementById('pop-bar').style.width = Math.min(score,100)+'%'; });
    } catch { resultsDiv.innerHTML = errBox('Backend offline. Start: python start.py'); }
}

// ============================================================
//   UTILITIES
// ============================================================
function loadingHTML(msg) { return `<div class="loading-spin"><i class="fas fa-spinner fa-spin fa-2x"></i><p>${msg}</p></div>`; }
function errBox(msg) { return `<div class="sentiment-box negative" style="border-left-color:var(--danger);"><i class="fas fa-circle-exclamation"></i> ${msg}</div>`; }