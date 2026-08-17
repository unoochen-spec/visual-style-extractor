const test = require('node:test');
const assert = require('node:assert/strict');

test('uses the local Ollama services by default', () => {
  const { createAnalysisProvider } = require('../lib/analysis-provider');
  const analyzeWithOllama = async () => 'local-analysis';
  const translateWithOllama = async () => 'local-translation';

  const provider = createAnalysisProvider({
    env: {},
    analyzeWithOllama,
    translateWithOllama
  });

  assert.equal(provider.name, 'ollama');
  assert.equal(provider.analyze, analyzeWithOllama);
  assert.equal(provider.translate, translateWithOllama);
});

test('uses one OpenAI client for cloud analysis and translation', async () => {
  const { createAnalysisProvider } = require('../lib/analysis-provider');
  const openAI = { client: 'fake' };
  const calls = [];
  const provider = createAnalysisProvider({
    env: {
      AI_PROVIDER: 'openai',
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-test'
    },
    createOpenAI: () => openAI,
    analyzeWithOpenAI: async input => { calls.push(['analyze', input]); return 'cloud-analysis'; },
    translateWithOpenAI: async input => { calls.push(['translate', input]); return 'cloud-translation'; }
  });

  assert.equal(provider.name, 'openai');
  assert.equal(await provider.analyze({ buffer: Buffer.from('image') }), 'cloud-analysis');
  assert.equal(await provider.translate({ analysis: {} }), 'cloud-translation');
  assert.equal(calls[0][1].openAI, openAI);
  assert.equal(calls[1][1].openAI, openAI);
  assert.equal(calls[0][1].model, 'gpt-test');
  assert.equal(calls[1][1].model, 'gpt-test');
});

test('reports unavailable service when OpenAI mode has no API key', async () => {
  const { createAnalysisProvider } = require('../lib/analysis-provider');
  const provider = createAnalysisProvider({ env: { AI_PROVIDER: 'openai' } });

  await assert.rejects(provider.analyze({}), error => error.code === 'OPENAI_NOT_CONFIGURED');
  await assert.rejects(provider.translate({}), error => error.code === 'OPENAI_NOT_CONFIGURED');
});
