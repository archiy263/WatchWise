// ============================================================
//  Music AI - Apple Music-like Experience
// ============================================================

// Global API Base
// API_BASE is already defined in script.js
window.API_BASE = window.API_BASE || "http://127.0.0.1:8000";

// YouTube API Key is now read from .env via backend proxy at /music/youtube-video

// ============================================================
//  MOOD DETECTOR WITH Q&A SYSTEM
// ============================================================

var MOOD_QUESTIONS = [
    {
        id: 1,
        question: "Pick the scene that matches your vibe:",
        options: [
            { text: "Dancing at a rooftop sunset", mood: "happy", score: 10 },
            { text: "Curled up with a warm drink", mood: "chill", score: 10 },
            { text: "Staring out the rain-streaked window", mood: "sad", score: 10 },
            { text: "Running through the city streets", mood: "energetic", score: 10 },
            { text: "Walking hand-in-hand under the stars", mood: "romantic", score: 10 },
            { text: "Jumping into a crowd at a concert", mood: "party", score: 10 }
        ]
    },
    {
        id: 2,
        question: "What colour matches your mood?",
        options: [
            { text: "🟡 Bright Yellow — sunshine energy", mood: "happy", score: 8 },
            { text: "🔵 Soft Blue — calm and peaceful", mood: "chill", score: 8 },
            { text: "⚫ Deep Grey — heavy thoughts", mood: "sad", score: 8 },
            { text: "🔴 Fiery Red — unstoppable drive", mood: "energetic", score: 8 },
            { text: "🩷 Pastel Pink — butterflies inside", mood: "romantic", score: 8 },
            { text: "🟣 Neon Purple — let's go crazy", mood: "party", score: 8 }
        ]
    },
    {
        id: 3,
        question: "If your life was a movie right now, what genre?",
        options: [
            { text: "Feel-good comedy", mood: "happy", score: 9 },
            { text: "Slow-burn indie drama", mood: "chill", score: 9 },
            { text: "Emotional tearjerker", mood: "sad", score: 9 },
            { text: "High-octane action", mood: "energetic", score: 9 },
            { text: "Classic romance", mood: "romantic", score: 9 },
            { text: "Wild thriller", mood: "party", score: 9 }
        ]
    },
    {
        id: 4,
        question: "What do you need the music to do for you?",
        options: [
            { text: "Make me smile", mood: "happy", score: 7 },
            { text: "Help me drift away", mood: "chill", score: 7 },
            { text: "Let me feel everything", mood: "sad", score: 7 },
            { text: "Push me harder", mood: "energetic", score: 7 },
            { text: "Set the mood for love", mood: "romantic", score: 7 },
            { text: "Get the party started", mood: "party", score: 7 }
        ]
    }
];

// Language preference for mood section: 'mix' | 'hindi' | 'english'
var moodLanguagePref = 'mix';

var moodDetectionState = {
    currentQuestion: 0,
    answers: [],
    detectedMood: null,
    confidence: 0
};

window.startMoodDetection = function() {
    moodDetectionState = {
        currentQuestion: 0,
        answers: [],
        detectedMood: null,
        confidence: 0
    };
    window.renderMoodQuestion(0);
};

window.renderMoodQuestion = function(questionIndex) {
    var container = document.getElementById('mood-results');
    if (!container) return;

    if (questionIndex >= MOOD_QUESTIONS.length) {
        window.calculateMoodAndShowResults();
        return;
    }

    var q = MOOD_QUESTIONS[questionIndex];
    var optionsHtml = q.options.map(function(opt, i) {
        return '<button class="mood-option" onclick="window.answerMoodQuestion(' + questionIndex + ', \'' + opt.mood + '\', ' + opt.score + ')">' +
            '<span class="mood-option-icon">' + window.getMoodEmoji(opt.mood) + '</span>' +
            '<span class="mood-option-text">' + opt.text + '</span>' +
        '</button>';
    }).join('');

    var progressHtml = MOOD_QUESTIONS.map(function(_, i) {
        return '<div class="mood-progress-step ' + (i <= questionIndex ? 'active' : '') + '"></div>';
    }).join('');

    container.innerHTML = '<div class="mood-question-container">' +
        '<div class="mood-progress">' + progressHtml + '</div>' +
        '<h3 class="mood-question">' + q.question + '</h3>' +
        '<div class="mood-options">' + optionsHtml + '</div>' +
    '</div>';
};

window.getMoodEmoji = function(mood) {
    var emojis = { happy: '☀️', sad: '🌧️', energetic: '⚡', chill: '🌙', romantic: '💕', party: '🎉' };
    return emojis[mood] || '🎵';
};

window.answerMoodQuestion = function(questionIndex, mood, score) {
    moodDetectionState.answers.push({ mood: mood, score: score });
    
    if (questionIndex < MOOD_QUESTIONS.length - 1) {
        window.renderMoodQuestion(questionIndex + 1);
    } else {
        window.calculateMoodAndShowResults();
    }
};

window.calculateMoodAndShowResults = function() {
    var moodScores = {};
    moodDetectionState.answers.forEach(function(ans) {
        moodScores[ans.mood] = (moodScores[ans.mood] || 0) + ans.score;
    });

    var maxScore = 0;
    var dominantMood = 'happy';
    Object.keys(moodScores).forEach(function(mood) {
        if (moodScores[mood] > maxScore) {
            maxScore = moodScores[mood];
            dominantMood = mood;
        }
    });

    var totalScore = Object.values(moodScores).reduce(function(a, b) { return a + b; }, 0);
    moodDetectionState.confidence = Math.round((maxScore / totalScore) * 100);
    moodDetectionState.detectedMood = dominantMood;

    window.fetchSongsByMood(dominantMood);
};

