const sharp = require('sharp');
const { normalizeAnalysis } = require('./normalize-analysis');

const COPY = {
  tone: {
    warm: ['warm', '暖调'], cool: ['cool', '冷调'], neutral: ['neutral', '中性']
  },
  light: {
    soft: ['soft, low-contrast light', '柔和低对比光线'],
    hard: ['hard, high-contrast light', '硬朗高对比光线'],
    balanced: ['balanced natural light', '均衡自然光线']
  },
  framing: {
    wide: ['wide landscape framing', '横向宽幅画面'],
    portrait: ['vertical portrait framing', '纵向人像画面'],
    square: ['square framing', '方形画面'],
    standard: ['standard framing', '标准比例画面']
  },
  composition: {
    minimal: ['minimal composition with negative space', '留白充足的极简构图'],
    dynamic: ['dynamic asymmetrical composition', '动态非对称构图'],
    balanced: ['balanced grid composition', '均衡网格构图']
  },
  depth: {
    layered: ['layered visual depth', '有层次的视觉纵深'],
    flat: ['flat graphic depth', '扁平化视觉层次']
  },
  texture: {
    smooth: ['clean and smooth', '干净平滑'],
    grain: ['subtle grain', '细腻颗粒'],
    detailed: ['dense textured detail', '丰富细节肌理'],
    matte: ['muted matte color', '低饱和哑光色彩'],
    vivid: ['vivid color surface', '鲜明色彩表面']
  },
  tag: {
    minimal: ['Minimal', '极简'],
    editorial: ['Editorial', '编辑风格'],
    dynamic: ['Dynamic', '动态感'],
    monochrome: ['Monochrome', '单色'],
    vivid: ['Vivid color', '鲜明色彩'],
    muted: ['Muted color', '低饱和'],
    warm: ['Warm mood', '暖调氛围'],
    cool: ['Cool mood', '冷调氛围'],
    neutral: ['Neutral mood', '中性氛围']
  },
  role: {
    primary: ['Primary', '主色'], secondary: ['Secondary', '辅助色'],
    accent: ['Accent', '点缀色'], highlight: ['Highlight', '高光色'],
    shadow: ['Shadow', '暗部色']
  }
};

function word(group, key, locale) {
  return COPY[group][key][locale === 'zh' ? 1 : 0];
}

function keyFor(group, value, fallback) {
  const normalized = String(value || '').toLocaleLowerCase();
  return Object.keys(COPY[group]).find(key => COPY[group][key].some(label => label.toLocaleLowerCase() === normalized)) || fallback;
}

