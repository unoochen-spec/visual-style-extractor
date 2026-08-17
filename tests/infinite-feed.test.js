const test = require('node:test');
const assert = require('node:assert/strict');

test('locks concurrent page loads and advances after success', () => {
  const { createInfiniteFeedState } = require('../visual-extractor/infinite-feed');
  const feed = createInfiniteFeedState({ page: 1, totalPages: 4 });
  assert.equal(feed.start(), true);
  assert.equal(feed.start(), false);
  assert.deepEqual(feed.snapshot(), { status: 'loading', page: 1, totalPages: 4, canLoad: false });
  feed.success({ page: 2, totalPages: 4 });
  assert.deepEqual(feed.snapshot(), { status: 'idle', page: 2, totalPages: 4, canLoad: true });
});

test('reports end state on the final page and blocks further loads', () => {
  const { createInfiniteFeedState } = require('../visual-extractor/infinite-feed');
  const feed = createInfiniteFeedState({ page: 1, totalPages: 2 });
  feed.start();
  feed.success({ page: 2, totalPages: 2 });
  assert.deepEqual(feed.snapshot(), { status: 'end', page: 2, totalPages: 2, canLoad: false });
  assert.equal(feed.start(), false);
});

test('exposes retry after failure without losing the current page', () => {
  const { createInfiniteFeedState } = require('../visual-extractor/infinite-feed');
  const feed = createInfiniteFeedState({ page: 3, totalPages: 5 });
  feed.start();
  feed.fail();
  assert.deepEqual(feed.snapshot(), { status: 'error', page: 3, totalPages: 5, canLoad: false });
  assert.equal(feed.retry(), true);
  assert.deepEqual(feed.snapshot(), { status: 'idle', page: 3, totalPages: 5, canLoad: true });
});

test('reset starts a new pagination lifecycle', () => {
  const { createInfiniteFeedState } = require('../visual-extractor/infinite-feed');
  const feed = createInfiniteFeedState({ page: 3, totalPages: 3 });
  feed.reset({ page: 1, totalPages: 8 });
  assert.deepEqual(feed.snapshot(), { status: 'idle', page: 1, totalPages: 8, canLoad: true });
});