window.fetchSongsByMood = function(mood) {
    var resultsDiv = document.getElementById('mood-results');
    if (!resultsDiv) return;

    // Show mood result + language toggle
    resultsDiv.innerHTML = '<div class="mood-result-header">' +
        '<div class="mood-badge-large">' +
            '<span class="mood-emoji-large">' + window.getMoodEmoji(mood) + '</span>' +
            '<span class="mood-name">' + mood.charAt(0).toUpperCase() + mood.slice(1) + '</span>' +
            '<span class="mood-confidence">' + moodDetectionState.confidence + '% match</span>' +
        '</div>' +
        '<button class="btn-restart" onclick="window.startMoodDetection()">' +
            '<i class="fas fa-redo"></i> Start Over' +
        '</button>' +
    '</div>' +
    '<div class="mood-lang-toggle" style="display:flex; justify-content:center; gap:10px; margin:15px 0;">' +
        '<button class="mood-lang-btn' + (moodLanguagePref === 'mix' ? ' active' : '') + '" onclick="moodLanguagePref=\'mix\'; window.fetchMoodSongsWithLang(\'' + mood + '\')" style="padding:6px 18px; border-radius:20px; border:1px solid var(--accent); background:' + (moodLanguagePref === 'mix' ? 'var(--accent)' : 'transparent') + '; color:white; cursor:pointer; font-weight:600;">🔀 Mix</button>' +
        '<button class="mood-lang-btn' + (moodLanguagePref === 'hindi' ? ' active' : '') + '" onclick="moodLanguagePref=\'hindi\'; window.fetchMoodSongsWithLang(\'' + mood + '\')" style="padding:6px 18px; border-radius:20px; border:1px solid var(--accent); background:' + (moodLanguagePref === 'hindi' ? 'var(--accent)' : 'transparent') + '; color:white; cursor:pointer; font-weight:600;">🇮🇳 Hindi</button>' +
        '<button class="mood-lang-btn' + (moodLanguagePref === 'english' ? ' active' : '') + '" onclick="moodLanguagePref=\'english\'; window.fetchMoodSongsWithLang(\'' + mood + '\')" style="padding:6px 18px; border-radius:20px; border:1px solid var(--accent); background:' + (moodLanguagePref === 'english' ? 'var(--accent)' : 'transparent') + '; color:white; cursor:pointer; font-weight:600;">🌎 English</button>' +
    '</div>' +
    '<div class="mood-loading">' +
        '<i class="fas fa-compass fa-spin"></i>' +
        '<span>Finding perfect songs for your mood...</span>' +
    '</div>';

    window.fetchMoodSongsWithLang(mood);
};

window.fetchMoodSongsWithLang = function(mood) {
    // Better, artist-specific search terms that won't return songs named after the mood
    var moodTerms = {
        happy:     { hindi: 'Arijit Singh Atif Aslam upbeat', english: 'Pharrell Dua Lipa upbeat pop' },
        sad:       { hindi: 'Arijit Singh heartbreak sad bollywood', english: 'Adele Lewis Capaldi heartbreak ballad' },
        energetic: { hindi: 'Badshah Honey Singh desi bass', english: 'Eminem Imagine Dragons rock energy' },
        chill:     { hindi: 'Prateek Kuhad indie chill', english: 'Billie Eilish Lana Del Rey chill' },
        romantic:  { hindi: 'Arijit Singh romantic love bollywood', english: 'Ed Sheeran John Legend love song' },
        party:    { hindi: 'Yo Yo Honey Singh Badshah party', english: 'Doja Cat Dua Lipa dance club' }
    };

    var terms = moodTerms[mood] || { hindi: 'bollywood hits', english: 'pop hits' };

    var fetchHindi = function() {
        return fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(terms.hindi) + '&entity=song&country=IN&limit=10')
            .then(function(r) { return r.json(); });
    };
    var fetchEnglish = function() {
        return fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(terms.english) + '&entity=song&country=US&limit=10')
            .then(function(r) { return r.json(); });
    };

    var mapTrack = function(track) {
        return {
            title: track.trackName,
            artist: track.artistName,
            genre: track.primaryGenreName,
            albumArt: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : '',
            previewUrl: track.previewUrl
        };
    };

    // Filter out songs whose title is just the mood word itself
    var filterMoodName = function(songs) {
        var moodLower = mood.toLowerCase();
        return songs.filter(function(s) {
            return s.title.toLowerCase() !== moodLower;
        });
    };

    var promises = [];
    if (moodLanguagePref === 'hindi') {
        promises = [fetchHindi()];
    } else if (moodLanguagePref === 'english') {
        promises = [fetchEnglish()];
    } else {
        promises = [fetchHindi(), fetchEnglish()];
    }

    Promise.all(promises).then(function(results) {
        var allSongs = [];

        if (moodLanguagePref === 'mix' && results.length === 2) {
            var hindiSongs = (results[0].results || []).map(mapTrack);
            var englishSongs = filterMoodName((results[1].results || []).map(mapTrack));
            var maxLen = Math.max(hindiSongs.length, englishSongs.length);
            for (var i = 0; i < maxLen; i++) {
                if (hindiSongs[i]) allSongs.push(hindiSongs[i]);
                if (englishSongs[i]) allSongs.push(englishSongs[i]);
            }
        } else {
            var rawSongs = (results[0].results || []).map(mapTrack);
            allSongs = (moodLanguagePref === 'english') ? filterMoodName(rawSongs) : rawSongs;
        }

        if (allSongs.length > 0) {
            window.renderPlayzone(allSongs, mood, "", "mood-results");
        } else {
            var fallback = (typeof MUSIC_DB !== 'undefined') ? MUSIC_DB.slice(0, 12) : [];
            window.renderPlayzone(fallback, mood, "", "mood-results");
        }
    }).catch(function(e) {
        var fallback = (typeof MUSIC_DB !== 'undefined') ? MUSIC_DB.slice(0, 12) : [];
        window.renderPlayzone(fallback, mood, "", "mood-results");
    });
};

// ============================================================
//  MUSIC SEARCH - EXACT MATCH
// ============================================================

window.searchSongs = function(query) {
    var resultsDiv = document.getElementById('music-results');
    if (!resultsDiv || !query.trim()) {
        if (resultsDiv) resultsDiv.innerHTML = window.errBox('Enter a song name to search');
        return;
    }

    resultsDiv.innerHTML = window.loadingHTML('Searching global database...');

    var apiUrl = 'https://itunes.apple.com/search?term=' + encodeURIComponent(query) + '&entity=song&country=IN&limit=25';
    
    fetch(apiUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.results && data.results.length > 0) {
                var songs = data.results.map(function(track) {
                    return {
                        title: track.trackName,
                        artist: track.artistName,
                        genre: track.primaryGenreName,
                        albumArt: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : '',
                        previewUrl: track.previewUrl
                    };
                });
                window.renderPlayzone(songs, 'search', "<h3 class='section-title'>Search Results for '" + query + "'</h3>", 'music-results');
            } else {
                resultsDiv.innerHTML = window.errBox('No songs found for "' + query + '"');
            }
        })
        .catch(function(e) {
            resultsDiv.innerHTML = window.errBox('Failed to search songs. Please try again.');
        });
};

// ============================================================
//  MUSIC PLAYER / PLAYZONE
// ============================================================

var currentPlaylist = [];
var currentSongIndex = 0;
var currentHlsInstance = null;
var isPlaying = false;
var globalAudio = new Audio();
var useYouTubePlayer = false;
var currentPlayzoneContext = 'music-results';

