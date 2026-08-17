const test = require('node:test');
const assert = require('node:assert/strict');

const english = {
  summary: 'Calm editorial composition',
  palette: [{ hex: '#112233', role: 'Primary dark' }, { hex: '#F4F4F4', role: 'Paper white' }],
  composition: { lightType: 'Soft light', tone: 'Neutral', framing: 'Wide', composition: 'Strict grid', depth: 'Flat' },
  textures: ['Matte paper'],
  tags: ['Editorial', 'Minimal'],
  prompt: 'A calm editorial image with a strict grid'
};

const chineseReply = {
  message: {
    content: JSON.stringify({
      summary: '冷静的编辑式构图',
      palette: [{ hex: '#FFFFFF', role: '主深色' }, { hex: '#000000', role: '纸张白' }],
      composition: { lightType: '柔光', tone: '中性', framing: '广角', composition: '严格网格', depth: '平面' },
      textures: ['哑光纸张'],
      tags: ['编辑风', '极简'],
      prompt: '冷静的编辑风图像，采用严格网格'
    })
  }
};

test('translates structured analysis locally while preserving every original HEX value', async () => {
  const { translateAnalysisWithOllama } = require('../lib/translate-analysis-ollama');
  let request;
  const result = await translateAnalysisWithOllama({
    analysis: english,
    locale: 'zh',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'gemma3:4b',
    fetchImpl: async (url, options) => { request = { url, options }; return { ok: true, json: async () => chineseReply }; }
  });

  const body = JSON.parse(request.options.body);
  assert.equal(request.url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(body.messages[0].images, undefined);
  assert.match(body.messages[0].content, /Simplified Chinese/);
  assert.equal(result.summary, '冷静的编辑式构图');
  assert.deepEqual(result.palette.map(item => item.hex), ['#112233', '#F4F4F4']);
  assert.equal(result.palette[0].role, '主深色');
  assert.equal(result.composition.composition, '严格网格');
  assert.deepEqual(result.tags, ['编辑风', '极简']);
  assert.equal(result.prompt, '冷静的编辑风图像，采用严格网格');
});

test('targets English and rejects invalid model JSON', async () => {
  const { translationPrompt, translateAnalysisWithOllama } = require('../lib/translate-analysis-ollama');
  assert.match(translationPrompt(english, 'en'), /English/);
  await assert.rejects(
    () => translateAnalysisWithOllama({ analysis: english, locale: 'en', fetchImpl: async () => ({ ok: true, json: async () => ({ message: { content: 'not-json' } }) }) }),
    error => error.code === 'INVALID_MODEL_OUTPUT'
  );
});

test('retries once when the model leaves palette role labels untranslated', async () => {
  const { translateAnalysisWithOllama } = require('../lib/translate-analysis-ollama');
  let calls = 0;
  const untranslated = {
    ...chineseReply,
    message: { content: JSON.stringify({ ...JSON.parse(chineseReply.message.content), palette: english.palette }) }
  };
  const result = await translateAnalysisWithOllama({
    analysis: english,
    locale: 'zh',
    fetchImpl: async () => ({ ok: true, json: async () => (++calls === 1 ? untranslated : chineseReply) })
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.palette.map(item => item.role), ['主深色', '纸张白']);
});
