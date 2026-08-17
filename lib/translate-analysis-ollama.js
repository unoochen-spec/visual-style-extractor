const { normalizeAnalysis } = require('./normalize-analysis');
const { parseModelJson } = require('./analyze-image-ollama');

function createError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function translationPrompt(analysis, locale, correction = false) {
  const language = locale === 'zh' ? 'Simplified Chinese' : 'English';
  return `Translate every human-readable string in the following visual analysis into ${language}. You must translate summary, every palette[].role label, every composition value, every textures[] item, every tags[] item, and prompt. Preserve the exact JSON structure, meaning, array order, and every HEX color value. Do not add, remove, or infer information. Return JSON only.${correction ? ' The previous attempt left palette role labels untranslated; translate those labels too.' : ''}\n${JSON.stringify(analysis)}`;
}

async function translateAnalysisWithOllama({
  analysis,
  locale = 'en',
  signal,
  baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434',
  model = process.env.OLLAMA_MODEL || 'gemma3:4b',
  fetchImpl = fetch
}) {
  const source = normalizeAnalysis(analysis, locale === 'zh' ? 'en' : 'zh');
  async function request(correction){
    let response;
    try {
      response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal,
        body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: translationPrompt(source, locale, correction) }] })
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw createError('OLLAMA_UNAVAILABLE');
    }
    if (!response.ok) {
      if (response.status === 404) throw createError('OLLAMA_MODEL_MISSING');
      throw createError('OLLAMA_TRANSLATION_FAILED');
    }
    const value = await response.json();
    try { return normalizeAnalysis(parseModelJson(value.message && value.message.content), locale); }
    catch { throw createError('INVALID_MODEL_OUTPUT'); }
  }

  let translated = await request(false);
  const hasUntranslatedRole = translated.palette.some((item, index) => source.palette[index] && item.role.toLocaleLowerCase() === source.palette[index].role.toLocaleLowerCase());
  if (hasUntranslatedRole) translated = await request(true);

  translated.palette = translated.palette.map((item, index) => ({
    ...item,
    hex: source.palette[index] ? source.palette[index].hex : item.hex
  }));
  return translated;
}

module.exports = { translateAnalysisWithOllama, translationPrompt };
