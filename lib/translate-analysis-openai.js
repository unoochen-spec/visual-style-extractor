const { normalizeAnalysis } = require('./normalize-analysis');
const { schema } = require('./analyze-image');

function invalidModelOutput() {
  const error = new Error('Invalid model output');
  error.code = 'INVALID_MODEL_OUTPUT';
  return error;
}

async function translateAnalysisWithOpenAI({
  openAI,
  analysis,
  locale = 'en',
  signal,
  model = process.env.OPENAI_MODEL || 'gpt-5.6-luna'
}) {
  const source = normalizeAnalysis(analysis, locale === 'zh' ? 'en' : 'zh');
  const language = locale === 'zh' ? 'Simplified Chinese' : 'English';
  const response = await openAI.responses.create({
    model,
    instructions: `Translate every human-readable string in the visual analysis into ${language}. Preserve the exact JSON structure, meaning, array order, and every HEX color value. Do not add, remove, or infer information.`,
    input: [{
      role: 'user',
      content: [{
        type: 'input_text',
        text: JSON.stringify(source)
      }]
    }],
    text: {
      format: {
        type: 'json_schema',
        name: 'translated_visual_style_analysis',
        strict: true,
        schema
      }
    }
  }, { signal });

  let translated;
  try {
    translated = normalizeAnalysis(JSON.parse(response.output_text), locale);
  } catch {
    throw invalidModelOutput();
  }

  translated.palette = translated.palette.map((item, index) => ({
    ...item,
    hex: source.palette[index] ? source.palette[index].hex : item.hex
  }));
  return translated;
}

module.exports = { translateAnalysisWithOpenAI };