if (!document.getElementById('yt-bg-player')) {
    var ytFrame = document.createElement('iframe');
    ytFrame.id = 'yt-bg-player';
    ytFrame.style.display = 'none';
    ytFrame.allow = 'autoplay';
    document.body.appendChild(ytFrame);
}

globalAudio.addEventListener('timeupdate', function() {
    var currentEl = document.getElementById('time-current');
    var totalEl = document.getElementById('time-total');
    var barEl = document.getElementById('progress-bar');
    if (!currentEl || !totalEl || !barEl || !globalAudio.duration) return;
    
    var curM = Math.floor(globalAudio.currentTime / 60);
    var curS = Math.floor(globalAudio.currentTime % 60).toString().padStart(2, '0');
    currentEl.textContent = curM + ':' + curS;
    
    var durM = Math.floor(globalAudio.duration / 60);
    var durS = Math.floor(globalAudio.duration % 60).toString().padStart(2, '0');
    totalEl.textContent = durM + ':' + durS;
    
    barEl.style.width = (globalAudio.currentTime / globalAudio.duration * 100) + '%';
});

var moodLoopCount = 0;
var moodPlayTimer = null;
globalAudio.addEventListener('ended', function() {
    if (currentPlayzoneContext === 'mood-results') {
        // If we are using the 30s preview fallback
        if (globalAudio.src && globalAudio.src.includes('apple.com')) {
            moodLoopCount++;
            if (moodLoopCount < 3) {
                globalAudio.play();
                return;
            }
        }
    }
    moodLoopCount = 0;
    if (moodPlayTimer) { clearTimeout(moodPlayTimer); moodPlayTimer = null; }
    window.playNext();
});

window.seekAudio = function(e) {
    if (useYouTubePlayer) return;
    if (!globalAudio.duration) return;
    var rect = e.currentTarget.getBoundingClientRect();
    var pos = (e.clientX - rect.left) / rect.width;
    globalAudio.currentTime = pos * globalAudio.duration;
};

window.renderPlayzone = function(songs, category, titleHtml, targetContainerId) {
    var container = document.getElementById(targetContainerId);
    if (!container) {
        container = document.getElementById('mood-results') || document.getElementById('music-results');
    }
    
    if (!songs || !songs.length) {
        if (container) container.innerHTML = (titleHtml || '') + window.errBox('No songs found');
        return;
    }

    currentPlaylist = songs;
    currentPlayzoneContext = targetContainerId || (container.id || 'music-results');
    
    if (!container) return;
    
    if (targetContainerId === 'music-results' && document.getElementById('mood-results')) {
        document.getElementById('mood-results').innerHTML = '';
    } else if (targetContainerId === 'mood-results' && document.getElementById('music-results')) {
        document.getElementById('music-results').innerHTML = '';
    }

    var songsHtml = songs.map(function(song, i) {
        return window.renderSongCard(song, i);
    }).join('');

    container.innerHTML = (titleHtml || '') + '<div class="playzone-container">' +
        '<div class="now-playing-bar" id="now-playing-bar" style="display: none;">' +
            '<div class="now-playing-info">' +
                '<img class="now-playing-art" id="now-playing-art" src="" alt="">' +
                '<div class="now-playing-details">' +
                    '<div class="now-playing-title" id="now-playing-title">-</div>' +
                    '<div class="now-playing-artist" id="now-playing-artist">-</div>' +
                '</div>' +
            '</div>' +
            '<div class="now-playing-controls">' +
                '<button class="np-btn" onclick="window.playPrevious()"><i class="fas backward"></i></button>' +
                '<button class="np-btn-play" id="np-play-btn" onclick="window.togglePlayPause()"><i class="fas fa-play"></i></button>' +
                '<button class="np-btn" onclick="window.playNext()"><i class="fas fa-forward"></i></button>' +
            '</div>' +
            '<div class="now-playing-progress">' +
                '<span class="time-current" id="time-current">0:00</span>' +
                '<div class="progress-bar-container" onclick="window.seekAudio(event)"><div class="progress-bar" id="progress-bar"></div></div>' +
                '<span class="time-total" id="time-total">0:00</span>' +
            '</div>' +
            '<button class="np-btn-close" onclick="window.closePlayer()"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="playzone-songs">' + songsHtml + '</div>' +
    '</div>';
};

window.renderSongCard = function(song, index) {
    var albumArt = song.album_art || song.albumArt || 
        'https://ui-avatars.com/api/?name=' + encodeURIComponent(song.title) + '&background=1DB954&color=fff&size=300';
    
    var imgId = 'song-art-' + index + '-' + Math.floor(Math.random()*10000);
    
    if (!song.previewUrl && !song.albumArt) {
        setTimeout(function() {
            var q = encodeURIComponent(song.title + ' ' + (song.artist || ''));
            fetch('https://itunes.apple.com/search?term=' + q + '&entity=song&limit=1')
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.results && data.results.length > 0) {
                        var track = data.results[0];
                        var art = track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : null;
                        if (art) {
                            var imgEl = document.getElementById(imgId);
                            if (imgEl) imgEl.src = art;
                            song.albumArt = art;
                        }
                        song.previewUrl = track.previewUrl;
                    }
                }).catch(function(e) {});
        }, 30 * index);
    }
    
    return '<div class="song-card" onclick="window.playSong(' + index + ')">' +
        '<div class="song-card-art">' +
            '<img id="' + imgId + '" src="' + albumArt + '" alt="' + song.title + '" loading="lazy">' +
            '<div class="song-card-overlay">' +
                '<button class="play-btn-circle"><i class="fas fa-play"></i></button>' +
            '</div>' +
        '</div>' +
        '<div class="song-card-info">' +
            '<div class="song-card-title">' + song.title + '</div>' +
            '<div class="song-card-artist">' + (song.artist || song.Artist || 'Unknown Artist') + '</div>' +
            '<div class="song-card-meta">' + (song.genre || song.Genre || '') + '</div>' +
        '</div>' +
    '</div>';
};

// ============================================================
//  ZERO-FAILURE SMART PLAYBACK SYSTEM
// ============================================================
// WHY:  YouTube embeds frequently fail ("Video unavailable") because
//       VEVO/official channels disable iframe embedding.
// WHAT: Uses /music/playback-source to get multiple ranked video IDs,
//       tries each in sequence, falls back to JioSaavn audio, then
//       to musicapi.x007, and finally opens YouTube search.
// WHEN: Triggered whenever user clicks a song in search results modal.

// -- State for the current smart-play session --
var _smartPlayState = { videoIds: [], backupIds: [], fallbackAudio: null, index: 0, query: '', song: null };

