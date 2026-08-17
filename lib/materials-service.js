function materialError() {
  const error = new Error('Material search is unavailable');
  error.code = 'MATERIALS_UNAVAILABLE';
  return error;
}

function cleanSignal(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildMaterialQuery(analysis = {}) {
  const composition = analysis.composition || {};
  const values = [
    ...(Array.isArray(analysis.tags) ? analysis.tags : []),
    ...(Array.isArray(analysis.textures) ? analysis.textures : []),
    composition.tone,
    composition.composition,
    composition.lightType
  ];
  const unique = [];
  values.forEach(value => {
    const signal = cleanSignal(value);
    if (signal && !unique.includes(signal) && unique.length < 6) unique.push(signal);
  });
  return unique.join(' ') || 'editorial design inspiration';
}

function attributed(url) {
  if (!url) return '#';
  return `${url}${url.includes('?') ? '&' : '?'}utm_source=vibe_dna&utm_medium=referral`;
}

function normalizeUnsplashResults(payload = {}) {
  const results = Array.isArray(payload.results) ? payload.results : [];
  return results.filter(photo => photo && photo.id && photo.urls && photo.urls.regular).map(photo => ({
    id: photo.id,
    imageUrl: photo.urls.regular,
    width: Number(photo.width) || 1200,
    height: Number(photo.height) || 800,
    color: photo.color || '#e5e5e5',
    title: photo.description || photo.alt_description || 'Untitled visual reference',
    author: photo.user && (photo.user.name || photo.user.username) || 'Unsplash contributor',
    authorUrl: attributed(photo.user && photo.user.links && photo.user.links.html),
    sourceUrl: attributed(photo.links && photo.links.html),
    tags: (Array.isArray(photo.tags) ? photo.tags : []).map(tag => cleanSignal(tag && tag.title)).filter(Boolean).slice(0, 3)
  }));
}

async function searchMaterials({ query, page = 1, accessKey = process.env.UNSPLASH_ACCESS_KEY, fetchImpl = fetch, signal } = {}) {
  if (!accessKey) throw materialError();
  const currentPage = Math.max(1, Number(page) || 1);
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', cleanSignal(query) || 'editorial design inspiration');
  url.searchParams.set('page', String(currentPage));
  url.searchParams.set('per_page', '12');
  url.searchParams.set('order_by', 'relevant');
  url.searchParams.set('content_filter', 'high');
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw materialError();
  }
  if (!response.ok) throw materialError();
  const payload = await response.json();
  return {
    items: normalizeUnsplashResults(payload),
    page: currentPage,
    totalPages: Math.max(1, Number(payload.total_pages) || 1)
  };
}

module.exports = { buildMaterialQuery, normalizeUnsplashResults, searchMaterials };
