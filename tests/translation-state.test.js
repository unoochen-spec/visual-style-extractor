const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranslationState } = require('../visual-extractor/translation-state');

test('caches each locale and suppresses duplicate in-flight translations', () => {
  const state = createTranslationState();
  const english = { summary: 'Calm' };
  state.store('en', english);
  const token = state.start('zh');

  assert.equal(state.get('en'), english);
  assert.equal(state.start('zh'), null);
  assert.equal(state.isPending('zh'), true);

  const chinese = { summary: '冷静' };
  assert.equal(state.finish(token, chinese), true);
  assert.equal(state.get('zh'), chinese);
  assert.equal(state.isPending('zh'), false);
});

test('ignores a translation that finishes after the image is reset', () => {
  const state = createTranslationState();
  const token = state.start('zh');
  state.reset();

  assert.equal(state.finish(token, { summary: '旧结果' }), false);
  assert.equal(state.get('zh'), null);
});

test('clears only the matching failed request', () => {
  const state = createTranslationState();
  const token = state.start('zh');
  assert.equal(state.fail(token), true);
  assert.equal(state.isPending('zh'), false);
  assert.equal(state.fail(token), false);
});
