// ============================================================
//  mood.js - Minimal compatibility layer
//  (Most functionality moved to music.js)
// ============================================================

// Keep only essential helper functions
function errBox(message) {
    return `<div class="error-box"><i class="fas fa-exclamation-circle"></i> ${message}</div>`;
}

function loadingHTML(message) {
    return `<div class="loading-box"><i class="fas fa-spinner fa-spin"></i> ${message}</div>`;
}

function posterCardHTML(movie) {
    // Fallback - now handled by script.js
    if (typeof window.posterCardHTML === 'function') {
        return window.posterCardHTML(movie);
    }
    return `<div class="poster-card">${movie?.title || 'Unknown'}</div>`;
}