window.showYouTubeVideoModal = function(song) {
    globalAudio.pause();
    _smartPlayState.song = song;

    var modalId = 'yt-video-modal-ui';
    var modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
        document.body.appendChild(modal);
    }

    var baseQuery = song.title + ' ' + (song.artist || '');
    var ytSearchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(baseQuery);
    var wunkQuery = encodeURIComponent(baseQuery);

    // ── Build modal HTML shell ──────────────────────────────────
    modal.innerHTML = '<div style="width:90%;max-width:900px;position:relative;background:#121212;border-radius:12px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,0.8);">' +
        '<button onclick="document.getElementById(\'' + modalId + '\').style.display=\'none\'; var f=document.getElementById(\'yt-video-iframe-ui\'); if(f) f.src=\'\'; var a=document.getElementById(\'modal-audio-player\'); if(a) a.pause(); globalAudio.pause();" style="position:absolute;top:10px;right:20px;background:none;border:none;color:var(--text-dim);font-size:36px;cursor:pointer;z-index:10;" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'var(--text-dim)\'">&times;</button>' +
        '<h2 style="color:var(--text);text-align:center;margin-bottom:5px;font-weight:700;text-transform:uppercase;font-size:1.5rem;letter-spacing:1px;">"' + song.title.toUpperCase() + '"</h2>' +
        '<div id="modal-source-indicator" style="text-align:center; color:var(--accent); font-size:0.85rem; margin-bottom: 15px; font-weight: 600;"></div>' +
        '<div style="display:flex;justify-content:center;gap:15px;margin-bottom:20px;">' +
            '<button id="modal-btn-video" onclick="window.playVideoSong()" style="background:var(--accent);border:none;padding:8px 20px;color:white;border-radius:20px;cursor:pointer;font-weight:bold;transition:0.3s;"><i class="fas fa-video"></i> Video Song</button>' +
            '<button id="modal-btn-audio" onclick="window.playNormalMusicFallback()" style="background:#333;border:none;padding:8px 20px;color:white;border-radius:20px;cursor:pointer;font-weight:bold;transition:0.3s;"><i class="fas fa-music"></i> Normal Music</button>' +
        '</div>' +
        '<div id="modal-video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000;margin-bottom:15px;">' +
            '<div id="yt-loading-msg" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;"></i><p>🎵 Finding best available version...</p></div>' +
            '<iframe id="yt-video-iframe-ui" src="" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>' +
        '</div>' +
        '<div id="modal-video-controls" style="text-align:center; margin-bottom: 20px;">' +
            '<button onclick="if(window._tryNextVideo) window._tryNextVideo()" style="background:#444; border:none; padding:8px 20px; color:white; border-radius:20px; cursor:pointer; font-weight:bold; transition:0.3s;" onmouseover="this.style.background=\'var(--accent)\'" onmouseout="this.style.background=\'#444\'"><i class="fas fa-step-forward"></i> Video Unavailable? Try Next</button>' +
            '<div id="modal-video-options" style="display:flex; overflow-x:auto; gap:10px; margin-top:5px; padding-bottom:8px; justify-content:flex-start;"></div>' +
        '</div>' +
        '<div id="modal-audio-container" style="display:none;width:100%;min-height:300px;padding:20px;box-sizing:border-box;border-radius:8px;background:#000;margin-bottom:15px;"></div>' +
        '<div style="text-align:center;">' +
            '<p style="color:var(--text-dim);font-size:0.85rem;margin-bottom:10px;">Switch between Video Song and Normal Music above</p>' +
            '<a href="' + ytSearchUrl + '" target="_blank" class="btn-primary" style="text-decoration:none;padding:10px 20px;display:inline-block;border-radius:20px;"><i class="fab fa-youtube"></i> Open on YouTube</a>' +
        '</div>' +
    '</div>';

    modal.style.display = 'flex';

    // ── Normal Music Fallback (multi-layer audio) ───────────────
    // WHY: When user clicks "Normal Music" or all video embeds fail.
    // WHAT: Tries JioSaavn (from backend data) → musicapi.x007 → error.
    window.playNormalMusicFallback = function() {
        var aContainer = document.getElementById('modal-audio-container');
        var vContainer = document.getElementById('modal-video-container');
        var vControls = document.getElementById('modal-video-controls');
        var iframe = document.getElementById('yt-video-iframe-ui');
        var btnV = document.getElementById('modal-btn-video');
        var btnA = document.getElementById('modal-btn-audio');
        
        if (btnA) { btnA.style.background = 'var(--accent)'; btnA.style.opacity = '1'; }
        if (btnV) { btnV.style.background = '#333'; btnV.style.opacity = '0.7'; }
        
        if (iframe) iframe.src = '';
        if (vContainer) vContainer.style.display = 'none';
        if (vControls) vControls.style.display = 'none';
        if (aContainer) aContainer.style.display = 'block';
        aContainer.innerHTML = '<p style="color:white;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Fetching High-Quality Audio...</p>';

        var art = song.albumArt || song.album_art || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(song.title) + '&background=1DB954&color=fff&size=300';

        // WHY: _smartPlayState.fallbackAudio is pre-fetched by the backend
        // WHEN: Always populated when USE_DEV_FALLBACK=true in .env
        if (_smartPlayState.fallbackAudio) {
            _renderAudioPlayer(aContainer, _smartPlayState.fallbackAudio, art, 'JioSaavn API (HQ)');
            return;
        }

        // Layer 2: Try JioSaavn directly from frontend
        fetch('https://saavn.dev/api/search/songs?query=' + wunkQuery)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.data && data.data.results && data.data.results[0]) {
                    var dl = data.data.results[0].downloadUrl || [];
                    var url = '';
                    for (var i = 0; i < dl.length; i++) {
                        if (dl[i].quality === '320kbps' || dl[i].quality === '160kbps') { url = dl[i].link; break; }
                    }
                    if (!url && dl.length) url = dl[dl.length - 1].link;
                    if (url) { _renderAudioPlayer(aContainer, url, art, 'JioSaavn Direct'); return; }
                }
                throw new Error('JioSaavn empty');
            })
            .catch(function() {
                // Layer 3: Try musicapi.x007
                fetch('https://musicapi.x007.workers.dev/search?q=' + wunkQuery + '&searchEngine=wunk')
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.response && data.response[0]) {
                            return fetch('https://musicapi.x007.workers.dev/fetch?id=' + data.response[0].id);
                        }
                        throw new Error('x007 empty');
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.response) { _renderAudioPlayer(aContainer, data.response, art, 'musicapi.x007'); return; }
                        throw new Error('x007 no stream');
                    })
                    .catch(function() {
                        // Layer 4: Use iTunes preview as last resort
                        if (song.previewUrl) {
                            _renderAudioPlayer(aContainer, song.previewUrl, art, 'iTunes 30s Preview');
                        } else {
                            aContainer.innerHTML = '<div style="text-align:center;color:white;padding:40px;">' +
                                '<p style="font-size:1.2rem;">⚡ Opening best available source...</p>' +
                                '<a href="' + ytSearchUrl + '" target="_blank" style="color:var(--accent);font-size:1.1rem;">▶ Play on YouTube</a></div>';
                        }
                    });
            });
    };

    // ── Video Song toggle ───────────────────────────────────────
    window.playVideoSong = function() {
        var aContainer = document.getElementById('modal-audio-container');
        var vContainer = document.getElementById('modal-video-container');
        var vControls = document.getElementById('modal-video-controls');
        var audioEl = document.getElementById('modal-audio-player');
        var btnV = document.getElementById('modal-btn-video');
        var btnA = document.getElementById('modal-btn-audio');
        
        if (btnV) { btnV.style.background = 'var(--accent)'; btnV.style.opacity = '1'; }
        if (btnA) { btnA.style.background = '#333'; btnA.style.opacity = '0.7'; }
        
        if (audioEl) audioEl.pause();
        globalAudio.pause();
        if (aContainer) aContainer.style.display = 'none';
        if (vContainer) vContainer.style.display = 'block';
        if (vControls) vControls.style.display = 'block';
        var iframe = document.getElementById('yt-video-iframe-ui');
        var notFound = document.getElementById('modal-video-not-found');
        if (notFound) notFound.style.display = 'none';

        if (_smartPlayState.videoIds.length > 0 || _smartPlayState.backupIds.length > 0) {
            if (iframe) iframe.style.display = 'block';
            if (iframe && (!iframe.src || iframe.src === '' || iframe.src === window.location.href)) {
                _smartPlayState.index = 0;
                window._tryNextVideo();
            }
        } else {
            if (iframe) iframe.style.display = 'none';
            if (vControls) vControls.style.display = 'none';
            if (!notFound) {
                notFound = document.createElement('div');
                notFound.id = 'modal-video-not-found';
                notFound.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;text-align:center;width:100%;';
                vContainer.appendChild(notFound);
            }
            notFound.style.display = 'block';
            notFound.innerHTML = '<i class="fas fa-exclamation-circle" style="font-size:2rem;color:var(--accent);margin-bottom:10px;"></i><p>No playable videos found for this song.</p><a href="' + ytSearchUrl + '" target="_blank" style="color:var(--accent);text-decoration:underline;">Search Manually on YouTube</a>';
        }
    };

    // ── Fetch smart playback sources from backend ───────────────
    // WHY: /music/playback-source returns ranked YouTube IDs + audio fallback
    var pbQuery = encodeURIComponent(song.title);
    var pbArtist = encodeURIComponent(song.artist || '');
    fetch(window.API_BASE + '/music/playback-source?q=' + pbQuery + '&artist=' + pbArtist)
        .then(function(r) { return r.json(); })
        .then(function(data) {
            _smartPlayState.videoIds = data.youtube_ids || [];
            _smartPlayState.backupIds = data.backup_video_ids || [];
            _smartPlayState.fallbackAudio = data.fallback_audio || null;
            _smartPlayState.index = 0;

            var loadingMsg = document.getElementById('yt-loading-msg');
            if (loadingMsg) loadingMsg.style.display = 'none';

            if (_smartPlayState.videoIds.length > 0 || _smartPlayState.backupIds.length > 0) {
                window._renderVideoOptions();
                window._tryNextVideo();
            } else {
                // Frontend fallback if Official YouTube API limits are reached
                var fallbackQuery = encodeURIComponent(song.title + ' ' + (song.artist || '') + ' official video');
                fetch('https://musicapi.x007.workers.dev/search?q=' + fallbackQuery + '&searchEngine=seev')
                    .then(function(res) { return res.json(); })
                    .then(function(yd) {
                        if (yd.response && yd.response.length > 0) {
                            for(var i=0; i<Math.min(5, yd.response.length); i++) {
                                var vid = yd.response[i].videoId || yd.response[i].id;
                                if(vid) _smartPlayState.backupIds.push(vid);
                            }
                        }
                        if (_smartPlayState.backupIds.length > 0) {
                            window._renderVideoOptions();
                            window._tryNextVideo();
                        } else {
                            if (_smartPlayState.fallbackAudio) window.playNormalMusicFallback();
                        }
                    })
                    .catch(function() {
                        if (_smartPlayState.fallbackAudio) window.playNormalMusicFallback();
                    });
            }
        })
        .catch(function(e) {
            console.log('[smartPlay] Backend error, falling back to old method:', e);
            // OLD FALLBACK: use the original /youtube-video endpoint
            var ytQueryEnc = encodeURIComponent(song.title + ' ' + (song.artist || '') + ' official video');
            fetch(window.API_BASE + '/music/youtube-video?q=' + ytQueryEnc)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var loadingMsg = document.getElementById('yt-loading-msg');
                    if (loadingMsg) loadingMsg.style.display = 'none';
                    if (data.video_id) {
                        var iframe = document.getElementById('yt-video-iframe-ui');
                        if (iframe) iframe.src = 'https://www.youtube.com/embed/' + data.video_id + '?autoplay=1&enablejsapi=1';
                    } else {
                        window.playNormalMusicFallback();
                    }
                }).catch(function() { window.playNormalMusicFallback(); });
        });
};

