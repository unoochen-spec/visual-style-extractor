const test = require('node:test');
const assert = require('node:assert/strict');

test('serves the visual extractor shell', async () => {
  const { createServer } = require('../server');
  const server = createServer({ openAI: null });
  await new Promise(resolve => server.listen(0, resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /VISUAL STYLE EXTRACTOR/);
  await new Promise(resolve => server.close(resolve));
});

test('serves the UI state contract before the application entrypoint', async t => {
  const { createServer } = require('../server');
  const server = createServer({ openAI: null });
  await new Promise(resolve => server.listen(0, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
  const html = await response.text();
  const stateModule = html.indexOf('<script src="/ui-state.js"></script>');
  const appEntry = html.indexOf('<script src="/app.js"></script>');

  assert.ok(stateModule >= 0, 'expected the UI state module in the served shell');
  assert.ok(stateModule < appEntry, 'expected UI state to load before app.js');
});

test('returns normalized related materials from the server-side search endpoint', async t => {
  const { createServer } = require('../server');
  let received;
  const server = createServer({ search: async input => {
    received = input;
    return { items: [{ id: 'one' }], page: 2, totalPages: 3 };
  } });
  await new Promise(resolve => server.listen(0, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/materials`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ analysis: { tags: ['Editorial'] }, page: 2 })
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items: [{ id: 'one' }], page: 2, totalPages: 3 });
  assert.equal(received.query, 'editorial');
  assert.equal(received.page, 2);
});

test('proxies a validated material image as uploadable bytes', async t => {
  const { createServer } = require('../server');
  const bytes = Buffer.from([255, 216, 255, 217]);
  let receivedUrl;
  const server = createServer({ downloadImage: async ({ url }) => {
    receivedUrl = url;
    return { buffer: bytes, mimeType: 'image/jpeg', filename: 'unsplash-material.jpg' };
  } });
  await new Promise(resolve => server.listen(0, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/material-image`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageUrl: 'https://images.unsplash.com/photo-demo' })
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.match(response.headers.get('content-disposition'), /unsplash-material\.jpg/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(receivedUrl, 'https://images.unsplash.com/photo-demo');
});

test('translates a structured analysis through the local model endpoint', async t => {
  const { createServer } = require('../server');
  const source = {
    summary: 'Calm editorial layout',
    palette: [{ hex: '#112233', role: 'Primary' }],
    composition: { lightType: 'Soft', tone: 'Neutral', framing: 'Wide', composition: 'Grid', depth: 'Flat' },
    textures: ['Paper'], tags: ['Editorial'], prompt: 'Editorial grid image'
  };
  let received;
  const translated = { ...source, summary: '冷静的编辑式布局' };
  const server = createServer({ translate: async input => { received = input; return translated; } });
  await new Promise(resolve => server.listen(0, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/translate-analysis`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ analysis: source, locale: 'zh' })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), translated);
  assert.deepEqual(received.analysis, source);
  assert.equal(received.locale, 'zh');
  assert.ok(received.signal instanceof AbortSignal);
});

test('rejects invalid translation requests', async t => {
  const { createServer } = require('../server');
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/translate-analysis`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'INVALID_REQUEST' });
});

test('returns 503 when cloud analysis is selected without an OpenAI key', async t => {
  const { createServer } = require('../server');
  const previousProvider = process.env.AI_PROVIDER;
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.AI_PROVIDER = 'openai';
  delete process.env.OPENAI_API_KEY;
  t.after(() => {
    if (previousProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = previousProvider;
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });

  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const form = new FormData();
  form.append('file', new Blob([Buffer.from([137, 80, 78, 71])], { type: 'image/png' }), 'sample.png');
  form.append('locale', 'en');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/analyze`, {
    method: 'POST',
    body: form
  });

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'OPENAI_NOT_CONFIGURED' });
});
