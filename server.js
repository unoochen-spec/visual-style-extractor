const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const Busboy = require('busboy');
const dotenv = require('dotenv');
const { loadEnvironment } = require('./lib/load-environment');
const { createAnalysisProvider } = require('./lib/analysis-provider');
const { buildMaterialQuery, searchMaterials } = require('./lib/materials-service');
const { downloadMaterialImage } = require('./lib/material-image');

loadEnvironment(dotenv, __dirname);

const ROOT = path.join(__dirname, 'visual-extractor');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

function serve(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname;
  const target = path.normalize(path.join(ROOT, requestPath));
  if (!target.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(target, (error, data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(target)] || 'application/octet-stream' });
    res.end(data);
  });
}

function parseUpload(req) {
  return new Promise((resolve, reject) => {
    let fileBuffer = null, mimeType = '', locale = 'en', tooLarge = false;
    const chunks = [];
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 10 * 1024 * 1024, fields: 2 } });
    busboy.on('field', (name, value) => { if (name === 'locale') locale = value === 'zh' ? 'zh' : 'en'; });
    busboy.on('file', (_, stream, info) => {
      mimeType = info.mimeType;
      stream.on('limit', () => { tooLarge = true; });
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });
    busboy.on('error', reject);
    busboy.on('finish', () => {
      if (tooLarge) return reject(Object.assign(new Error(), { code: 'FILE_TOO_LARGE' }));
      if (!fileBuffer || !['image/jpeg', 'image/png'].includes(mimeType)) return reject(Object.assign(new Error(), { code: 'INVALID_FILE' }));
      resolve({ buffer: fileBuffer, mimeType, locale });
    });
    req.pipe(busboy);
  });
}

function parseJsonBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error(), { code: 'INVALID_REQUEST' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error(), { code: 'INVALID_REQUEST' })); }
    });
    req.on('error', reject);
  });
}

function createServer(options = {}) {
  const provider = createAnalysisProvider();
  const analyze = options.analyze || provider.analyze;
  const translate = options.translate || provider.translate;
  const search = options.search || searchMaterials;
  const downloadImage = options.downloadImage || downloadMaterialImage;
  return http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/analyze') {
      try {
        const upload = await parseUpload(req);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120000);
        try { return json(res, 200, await analyze({ ...upload, signal: controller.signal })); }
        finally { clearTimeout(timer); }
      } catch (error) {
        const code = error.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : error.code || 'ANALYSIS_FAILED';
        const status = code === 'INVALID_FILE' ? 400 : code === 'FILE_TOO_LARGE' ? 413 : ['OLLAMA_UNAVAILABLE', 'OLLAMA_MODEL_MISSING', 'OPENAI_NOT_CONFIGURED'].includes(code) ? 503 : code === 'UPSTREAM_TIMEOUT' ? 504 : 502;
        return json(res, status, { error: code });
      }
    }
    if (req.method === 'POST' && req.url === '/api/translate-analysis') {
      try {
        const body = await parseJsonBody(req);
        if (!body.analysis || typeof body.analysis !== 'object' || !['en', 'zh'].includes(body.locale)) {
          return json(res, 400, { error: 'INVALID_REQUEST' });
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        try {
          return json(res, 200, await translate({ analysis: body.analysis, locale: body.locale, signal: controller.signal }));
        } finally { clearTimeout(timer); }
      } catch (error) {
        const code = error.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : error.code || 'TRANSLATION_FAILED';
        const status = code === 'INVALID_REQUEST' ? 400 : ['OLLAMA_UNAVAILABLE', 'OLLAMA_MODEL_MISSING', 'OPENAI_NOT_CONFIGURED'].includes(code) ? 503 : code === 'UPSTREAM_TIMEOUT' ? 504 : 502;
        return json(res, status, { error: code });
      }
    }
    if (req.method === 'POST' && req.url === '/api/materials') {
      try {
        const body = await parseJsonBody(req);
        if (!body.analysis || typeof body.analysis !== 'object') return json(res, 400, { error: 'INVALID_REQUEST' });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
          const result = await search({
            query: buildMaterialQuery(body.analysis),
            page: Math.max(1, Number(body.page) || 1),
            accessKey: process.env.UNSPLASH_ACCESS_KEY,
            signal: controller.signal
          });
          return json(res, 200, result);
        } finally { clearTimeout(timer); }
      } catch (error) {
        return json(res, error.code === 'INVALID_REQUEST' ? 400 : 503, { error: error.code || 'MATERIALS_UNAVAILABLE' });
      }
    }
    if (req.method === 'POST' && req.url === '/api/material-image') {
      try {
        const body = await parseJsonBody(req);
        if (typeof body.imageUrl !== 'string') return json(res, 400, { error: 'INVALID_REQUEST' });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const image = await downloadImage({ url: body.imageUrl, signal: controller.signal });
          res.writeHead(200, {
            'content-type': image.mimeType,
            'content-length': image.buffer.length,
            'content-disposition': `inline; filename="${image.filename}"`,
            'cache-control': 'private, max-age=300'
          });
          return res.end(image.buffer);
        } finally { clearTimeout(timer); }
      } catch (error) {
        const code = error.name === 'AbortError' ? 'MATERIAL_IMAGE_INVALID' : error.code || 'MATERIAL_IMAGE_INVALID';
        return json(res, code === 'MATERIAL_IMAGE_TOO_LARGE' ? 413 : 400, { error: code });
      }
    }
    if (req.method === 'GET') return serve(req, res);
    res.writeHead(405); res.end();
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 4173;
  createServer().listen(port, () => console.log(`Visual Style Extractor: http://localhost:${port}`));
}

module.exports = { createServer, parseUpload, parseJsonBody };
