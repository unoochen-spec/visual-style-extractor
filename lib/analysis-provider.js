const OpenAI = require('openai');
const { analyzeImage } = require('./analyze-image');
const { analyzeImageLocally, translateAnalysisLocally } = require('./analyze-image-local');
const { analyzeImageWithOllama } = require('./analyze-image-ollama');
const { translateAnalysisWithOpenAI } = require('./translate-analysis-openai');
const { translateAnalysisWithOllama } = require('./translate-analysis-ollama');

function configurationError() {
  const error = new Error('OPENAI_NOT_CONFIGURED');
  error.code = 'OPENAI_NOT_CONFIGURED';
  return error;
}

function createAnalysisProvider({
  env = process.env,
  createOpenAI = options => new OpenAI(options),
  analyzeWithOpenAI = analyzeImage,
  translateWithOpenAI = translateAnalysisWithOpenAI,
  analyzeLocally = analyzeImageLocally,
  translateLocally = translateAnalysisLocally,
  analyzeWithOllama = analyzeImageWithOllama,
  translateWithOllama = translateAnalysisWithOllama
} = {}) {
  if (env.AI_PROVIDER === 'local') {
    return { name: 'local', analyze: analyzeLocally, translate: translateLocally };
  }
  if (env.AI_PROVIDER !== 'openai') {
    return {
      name: 'ollama',
      analyze: analyzeWithOllama,
      translate: translateWithOllama
    };
  }

  if (!env.OPENAI_API_KEY) {
    const unavailable = async () => { throw configurationError(); };
    return { name: 'openai', analyze: unavailable, translate: unavailable };
  }

  const openAI = createOpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL || 'gpt-5.6-luna';
  const withFallback = (cloudOperation, localOperation) => async options => {
    try {
      return await cloudOperation({ ...options, openAI, model });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      return localOperation(options);
    }
  };
  return {
    name: 'openai',
    analyze: withFallback(analyzeWithOpenAI, analyzeLocally),
    translate: withFallback(translateWithOpenAI, translateLocally)
  };
}

module.exports = { createAnalysisProvider };
