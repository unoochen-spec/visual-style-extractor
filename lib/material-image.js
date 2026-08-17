const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

function materialImageError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function validateMaterialUrl(value) {
  let url;
  try { url = new URL(value); }
  catch { throw materialImageError('MATERIAL_IMAGE_INVALID'); }
  if (url.protocol !== 'https:' || url.hostname !== 'images.unsplash.com' || url.username || url.password) {
    throw materialImageError('MATERIAL_IMAGE_INVALID');
  }
  return url;
}

async function readBoundedBody(response, maxBytes) {
  if (!response.body) throw materialImageError('MATERIAL_IMAGE_INVALID');
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw materialImageError('MATERIAL_IMAGE_TOO_LARGE');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw materialImageError('MATERIAL_IMAGE_TOO_LARGE');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function downloadMaterialImage({ url, fetchImpl = fetch, signal, maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const validated = validateMaterialUrl(url);
  let response;
  try { response = await fetchImpl(validated, { redirect: 'manual', signal }); }
  catch (error) {
    if (error.name === 'AbortError') throw error;
    throw materialImageError('MATERIAL_IMAGE_INVALID');
  }
  if (!response.ok || response.status >= 300) throw materialImageError('MATERIAL_IMAGE_INVALID');
  const mimeType = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png'].includes(mimeType)) throw materialImageError('MATERIAL_IMAGE_INVALID');
  const buffer = await readBoundedBody(response, maxBytes);
  return { buffer, mimeType, filename: `unsplash-material.${mimeType === 'image/png' ? 'png' : 'jpg'}` };
}

module.exports = { DEFAULT_MAX_BYTES, validateMaterialUrl, downloadMaterialImage };
