const test = require('node:test');
const assert = require('node:assert/strict');

test('default feed provides twelve independent real-image material cards', () => {
  const { getFallbackMaterials } = require('../visual-extractor/recommendations');
  const cards = getFallbackMaterials();
  assert.equal(cards.length, 12);
  assert.equal(new Set(cards.map(card => card.id)).size, 12);
  cards.forEach(card => {
    assert.match(card.imageUrl, /^https:\/\/images\.unsplash\.com\//);
    assert.ok(card.width > 0 && card.height > 0);
    assert.ok(card.title && card.sourceUrl && Array.isArray(card.tags));
  });
});

test('merging another material page appends new cards and removes duplicate IDs', () => {
  const { mergeMaterials } = require('../visual-extractor/recommendations');
  const result = mergeMaterials(
    [{ id: 'a', title: 'First' }, { id: 'b', title: 'Second' }],
    [{ id: 'b', title: 'Duplicate' }, { id: 'c', title: 'Third' }]
  );
  assert.deepEqual(result.map(card => card.id), ['a', 'b', 'c']);
  assert.equal(result[1].title, 'Second');
});