window._renderVideoOptions = function() {
    var optsContainer = document.getElementById('modal-video-options');
    if (!optsContainer) return;
    
    var allIds = _smartPlayState.videoIds.concat(_smartPlayState.backupIds);
    var html = '';
    
    for(var i=0; i<allIds.length; i++) {
        var vId = allIds[i];
        var isPrimary = i < _smartPlayState.videoIds.length;
        var badge = isPrimary ? '<span style="position:absolute;top:2px;right:2px;background:var(--accent);color:white;font-size:10px;padding:2px 4px;border-radius:4px;">HQ</span>' : '';
        html += '<div onclick="window._playSpecificVideo(\'' + vId + '\')" style="flex-shrink:0; position:relative; width:120px; cursor:pointer; border-radius:8px; overflow:hidden; border: 2px solid transparent; transition:0.2s;" onmouseover="this.style.borderColor=\'var(--accent)\'" onmouseout="this.style.borderColor=\'transparent\'">' +
                    '<img src="https://img.youtube.com/vi/' + vId + '/mqdefault.jpg" style="width:100%; height:68px; object-fit:cover;">' +
                    badge +
                    '<div style="background:#222; color:#ccc; font-size:11px; padding:4px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Source ' + (i+1) + '</div>' +
                '</div>';
    }
    optsContainer.innerHTML = html;
};

