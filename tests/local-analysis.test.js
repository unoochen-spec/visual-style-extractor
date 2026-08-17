const test = require('node:test');
const assert = require('node:assert/strict');

async function createSplitImage() {
  const sharp = require('sharp');
  const width = 8;
  const height = 4;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = x < width / 2 ? 0 : 255;
      const offset = (y * width + x) * 3;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

test('extracts a real palette and complete style report from image pixels', async () => {
  const { analyzeImageLocally } = require('../lib/analyze-image-local');
  const analysis = await analyzeImageLocally({
    buffer: await createSplitImage(),
    mimeType: 'image/png',
    locale: 'en'
  });

  assert.ok(analysis.palette.some(item => item.hex === '#000000'));
  assert.ok(analysis.palette.some(item => item.hex === '#FFFFFF'));
  assert.ok(analysis.summary.length > 20);
  assert.ok(analysis.composition.lightType);
  assert.ok(analysis.textures.length > 0);
  assert.ok(analysis.tags.length > 0);
  assert.ok(analysis.prompt.includes('#000000'));
});

test('regenerates a local analysis in Chinese while preserving HEX values', async () => {
  const { analyzeImageLocally, translateAnalysisLocally } = require('../lib/analyze-image-local');
  const english = await analyzeImageLocally({
    buffer: await createSplitImage(),
    mimeType: 'image/png',
    locale: 'en'
  });
  const chinese = await translateAnalysisLocally({ analysis: english, locale: 'zh' });

  assert.deepEqual(chinese.palette.map(item => item.hex), english.palette.map(item => item.hex));
  assert.match(chinese.summary, /[\u4e00-\u9fff]/);
  assert.match(chinese.prompt, /[\u4e00-\u9fff]/);
  assert.ok(chinese.palette.every(item => /[\u4e00-\u9fff]/.test(item.role)));
});
