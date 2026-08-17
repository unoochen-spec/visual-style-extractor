const { normalizeAnalysis } = require('./normalize-analysis');

function createError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function promptFor(locale) {
  const language = locale === 'zh' ? 'Simplified Chinese' : 'English';
  return `You are a senior visual design analyst. Analyze the image without identifying people. Return only valid JSON in ${language}, using this exact object shape: {"summary":"string","palette":[{"hex":"#RRGGBB","role":"string"}],"composition":{"lightType":"string","tone":"string","framing":"string","composition":"string","depth":"string"},"textures":["string"],"tags":["string"],"prompt":"string"}. Include a concise visual summary, palette, composition and lighting, material texture, style tags, and a complete reusable image-generation prompt.`;
}

function parseModelJson(content) {
  const raw = String(content || '').trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : raw);
}

async function analyzeImageWithOllama({ buffer, mimeType, locale = 'en', signal, baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434', model = process.env.OLLAMA_MODEL || 'gemma3:4b', fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        messages: [{ role: 'user', content: promptFor(locale), images: [buffer.toString('base64')] }]
      })
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw createError('OLLAMA_UNAVAILABLE');
  }

  if (!response.ok) {
    if (response.status === 404) throw createError('OLLAMA_MODEL_MISSING');
    throw createError('OLLAMA_ANALYSIS_FAILED');
  }

  const value = await response.json();
  let parsed;
  try {
    parsed = parseModelJson(value.message && value.message.content);
  } catch {
    throw createError('INVALID_MODEL_OUTPUT');
  }
  return normalizeAnalysis(parsed, locale);
}

module.exports = { analyzeImageWithOllama, promptFor, parseModelJson };
