const test = require('node:test');
const assert = require('node:assert/strict');

const image = Buffer.from('visual-reference');
const modelReply = {
  message: {
    content: JSON.stringify({
      summary: 'Precise editorial system',
      palette: [{ hex: '#000000', role: 'Primary' }],
      composition: { lightType: 'Flat', tone: 'Neutral', framing: 'Wide', composition: 'Grid', depth: 'Flat' },
      textures: ['Paper'],
      tags: ['Editorial'],
      prompt: 'black and white editorial grid'
    })
  }
};

test('sends an uploaded image to the local Ollama vision model', async () => {
  const { analyzeImageWithOllama } = require('../lib/analyze-image-ollama');
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => modelReply };
  };

  const result = await analyzeImageWithOllama({
    buffer: image, mimeType: 'image/png', locale: 'en',
    baseUrl: 'http://127.0.0.1:11434', model: 'gemma3:4b', fetchImpl
  });

  assert.equal(request.url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(JSON.parse(request.options.body).model, 'gemma3:4b');
  assert.equal(JSON.parse(request.options.body).messages[0].images[0], image.toString('base64'));
  assert.equal(result.palette[0].hex, '#000000');
});

test('explains when the local Ollama service is unavailable', async () => {
  const { analyzeImageWithOllama } = require('../lib/analyze-image-ollama');
  await assert.rejects(
    () => analyzeImageWithOllama({ buffer: image, mimeType: 'image/png', fetchImpl: async () => { throw new TypeError('fetch failed'); } }),
    error => error.code === 'OLLAMA_UNAVAILABLE'
  );
});

test('explains when the selected local model has not been downloaded', async () => {
  const { analyzeImageWithOllama } = require('../lib/analyze-image-ollama');
  await assert.rejects(
    () => analyzeImageWithOllama({ buffer: image, mimeType: 'image/png', fetchImpl: async () => ({ ok: false, status: 404, json: async () => ({ error: 'model not found' }) }) }),
    error => error.code === 'OLLAMA_MODEL_MISSING'
  );
});

test('accepts a JSON response wrapped in a markdown code block', async () => {
  const { analyzeImageWithOllama } = require('../lib/analyze-image-ollama');
  const result = await analyzeImageWithOllama({
    buffer: image, mimeType: 'image/png',
    fetchImpl: async () => ({ ok: true, json: async () => ({ message: { content: `\`\`\`json\n${modelReply.message.content}\n\`\`\`` } }) })
  });
  assert.equal(result.summary, 'Precise editorial system');
});