window._playSpecificVideo = function(videoId) {
    var allIds = _smartPlayState.videoIds.concat(_smartPlayState.backupIds);
    var idx = allIds.indexOf(videoId);
    if(idx !== -1) {
        _smartPlayState.index = idx; // Update index so "Try Next" button moves to the right one next
    }
    var indicator = document.getElementById('modal-source-indicator');
    if(indicator) indicator.innerHTML = '<i class="fab fa-youtube"></i> Source: Selected Video (' + (idx+1) + '/' + allIds.length + ')';
    _loadVideoEmbed(videoId);
};

// ── Helper: Try the next video ID in the ranked list ────────────
// WHY: If a YouTube embed shows "Video unavailable", user can advance
//      to the next candidate manually.
window._tryNextVideo = function() {
    var ids = _smartPlayState.videoIds;
    var backups = _smartPlayState.backupIds;
    var idx = _smartPlayState.index;
    
    var indicator = document.getElementById('modal-source-indicator');

    // Try primary IDs first
    if (idx < ids.length) {
        if(indicator) indicator.innerHTML = '<i class="fab fa-youtube"></i> Source: High-Quality Video (' + (idx+1) + '/' + ids.length + ')';
        _loadVideoEmbed(ids[idx]);
        _smartPlayState.index++;
        return;
    }

    // Then try backup IDs
    var backupIdx = idx - ids.length;
    if (backupIdx < backups.length) {
        if(indicator) indicator.innerHTML = '<i class="fab fa-youtube"></i> Source: Backup Video (' + (backupIdx+1) + '/' + backups.length + ')';
        _loadVideoEmbed(backups[backupIdx]);
        _smartPlayState.index++;
        return;
    }

    // All video IDs exhausted — switch to audio automatically
    window.playNormalMusicFallback();
};

function _loadVideoEmbed(videoId) {
    var iframe = document.getElementById('yt-video-iframe-ui');
    if (!iframe) return;
    iframe.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&enablejsapi=1';

    // WHY: We removed the strict auto-skip timer because it sometimes skips playable videos.
    // Instead, the user has a manual "Try Next" button below the video player.
}

// ── Helper: Render audio player in the modal ────────────────────
function _renderAudioPlayer(container, streamUrl, artUrl, sourceName) {
    var indicator = document.getElementById('modal-source-indicator');
    if(indicator) indicator.innerHTML = '<i class="fas fa-music"></i> Source: ' + (sourceName || 'High-Quality Audio');

    container.innerHTML = 
        '<div class="custom-audio-player" style="display:flex;flex-direction:column;align-items:center;width:100%;max-width:500px;margin:0 auto;">' +
            '<img src="' + artUrl + '" style="width:250px;height:250px;border-radius:12px;margin-bottom:30px;box-shadow:0 15px 35px rgba(0,0,0,0.6); object-fit: cover;">' +
            '<div class="audio-controls-container" style="width:100%; display:flex; flex-direction:column; align-items:center;">' +
                '<div class="audio-progress-wrapper" style="width:100%; display:flex; align-items:center; gap:10px; margin-bottom: 20px;">' +
                    '<span id="custom-audio-current" style="color:var(--text-dim); font-size:12px; width:40px; text-align:right;">0:00</span>' +
                    '<div id="custom-audio-progress-bg" style="flex-grow:1; height:6px; background:#333; border-radius:3px; cursor:pointer; position:relative;">' +
                        '<div id="custom-audio-progress-fill" style="position:absolute; top:0; left:0; height:100%; width:0%; background:var(--accent); border-radius:3px; pointer-events:none;"></div>' +
                        '<div id="custom-audio-progress-thumb" style="position:absolute; top:50%; left:0%; transform:translate(-50%, -50%); width:12px; height:12px; background:#fff; border-radius:50%; pointer-events:none; opacity:0; transition:opacity 0.2s;"></div>' +
                    '</div>' +
                    '<span id="custom-audio-total" style="color:var(--text-dim); font-size:12px; width:40px; text-align:left;">0:00</span>' +
                '</div>' +
                '<div class="audio-buttons" style="display:flex; align-items:center; gap:25px;">' +
                    '<button onclick="var a=document.getElementById(\'modal-audio-player\'); if(a) a.currentTime = Math.max(0, a.currentTime - 10);" style="background:none; border:none; color:var(--text); font-size:20px; cursor:pointer;"><i class="fas fa-undo-alt"></i></button>' +
                    '<button id="custom-audio-play-btn" onclick="window.toggleCustomAudioPlay()" style="width:60px; height:60px; border-radius:50%; background:white; color:black; border:none; font-size:24px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 8px 20px rgba(255,255,255,0.2); transition:transform 0.2s;">' +
                        '<i class="fas fa-pause"></i>' +
                    '</button>' +
                    '<button onclick="var a=document.getElementById(\'modal-audio-player\'); if(a) a.currentTime = Math.min(a.duration, a.currentTime + 10);" style="background:none; border:none; color:var(--text); font-size:20px; cursor:pointer;"><i class="fas fa-redo-alt"></i></button>' +
                '</div>' +
                '<audio id="modal-audio-player" autoplay src="' + streamUrl + '" style="display:none;"></audio>' +
            '</div>' +
        '</div>';

    var audio = document.getElementById('modal-audio-player');
    var playBtn = document.getElementById('custom-audio-play-btn');
    var currentEl = document.getElementById('custom-audio-current');
    var totalEl = document.getElementById('custom-audio-total');
    var progressBg = document.getElementById('custom-audio-progress-bg');
    var progressFill = document.getElementById('custom-audio-progress-fill');
    var progressThumb = document.getElementById('custom-audio-progress-thumb');

    progressBg.addEventListener('mouseenter', function() { progressThumb.style.opacity = '1'; });
    progressBg.addEventListener('mouseleave', function() { progressThumb.style.opacity = '0'; });

    window.toggleCustomAudioPlay = function() {
        if(audio.paused) {
            audio.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audio.pause();
            playBtn.innerHTML = '<i class="fas fa-play" style="margin-left:4px;"></i>';
        }
    };

    audio.addEventListener('timeupdate', function() {
        if(!audio.duration) return;
        var curM = Math.floor(audio.currentTime / 60);
        var curS = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
        currentEl.textContent = curM + ':' + curS;
        
        var percent = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = percent + '%';
        progressThumb.style.left = percent + '%';
    });

    audio.addEventListener('loadedmetadata', function() {
        var durM = Math.floor(audio.duration / 60);
        var durS = Math.floor(audio.duration % 60).toString().padStart(2, '0');
        totalEl.textContent = durM + ':' + durS;
    });

    progressBg.addEventListener('click', function(e) {
        if(!audio.duration) return;
        var rect = progressBg.getBoundingClientRect();
        var pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
    });

    if (audio) { audio.volume = 1.0; audio.play().catch(function(){}); }
}


