const test = require('node:test');
const assert = require('node:assert/strict');

test('derives every workspace phase and prioritizes active analysis', () => {
  const { getWorkspaceState } = require('../visual-extractor/ui-state');

  assert.equal(getWorkspaceState({}), 'empty');
  assert.equal(getWorkspaceState({ hasFile: true }), 'selected');
  assert.equal(getWorkspaceState({ hasFile: true, hasError: true }), 'error');
  assert.equal(getWorkspaceState({ hasFile: true, hasAnalysis: true }), 'complete');
  assert.equal(getWorkspaceState({ hasFile: true, hasAnalysis: true, isAnalyzing: true }), 'analyzing');
});

test('renders six non-interactive material skeletons by default', () => {
  const { renderFeedSkeletons } = require('../visual-extractor/ui-state');
  const html = renderFeedSkeletons();

  assert.match(html, /^<div class="feed-skeletons" aria-hidden="true">/);
  assert.equal((html.match(/data-skeleton-card/g) || []).length, 6);
  assert.equal((html.match(/class="skeleton-image"/g) || []).length, 6);
  assert.equal((html.match(/class="skeleton-line skeleton-title"/g) || []).length, 6);
  assert.doesNotMatch(html, /<button|<a /);
});

test('renders the requested number of skeleton cards for deterministic layouts', () => {
  const { renderFeedSkeletons } = require('../visual-extractor/ui-state');
  const html = renderFeedSkeletons(3);

  assert.equal((html.match(/data-skeleton-card/g) || []).length, 3);
});

test('keeps fast pagination skeletons visible for the minimum duration', () => {
  const { getRemainingLoadingMs } = require('../visual-extractor/ui-state');

  assert.equal(getRemainingLoadingMs({ startedAt: 1000, now: 1180, minimumMs: 600 }), 420);
  assert.equal(getRemainingLoadingMs({ startedAt: 1000, now: 1700, minimumMs: 600 }), 0);
});
