const test = require('node:test');
const assert = require('node:assert/strict');

test('builds a concise unique material query from analysis signals', () => {
  const { buildMaterialQuery } = require('../lib/materials-service');
  const query = buildMaterialQuery({
    tags: ['Editorial', 'Grid', 'Editorial', 'Black and White'],
    textures: ['Paper', 'Matte'],
    composition: { tone: 'Neutral', composition: 'Centered', lightType: 'Flat' }
  });
  assert.equal(query, 'editorial grid black and white paper matte neutral');
});

test('normalizes Unsplash search results into the material-card contract', () => {
  const { normalizeUnsplashResults } = require('../lib/materials-service');
  const payload = {
    total: 21,
    total_pages: 2,
    results: [{
      id: 'photo-1', width: 3000, height: 2000, color: '#d0d0d0',
      description: 'Editorial architecture', alt_description: 'concrete building',
      urls: { raw: 'https://images.unsplash.com/raw', full: 'https://images.unsplash.com/full', regular: 'https://images.unsplash.com/regular', small: 'https://images.unsplash.com/small', thumb: 'https://images.unsplash.com/thumb' },
      links: { self: 'https://api.unsplash.com/photos/photo-1', html: 'https://unsplash.com/photos/photo-1', download: 'https://unsplash.com/photos/photo-1/download', download_location: 'https://api.unsplash.com/photos/photo-1/download' },
      user: { name: 'Ada Photo', username: 'ada', links: { html: 'https://unsplash.com/@ada' } },
      tags: [{ title: 'architecture' }, { title: 'minimal' }]
    }]
  };

  const result = normalizeUnsplashResults(payload);
  assert.deepEqual(result, [{
    id: 'photo-1', imageUrl: 'https://images.unsplash.com/regular', width: 3000, height: 2000,
    color: '#d0d0d0', title: 'Editorial architecture', author: 'Ada Photo',
    authorUrl: 'https://unsplash.com/@ada?utm_source=vibe_dna&utm_medium=referral',
    sourceUrl: 'https://unsplash.com/photos/photo-1?utm_source=vibe_dna&utm_medium=referral',
    tags: ['architecture', 'minimal']
  }]);
});

test('searches one 12-item Unsplash page with server-side public authentication', async () => {
  const { searchMaterials } = require('../lib/materials-service');
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ total: 0, total_pages: 4, results: [] }) };
  };

  const result = await searchMaterials({ query: 'editorial grid', page: 2, accessKey: 'demo-key', fetchImpl });
  const url = new URL(request.url);
  assert.equal(url.pathname, '/search/photos');
  assert.equal(url.searchParams.get('query'), 'editorial grid');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('per_page'), '12');
  assert.equal(url.searchParams.get('content_filter'), 'high');
  assert.equal(request.options.headers.Authorization, 'Client-ID demo-key');
  assert.deepEqual(result, { items: [], page: 2, totalPages: 4 });
});

test('reports missing material-search configuration without calling the network', async () => {
  const { searchMaterials } = require('../lib/materials-service');
  await assert.rejects(
    () => searchMaterials({ query: 'editorial', accessKey: '', fetchImpl: async () => { throw new Error('must not run'); } }),
    error => error.code === 'MATERIALS_UNAVAILABLE'
  );
});
