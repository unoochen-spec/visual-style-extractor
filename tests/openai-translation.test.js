const test = require('node:test');
const assert = require('node:assert/strict');

const source = {
  summary: 'Calm editorial layout',
  palette: [
    { hex: '#112233', role: 'Primary' },
    { hex: '#AABBCC', role: 'Surface' }
  ],
  composition: {
    lightType: 'Soft light',
    tone: 'Neutral',
    framing: 'Wide',
    composition: 'Editorial grid',
    depth: 'Flat'
  },
  textures: ['Paper'],
  tags: ['Editorial'],
  prompt: 'Editorial grid image'
};

test('translates every analysis string to Chinese and preserves source HEX values', async () => {
  const { translateAnalysisWithOpenAI } = require('../lib/translate-analysis-openai');
  let request;
  const openAI = {
    responses: {
      create: async input => {
        request = input;
        return {
          output_text: JSON.stringify({
            summary: '冷静的编辑式布局',
            palette: [
              { hex: '#FFFFFF', role: '主色' },
              { hex: '#000000', role: '表面色' }
            ],
            composition: {
              lightType: '柔光',
              tone: '中性',
              framing: '广角',
              composition: '编辑式网格',
              depth: '平面'
            },
            textures: ['纸张'],
            tags: ['编辑风格'],
            prompt: '编辑式网格图像'
          })
        };
      }
    }
  };

  const translated = await translateAnalysisWithOpenAI({
    openAI,
    analysis: source,
    locale: 'zh',
    model: 'gpt-test'
  });

  assert.equal(translated.summary, '冷静的编辑式布局');
  assert.deepEqual(translated.palette.map(item => item.hex), ['#112233', '#AABBCC']);
  assert.deepEqual(translated.palette.map(item => item.role), ['主色', '表面色']);
  assert.equal(request.model, 'gpt-test');
  assert.match(request.instructions, /Simplified Chinese/);
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
});

test('rejects invalid OpenAI translation output', async () => {
  const { translateAnalysisWithOpenAI } = require('../lib/translate-analysis-openai');
  const openAI = { responses: { create: async () => ({ output_text: 'not-json' }) } };

  await assert.rejects(
    translateAnalysisWithOpenAI({ openAI, analysis: source, locale: 'en' }),
    error => error.code === 'INVALID_MODEL_OUTPUT'
  );
});
