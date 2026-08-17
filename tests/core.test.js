const test = require('node:test');
const assert = require('node:assert/strict');

test('validates supported image types and exact size boundary', () => {
  const { validateImage, MAX_FILE_BYTES } = require('../visual-extractor/files');
  assert.deepEqual(validateImage({ type: 'image/jpeg', size: MAX_FILE_BYTES }), { ok: true });
  assert.deepEqual(validateImage({ type: 'image/png', size: 12 }), { ok: true });
  assert.equal(validateImage({ type: 'image/webp', size: 12 }).code, 'TYPE');
  assert.equal(validateImage({ type: 'image/png', size: MAX_FILE_BYTES + 1 }).code, 'SIZE');
});

test('localization defaults to English and persists Chinese', () => {
  const { createI18n } = require('../visual-extractor/i18n');
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  const i18n = createI18n({ storage });
  assert.equal(i18n.t('upload.action'), 'BEGIN EXTRACTION');
  i18n.setLocale('zh');
  assert.equal(i18n.t('upload.action'), '开始提取');
  assert.equal(data.get('vibe-locale'), 'zh');
});

test('normalizes analysis into stable report contract', () => {
  const { normalizeAnalysis } = require('../lib/normalize-analysis');
  const result = normalizeAnalysis({
    summary: 'Editorial', palette: [{ hex: '#abc', role: 'Primary' }],
    composition: { lightType: 'Flat' }, textures: ['Paper'], tags: ['Grid'], prompt: 'strict grid'
  }, 'en');
  assert.equal(result.palette[0].hex, '#AABBCC');
  assert.equal(result.composition.tone, 'Not determined');
  assert.deepEqual(result.tags, ['Grid']);
});

test('formats a complete English report', () => {
  const { formatReport } = require('../visual-extractor/report');
  const text = formatReport({ summary:'Calm', palette:[{hex:'#000000',role:'Primary'}], composition:{lightType:'Flat',tone:'Neutral',framing:'Wide',composition:'Grid',depth:'Flat'}, textures:['Paper'], tags:['Editorial'], prompt:'monochrome' }, 'en');
  assert.match(text, /VIBE SUMMARY/);
  assert.match(text, /#000000/);
  assert.match(text, /AI PROMPT/);
});

test('analysis loading tracker exposes elapsed time and stops on the final step', () => {
  const { createLoadingTracker } = require('../visual-extractor/loading');
  let now = 1000;
  const tracker = createLoadingTracker({ now: () => now, stepCount: 4 });
  assert.deepEqual(tracker.snapshot(), { step: 0, elapsedSeconds: 0 });
  tracker.advance(); tracker.advance(); tracker.advance(); tracker.advance();
  now = 4500;
  assert.deepEqual(tracker.snapshot(), { step: 3, elapsedSeconds: 3 });
});

test('localization includes prominent analysis loading copy', () => {
  const { createI18n } = require('../visual-extractor/i18n');
  const i18n = createI18n({ initialLocale: 'en' });
  assert.equal(i18n.t('loading.title'), 'ANALYZING VISUAL SYSTEM');
  assert.equal(i18n.t('loading.elapsed'), 'ELAPSED');
  i18n.setLocale('zh');
  assert.equal(i18n.t('loading.title'), '正在分析视觉系统');
});

test('localization covers infinite feed and material selection states', () => {
  const { createI18n } = require('../visual-extractor/i18n');
  const i18n = createI18n({ initialLocale: 'en' });
  assert.equal(i18n.t('feed.loadingMore'), 'LOADING MORE MATERIALS…');
  assert.equal(i18n.t('feed.retry'), 'RETRY LOADING');
  assert.equal(i18n.t('feed.end'), 'END OF MATERIALS');
  assert.equal(i18n.t('material.adding'), 'ADDING TO EXTRACTOR…');
  assert.match(i18n.t('material.selectLabel'), /Select material/);
  assert.equal(i18n.t('error.MATERIAL_IMAGE_INVALID'), 'COULD NOT ADD THIS MATERIAL');
  i18n.setLocale('zh');
  assert.equal(i18n.t('feed.end'), '素材已全部加载');
});