window.playSong = function(index) {
    console.log("🎵 PlaySong triggered, index:", index);
    if (index < 0 || index >= currentPlaylist.length) return;
    
    currentSongIndex = index;
    var song = currentPlaylist[index];
    console.log("🎶 Now playing:", song.title, "-", song.artist);
    
    if (currentPlayzoneContext === 'music-results') {
        window.closePlayer();
        window.showYouTubeVideoModal(song);
        return;
    }
    
    var bar = document.getElementById('now-playing-bar');
    if (bar) {
        bar.style.display = 'flex';
        bar.classList.add('visible');
    }

    var art = song.album_art || song.albumArt || 
        'https://ui-avatars.com/api/?name=' + encodeURIComponent(song.title) + '&background=1DB954&color=fff&size=300';
    
    var artEl = document.getElementById('now-playing-art');
    if (artEl) artEl.src = art;
    
    var titleEl = document.getElementById('now-playing-title');
    if (titleEl) titleEl.textContent = song.title;
    
    var artistEl = document.getElementById('now-playing-artist');
    if (artistEl) artistEl.textContent = song.artist || song.Artist || 'Unknown Artist';

    var playBtn = document.getElementById('np-play-btn');
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
    
    moodLoopCount = 0;
    if (typeof moodPlayTimer !== 'undefined' && moodPlayTimer) { clearTimeout(moodPlayTimer); moodPlayTimer = null; }
    
    if (currentPlayzoneContext === 'mood-results') {
        // ── MOOD PLAYBACK: Multi-layer fallback for 90-second clips ──
        // WHY: musicapi.x007 goes down frequently; JioSaavn is more reliable.
        // WHAT: Try JioSaavn → musicapi.x007 → iTunes preview.
        // WHEN: User clicks a song in the "How are you feeling?" section.
        var moodQuery = encodeURIComponent(song.title + ' ' + (song.artist || ''));
        
        // Helper: start 90-second mood playback from the chorus
        function _startMoodPlayback(url) {
            globalAudio.src = url;
            // Jump to the 45 second mark for the "best part" chorus
            globalAudio.currentTime = 45;
            globalAudio.play().catch(function(e){});
            // Stop the song after exactly 90 seconds to match the Instagram style limit
            moodPlayTimer = setTimeout(function() {
                window.playNext();
            }, 90000);
        }
        
        // Layer 1: JioSaavn (primary — high quality, reliable)
        console.log("🔍 Trying JioSaavn source...");
        fetch('https://saavn.dev/api/search/songs?query=' + moodQuery)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.data && data.data.results && data.data.results[0]) {
                    var dl = data.data.results[0].downloadUrl || [];
                    var url = '';
                    for (var i = 0; i < dl.length; i++) {
                        if (dl[i].quality === '320kbps' || dl[i].quality === '160kbps') { url = dl[i].link; break; }
                    }
                    if (!url && dl.length) url = dl[dl.length - 1].link;
                    if (url) { _startMoodPlayback(url); return; }
                }
                throw new Error('JioSaavn empty');
            })
            .catch(function() {
                console.log("⚠️ JioSaavn failed → trying backup...");
                // Layer 2: musicapi.x007 (OLD — kept as secondary fallback)
                console.log("🔁 Trying secondary API...");
                fetch('https://musicapi.x007.workers.dev/search?q=' + moodQuery + '&searchEngine=wunk')
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.response && data.response[0]) {
                            return fetch('https://musicapi.x007.workers.dev/fetch?id=' + data.response[0].id);
                        }
                        throw new Error('x007 empty');
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.response) { _startMoodPlayback(data.response); return; }
                        throw new Error('x007 no stream');
                    })
                    .catch(function() {
                        // Layer 3: iTunes 30s preview as last resort
                        if (song.previewUrl) {
                            console.log("🎧 Using preview iTunes Api");
                            globalAudio.src = song.previewUrl;
                            globalAudio.play().catch(function(e){});
                        } else {
                            // Auto-skip to next song if absolutely nothing works
                            window.playNext();
                        }
                    });
            });
    } else {
        if (song.previewUrl) {
            globalAudio.src = song.previewUrl;
            globalAudio.play().catch(function(e){ console.log('Audio error', e); });
        } else {
            var q = encodeURIComponent(song.title + ' ' + (song.artist || ''));
            fetch('https://itunes.apple.com/search?term=' + q + '&entity=song&limit=1')
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.results && data.results.length > 0) {
                        var track = data.results[0];
                        song.previewUrl = track.previewUrl;
                        if (track.artworkUrl100) {
                            artEl.src = track.artworkUrl100.replace('100x100bb', '300x300bb');
                        }
                        globalAudio.src = song.previewUrl;
                        globalAudio.play().catch(function(e){});
                    }
                });
        }
    }
    
    isPlaying = true;
};

window.playSongByTitle = function(title) {
    var idx = currentPlaylist.findIndex(function(s) { return s.title === title; });
    if (idx >= 0) {
        window.playSong(idx);
    }
};