function rgbHex(red, green, blue) {
  return `#${[red, green, blue].map(value => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function paletteFromPixels(data, channels) {
  const buckets = new Map();
  for (let offset = 0; offset < data.length; offset += channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const key = `${Math.min(7, Math.floor(red / 32))},${Math.min(7, Math.floor(green / 32))},${Math.min(7, Math.floor(blue / 32))}`;
    const bucket = buckets.get(key) || { red: 0, green: 0, blue: 0, count: 0 };
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.values()]
    .sort((left, right) => right.count - left.count || (left.red + left.green + left.blue) - (right.red + right.green + right.blue))
    .slice(0, 5)
    .map(bucket => rgbHex(bucket.red / bucket.count, bucket.green / bucket.count, bucket.blue / bucket.count));
}

function measurePixels(data, width, height, channels) {
  let luminanceTotal = 0;
  let luminanceSquareTotal = 0;
  let saturationTotal = 0;
  let warmthTotal = 0;
  let edgeTotal = 0;
  let edgeCount = 0;
  const count = width * height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      const maximum = Math.max(red, green, blue);
      const minimum = Math.min(red, green, blue);
      luminanceTotal += luminance;
      luminanceSquareTotal += luminance * luminance;
      saturationTotal += maximum === 0 ? 0 : (maximum - minimum) / maximum;
      warmthTotal += red - blue;
      if (x > 0) {
        const previous = offset - channels;
        edgeTotal += (Math.abs(red - data[previous]) + Math.abs(green - data[previous + 1]) + Math.abs(blue - data[previous + 2])) / 3;
        edgeCount += 1;
      }
      if (y > 0) {
        const previous = offset - width * channels;
        edgeTotal += (Math.abs(red - data[previous]) + Math.abs(green - data[previous + 1]) + Math.abs(blue - data[previous + 2])) / 3;
        edgeCount += 1;
      }
    }
  }
  const luminance = luminanceTotal / count;
  return {
    contrast: Math.sqrt(Math.max(0, luminanceSquareTotal / count - luminance * luminance)),
    saturation: saturationTotal / count,
    warmth: warmthTotal / count,
    edge: edgeCount ? edgeTotal / edgeCount : 0
  };
}

function featureKeys(metrics, width, height) {
  const ratio = width / height;
  return {
    tone: metrics.warmth > 8 ? 'warm' : metrics.warmth < -8 ? 'cool' : 'neutral',
    light: metrics.contrast < 40 ? 'soft' : metrics.contrast > 75 ? 'hard' : 'balanced',
    framing: ratio > 1.3 ? 'wide' : ratio < 0.77 ? 'portrait' : Math.abs(ratio - 1) < 0.08 ? 'square' : 'standard',
    composition: metrics.edge < 12 ? 'minimal' : metrics.edge > 38 ? 'dynamic' : 'balanced',
    depth: metrics.contrast > 55 && metrics.edge > 20 ? 'layered' : 'flat',
    textures: [metrics.edge < 12 ? 'smooth' : metrics.edge > 38 ? 'detailed' : 'grain', metrics.saturation < 0.18 ? 'matte' : 'vivid'],
    tags: [metrics.edge < 12 ? 'minimal' : metrics.edge > 38 ? 'dynamic' : 'editorial', metrics.saturation < 0.12 ? 'monochrome' : metrics.saturation > 0.45 ? 'vivid' : 'muted']
  };
}

function reportFromFeatures(palette, features, locale) {
  const roleKeys = ['primary', 'secondary', 'accent', 'highlight', 'shadow'];
  const tone = word('tone', features.tone, locale);
  const light = word('light', features.light, locale);
  const composition = word('composition', features.composition, locale);
  const framing = word('framing', features.framing, locale);
  const depth = word('depth', features.depth, locale);
  const textures = features.textures.map(key => word('texture', key, locale));
  const tagKeys = [...new Set([...features.tags, features.tone])];
  const tags = tagKeys.map(key => word('tag', key, locale));
  const colors = palette.join(', ');
  const summary = locale === 'zh'
    ? `画面以${tone}配色和${light}为主，采用${composition}与${framing}，整体呈现${depth}和${textures.join('、')}的视觉质感。`
    : `A ${tone} palette with ${light}, using ${composition} and ${framing}. The image has ${depth} with ${textures.join(' and ')} texture.`;
  const prompt = locale === 'zh'
    ? `${tone}视觉风格，${composition}，${framing}，${light}，${depth}，${textures.join('，')}，主色板 ${colors}，干净专业的画面，高质量细节。`
    : `${tone} visual style, ${composition}, ${framing}, ${light}, ${depth}, ${textures.join(', ')}, color palette ${colors}, clean professional image, high-quality detail.`;
  return normalizeAnalysis({
    summary,
    palette: palette.map((hex, index) => ({ hex, role: word('role', roleKeys[index] || 'accent', locale) })),
    composition: { lightType: light, tone, framing, composition, depth },
    textures,
    tags,
    prompt
  }, locale);
}

async function analyzeImageLocally({ buffer, locale = 'en' }) {
  let processed;
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 64, height: 64, fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    const error = new Error('Invalid image');
    error.code = 'INVALID_FILE';
    throw error;
  }
  const { data, info } = processed;
  const palette = paletteFromPixels(data, info.channels);
  const features = featureKeys(measurePixels(data, info.width, info.height, info.channels), info.width, info.height);
  return reportFromFeatures(palette, features, locale);
}

async function translateAnalysisLocally({ analysis, locale = 'en' }) {
  const source = normalizeAnalysis(analysis, locale === 'zh' ? 'en' : 'zh');
  const composition = source.composition;
  const features = {
    tone: keyFor('tone', composition.tone, 'neutral'),
    light: keyFor('light', composition.lightType, 'balanced'),
    framing: keyFor('framing', composition.framing, 'standard'),
    composition: keyFor('composition', composition.composition, 'balanced'),
    depth: keyFor('depth', composition.depth, 'flat'),
    textures: source.textures.map(value => keyFor('texture', value, 'grain')),
    tags: source.tags.map(value => keyFor('tag', value, 'editorial')).filter(key => !['warm', 'cool', 'neutral'].includes(key))
  };
  return reportFromFeatures(source.palette.map(item => item.hex), features, locale);
}

module.exports = { analyzeImageLocally, translateAnalysisLocally };
