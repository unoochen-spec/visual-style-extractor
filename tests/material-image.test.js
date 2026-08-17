const test = require('node:test');
const assert = require('node:assert/strict');

test('allows only secure Unsplash CDN image URLs', () => {
  const { validateMaterialUrl } = require('../lib/material-image');
  assert.equal(validateMaterialUrl('https://images.unsplash.com/photo-demo').hostname, 'images.unsplash.com');
  for (const value of ['http://images.unsplash.com/photo-demo','https://example.com/photo.jpg','not-a-url']) {
    assert.throws(() => validateMaterialUrl(value), error => error.code === 'MATERIAL_IMAGE_INVALID');
  }
});

test('downloads a valid PNG within the size limit', async () => {
  const { downloadMaterialImage } = require('../lib/material-image');
  const bytes = Buffer.from([137,80,78,71,13,10,26,10]);
  const result = await downloadMaterialImage({
    url: 'https://images.unsplash.com/photo-demo',
    fetchImpl: async () => new Response(bytes, { status: 200, headers: { 'content-type': 'image/png', 'content-length': String(bytes.length) } })
  });
  assert.deepEqual(result, { buffer: bytes, mimeType: 'image/png', filename: 'unsplash-material.png' });
});

test('rejects non-image responses and oversized bodies', async () => {
  const { downloadMaterialImage } = require('../lib/material-image');
  await assert.rejects(
    () => downloadMaterialImage({ url: 'https://images.unsplash.com/photo-demo', fetchImpl: async () => new Response('html', { headers: { 'content-type': 'text/html' } }) }),
    error => error.code === 'MATERIAL_IMAGE_INVALID'
  );
  await assert.rejects(
    () => downloadMaterialImage({ url: 'https://images.unsplash.com/photo-demo', maxBytes: 4, fetchImpl: async () => new Response('12345', { headers: { 'content-type': 'image/jpeg' } }) }),
    error => error.code === 'MATERIAL_IMAGE_TOO_LARGE'
  );
});

test('rejects redirects instead of following them to another host', async () => {
  const { downloadMaterialImage } = require('../lib/material-image');
  await assert.rejects(
    () => downloadMaterialImage({ url: 'https://images.unsplash.com/photo-demo', fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://example.com/private' } }) }),
    error => error.code === 'MATERIAL_IMAGE_INVALID'
  );
});
