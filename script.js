const API_BASE = 'https://api.jikan.moe/v4';
const trendingGrid = document.getElementById('trendingGrid');
const genreGrid = document.getElementById('genreGrid');
const recomGrid = document.getElementById('recomGrid');
const searchInput = document.getElementById('animeQuery');
const searchBtn = document.getElementById('searchBtn');
const animeModal = document.getElementById('animeModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.querySelector('.close-modal');
const genreChips = document.querySelectorAll('.genre-chip');

const watchedInput = document.getElementById('watchedEarlier');
const suggestionsBox = document.getElementById('watchedSuggestions');
const moodGenreSelect = document.getElementById('moodGenre');

let selectedAnimeId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchTrending();
    fetchByGenre('all');
});

// Fetch Top Anime
async function fetchTrending() {
    try {
        const response = await fetch(`${API_BASE}/top/anime?limit=10`);
        const data = await response.json();
        renderAnime(data.data, trendingGrid);
    } catch (error) {
        console.error('Error fetching trending:', error);
    }
}

// Fetch by Genre
async function fetchByGenre(genreId) {
    let url = `${API_BASE}/top/anime?limit=12`;
    if (genreId !== 'all') {
        url = `${API_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=12`;
    }

    try {
        genreGrid.innerHTML = '<div class="loader">Loading...</div>';
        const response = await fetch(url);
        const data = await response.json();
        renderAnime(data.data, genreGrid);
    } catch (error) {
        console.error('Error fetching by genre:', error);
    }
}

// Search Anime
async function searchAnime(query) {
    if (!query) return;
    try {
        const response = await fetch(`${API_BASE}/anime?q=${query}&limit=12`);
        const data = await response.json();

        const recommendationsSection = document.getElementById('recommendations');
        recommendationsSection.classList.remove('hidden');
        recommendationsSection.querySelector('h2').innerText = `Search Results for "${query}"`;
        renderAnime(data.data, recomGrid);
        recommendationsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error searching anime:', error);
    }
}

// Get Random Anime
async function getRandomAnime() {
    try {
        const response = await fetch(`${API_BASE}/random/anime`);
        const data = await response.json();
        showDetails(data.data.mal_id);
    } catch (error) {
        console.error('Error fetching random anime:', error);
    }
}

// Show Details in Modal
async function showDetails(id) {
    try {
        const response = await fetch(`${API_BASE}/anime/${id}/full`);
        const data = await response.json();
        const anime = data.data;

        modalBody.innerHTML = `
            <div class="modal-body-grid">
                <div class="modal-img">
                    <img src="${anime.images.jpg.large_image_url}" alt="${anime.title}">
                </div>
                <div class="modal-info">
                    <h2>${anime.title}</h2>
                    <div class="modal-stats">
                        <span class="rating"><i class="fas fa-star"></i> ${anime.score || 'N/A'}</span>
                        <span><i class="fas fa-calendar"></i> ${anime.year || anime.aired.prop.from.year || 'N/A'}</span>
                        <span><i class="fas fa-film"></i> ${anime.type}</span>
                        <span><i class="fas fa-clock"></i> ${anime.duration}</span>
                    </div>
                    <div class="genre-list">
                        ${anime.genres.map(g => `<span class="genre-chip">${g.name}</span>`).join('')}
                    </div>
                    <div class="modal-synopsis">
                        <p>${anime.synopsis ? anime.synopsis.slice(0, 500) + '...' : 'No synopsis available.'}</p>
                    </div>
                    <div class="hero-btns">
                        <a href="${anime.url}" target="_blank" class="btn btn-primary">MAL Profile</a>
                        <button class="btn btn-secondary" onclick="fetchRecommendations(${anime.mal_id})">Similar Anime</button>
                    </div>
                </div>
            </div>
        `;
        animeModal.style.display = 'block';
    } catch (error) {
        console.error('Error fetching details:', error);
    }
}

// Fetch Recommendations for a specific anime
async function fetchRecommendations(id) {
    try {
        const response = await fetch(`${API_BASE}/anime/${id}/recommendations`);
        const data = await response.json();
        const recommendations = data.data.slice(0, 10).map(r => r.entry);

        animeModal.style.display = 'none';
        const recommendationsSection = document.getElementById('recommendations');
        recommendationsSection.classList.remove('hidden');
        recommendationsSection.querySelector('h2').innerText = `Because you liked it...`;
        renderAnime(recommendations, recomGrid);
        recommendationsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error fetching recommendations:', error);
    }
}

// Personalized Recommendations based on FORM
async function getPersonalizedRecs() {
    const genreId = moodGenreSelect.value;

    try {
        let recommendations = [];

        // If they picked an anime they liked, get recs for that first
        if (selectedAnimeId) {
            const resp = await fetch(`${API_BASE}/anime/${selectedAnimeId}/recommendations`);
            const data = await resp.json();
            recommendations = data.data.slice(0, 8).map(r => r.entry);
        }

        // Also fetch top in their mood genre to mix in
        const genreResp = await fetch(`${API_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=6`);
        const genreData = await genreResp.json();

        // Combine and unique by mal_id
        const combined = [...recommendations, ...genreData.data];
        const unique = Array.from(new Map(combined.map(item => [item.mal_id, item])).values());

        const recommendationsSection = document.getElementById('recommendations');
        recommendationsSection.classList.remove('hidden');
        recommendationsSection.querySelector('h2').innerText = `Curated for Your Mood`;
        renderAnime(unique, recomGrid);
        recommendationsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error getting personalized recs:', error);
    }
}

// Watch Earlier Suggestions Logic
watchedInput.oninput = async (e) => {
    const query = e.target.value;
    if (query.length < 3) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    try {
        const resp = await fetch(`${API_BASE}/anime?q=${query}&limit=5`);
        const data = await resp.json();

        suggestionsBox.innerHTML = '';
        data.data.forEach(anime => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerText = anime.title;
            item.onclick = () => {
                watchedInput.value = anime.title;
                selectedAnimeId = anime.mal_id;
                suggestionsBox.classList.add('hidden');
            };
            suggestionsBox.appendChild(item);
        });
        suggestionsBox.classList.remove('hidden');
    } catch (e) { console.error(e); }
};

// Render Anime List
function renderAnime(animeList, container) {
    container.innerHTML = '';
    if (!animeList || animeList.length === 0) {
        container.innerHTML = '<p>No results found.</p>';
        return;
    }

    animeList.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            ${anime.score ? `<span class="badge">${anime.score}</span>` : ''}
            <img src="${anime.images ? anime.images.jpg.large_image_url : anime.image_url}" alt="${anime.title}" loading="lazy">
            <div class="card-info">
                <h3>${anime.title}</h3>
                <div class="card-meta">
                    <span>${anime.type || 'TV'}</span>
                    <span class="rating"><i class="fas fa-star"></i> ${anime.score || 'N/A'}</span>
                </div>
            </div>
        `;
        card.onclick = () => showDetails(anime.mal_id);
        container.appendChild(card);
    });
}

// Event Listeners
searchBtn.onclick = () => searchAnime(searchInput.value);
searchInput.onkeyup = (e) => { if (e.key === 'Enter') searchAnime(searchInput.value); };

genreChips.forEach(chip => {
    chip.onclick = () => {
        genreChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        fetchByGenre(chip.dataset.genre);
    };
});

closeModal.onclick = () => animeModal.style.display = 'none';
window.onclick = (e) => { if (e.target === animeModal) animeModal.style.display = 'none'; };

function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

function scrollGrid(id, direction) {
    const grid = document.getElementById(id);
    const scrollAmount = 300;
    grid.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}