window.togglePlayPause = function() {
    isPlaying = !isPlaying;
    
    if (useYouTubePlayer) {
        var ytPlayer = document.getElementById('yt-bg-player');
        if (ytPlayer) {
            if (!isPlaying) {
                ytPlayer.src = '';
            } else {
                window.playSong(currentSongIndex);
            }
        }
    } else {
        if (isPlaying) {
            globalAudio.play().catch(function(e){});
        } else {
            globalAudio.pause();
        }
    }
    var playBtn = document.getElementById('np-play-btn');
    if (playBtn) {
        playBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
};

window.playPrevious = function() {
    if (currentSongIndex > 0) {
        window.playSong(currentSongIndex - 1);
    }
};

window.playNext = function() {
    if (currentSongIndex < currentPlaylist.length - 1) {
        window.playSong(currentSongIndex + 1);
    }
};

window.closePlayer = function() {
    var bar = document.getElementById('now-playing-bar');
    if (bar) {
        bar.style.display = 'none';
        bar.classList.remove('visible');
    }
    isPlaying = false;
    globalAudio.pause();
    var ytPlayer = document.getElementById('yt-bg-player');
    if (ytPlayer) ytPlayer.src = '';
    
    if (currentHlsInstance) {
        try { currentHlsInstance.destroy(); } catch(e) {}
        currentHlsInstance = null;
    }
};

// Language preference for Explore section
var exploreLanguagePref = 'mix';

window.exploreByCategory = function(category) {
    var container = document.getElementById('music-results');
    if (!container) return;
    
    container.innerHTML = window.loadingHTML('Fetching amazing recommendations...');
    
    var hindiTerms = {
        new: 'new bollywood songs 2025',
        popular: 'top bollywood trending',
        indian: 'Arijit Singh best bollywood',
        english: 'english pop billboard',
        workout: 'hindi workout gym bass',
        chill: 'bollywood lofi chill'
    };
    var englishTerms = {
        new: 'new pop songs 2025',
        popular: 'top chart hits worldwide',
        indian: 'bollywood hit songs',
        english: 'Taylor Swift Dua Lipa pop',
        workout: 'Eminem workout gym',
        chill: 'Billie Eilish chill indie'
    };

    var categoryNames = {
        new: { icon: '🆕', title: 'New Releases', desc: 'Latest global hits' },
        popular: { icon: '🔥', title: 'Popular', desc: 'Most played worldwide' },
        indian: { icon: '🇮🇳', title: 'Indian Music', desc: 'Bollywood & desi hits' },
        english: { icon: '🌎', title: 'English', desc: 'International chart toppers' },
        workout: { icon: '💪', title: 'Workout', desc: 'Get pumped with high energy' },
        chill: { icon: '😌', title: 'Chill', desc: 'Relax and unwind' }
    };

    var cat = categoryNames[category] || { icon: '🎵', title: category, desc: '' };
    
    var langToggleHtml = '<div style="display:flex; justify-content:center; gap:10px; margin:15px 0;">' +
        '<button onclick="exploreLanguagePref=\'mix\'; exploreCategory(\'' + category + '\')" style="padding:6px 18px; border-radius:20px; border:1px solid var(--accent); background:' + (exploreLanguagePref === 'mix' ? 'var(--accent)' : 'transparent') + '; color:white; cursor:pointer; font-weight:600;">🔀 Mix</button>' +
        '<button onclick="exploreLanguagePref=\'hindi\'; exploreCategory(\'' + category + '\')" style="padding:6px 18px; border-radius:20px; border:1px solid var(--accent); background:' + (exploreLanguagePref === 'hindi' ? 'var(--accent)' : 'transparent') + '; color:white; cursor:pointer; font-weight:600;">🇮🇳 Hindi</button>' +
        '<button onclick="exploreLanguagePref=\'english\'; exploreCategory(\'' + category + '\')" style="padding:6px 18px; border-radius:20px; border:1px solid var(--accent); background:' + (exploreLanguagePref === 'english' ? 'var(--accent)' : 'transparent') + '; color:white; cursor:pointer; font-weight:600;">🌎 English</button>' +
    '</div>';

    var headerHtml = '<div class="explore-header">' +
        '<span class="explore-icon">' + cat.icon + '</span>' +
        '<div class="explore-info">' +
            '<h3>' + cat.title + '</h3>' +
            '<p>' + cat.desc + '</p>' +
        '</div>' +
    '</div>' + langToggleHtml;

    var hindiTerm = hindiTerms[category] || category;
    var englishTerm = englishTerms[category] || category;

    var fetchHindi = function() {
        return fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(hindiTerm) + '&entity=song&country=IN&limit=12')
            .then(function(r) { return r.json(); });
    };
    var fetchEnglish = function() {
        return fetch('https://itunes.apple.com/search?term=' + encodeURIComponent(englishTerm) + '&entity=song&country=US&limit=12')
            .then(function(r) { return r.json(); });
    };

    var mapTrack = function(track) {
        return {
            title: track.trackName,
            artist: track.artistName,
            genre: track.primaryGenreName,
            albumArt: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '300x300bb') : '',
            previewUrl: track.previewUrl
        };
    };

    var promises = [];
    if (exploreLanguagePref === 'hindi') {
        promises = [fetchHindi()];
    } else if (exploreLanguagePref === 'english') {
        promises = [fetchEnglish()];
    } else {
        promises = [fetchHindi(), fetchEnglish()];
    }

    Promise.all(promises)
        .then(function(results) {
            var songs = [];
            if (exploreLanguagePref === 'mix' && results.length === 2) {
                var h = (results[0].results || []).map(mapTrack);
                var e = (results[1].results || []).map(mapTrack);
                var maxLen = Math.max(h.length, e.length);
                for (var i = 0; i < maxLen; i++) {
                    if (h[i]) songs.push(h[i]);
                    if (e[i]) songs.push(e[i]);
                }
            } else {
                songs = (results[0].results || []).map(mapTrack);
            }
            window.renderPlayzone(songs, category, headerHtml, 'music-results');
        })
        .catch(function(e) {
            container.innerHTML = window.errBox('Failed to fetch recommendations. Please try again.');
        });
};

// ============================================================
//  HELPER FUNCTIONS
// ============================================================

window.errBox = function(message) {
    return '<div class="error-box"><i class="fas fa-exclamation-circle"></i> ' + message + '</div>';
};

window.loadingHTML = function(message) {
    return '<div class="loading-box"><i class="fas fa-spinner fa-spin"></i> ' + message + '</div>';
};

// ============================================================
//  ALIAS FUNCTIONS FOR onclick HANDLERS
// ============================================================

window.getMusicByMood = function(mood) {
    window.startMoodDetection();
};

window.getMusicRecommendations = function() {
    var query = '';
    var input = document.getElementById('music-search');
    if (input) query = input.value;
    window.searchSongs(query);
};

window.exploreCategory = function(category) {
    window.exploreByCategory(category);
};

// ============================================================
//  AUTO-INITIALIZE WHEN DOM READY
// ============================================================

// Wait for DOM and run when music AI page is shown
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on music AI page
    function checkMusicPage() {
        if (window.location.hash === '#music-discover' || window.location.hash === '') {
            // Just ensure functions are available
            console.log('Music AI ready');
        }
    }
    checkMusicPage();
    window.addEventListener('hashchange', checkMusicPage);
});

// Also expose a global init function
window.initMusicAI = function() {
    console.log('Music AI functions:', Object.keys(window).filter(function(k) { 
        return typeof window[k] === 'function' && k.indexOf('Song') >= 0 || k.indexOf('Mood') >= 0 || k.indexOf('Explore') >= 0;
    }));
};

// Done - all functions are now properly exposed to window
console.log('Music AI loaded successfully');
