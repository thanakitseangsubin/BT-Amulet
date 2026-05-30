// Bantae Amulet — secure database proxy.
// The JSONBin master key and admin password live ONLY in Netlify environment
// variables (Site settings → Environment variables), never in the website source.
//
//   GET  /.netlify/functions/db   → public read of the catalog (no key exposed)
//   POST /.netlify/functions/db   → { password } login check, returns 200 or 401
//   PUT  /.netlify/functions/db   → admin write; requires header X-Admin-Password

const JB_URL = 'https://api.jsonbin.io/v3/b/69fb4a1036566621a830dc9b';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Constant-time-ish string compare to avoid trivial timing leaks.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

exports.handler = async (event) => {
  const KEY = process.env.JSONBIN_KEY;
  const ADMIN_PW = process.env.ADMIN_PASSWORD;

  if (!KEY || !ADMIN_PW) {
    return { statusCode: 500, headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Server not configured: set JSONBIN_KEY and ADMIN_PASSWORD env vars.' }) };
  }

  // ── Public read ────────────────────────────────────────────────
  if (event.httpMethod === 'GET') {
    try {
      const r = await fetch(JB_URL + '/latest', {
        headers: { 'X-Master-Key': KEY, 'X-Bin-Meta': 'false' },
      });
      const body = await r.text();
      return { statusCode: r.status, headers: JSON_HEADERS, body };
    } catch (e) {
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ── Login check ────────────────────────────────────────────────
  if (event.httpMethod === 'POST') {
    let pw = '';
    try { pw = JSON.parse(event.body || '{}').password || ''; } catch (e) {}
    const ok = safeEqual(pw, ADMIN_PW);
    return { statusCode: ok ? 200 : 401, headers: JSON_HEADERS, body: JSON.stringify({ ok }) };
  }

  // ── Admin write ────────────────────────────────────────────────
  if (event.httpMethod === 'PUT') {
    const pw = event.headers['x-admin-password'] || '';
    if (!safeEqual(pw, ADMIN_PW)) {
      return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: 'unauthorized' }) };
    }
    try {
      const r = await fetch(JB_URL, {
        method: 'PUT',
        headers: { 'X-Master-Key': KEY, 'Content-Type': 'application/json' },
        body: event.body,
      });
      const body = await r.text();
      return { statusCode: r.status, headers: JSON_HEADERS, body };
    } catch (e) {
      return { statusCode: 502, headers: JSON_HEADERS, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: 'method not allowed' }) };
};
