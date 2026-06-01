// Bantae Amulet — LINE Messaging API order notification.
// Sends a push message to the owner (LINE_OWNER_ID) when a customer submits
// the buy form. Credentials live in Netlify environment variables only.
//
//   POST /.netlify/functions/notify  { message: "..." }

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'method not allowed' }) };
  }

  const TOKEN = process.env.LINE_CHANNEL_TOKEN;
  const OWNER = process.env.LINE_OWNER_ID;

  if (!TOKEN || !OWNER) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'LINE not configured — set LINE_CHANNEL_TOKEN and LINE_OWNER_ID in Netlify env vars.' }),
    };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'invalid JSON' }) };
  }

  const msg = (body.message || '').trim();
  if (!msg) {
    return { statusCode: 400, body: JSON.stringify({ error: 'message is empty' }) };
  }

  try {
    const r = await fetch(LINE_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN,
      },
      body: JSON.stringify({
        to: OWNER,
        messages: [{ type: 'text', text: msg }],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('LINE API error:', r.status, txt);
      return { statusCode: r.status, body: JSON.stringify({ error: txt }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error('LINE push exception:', e);
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
