/* netlify/functions/sheets-proxy.js — proxy do Google Sheets (Netlify) */
const {
  GOOGLE_SHEETS_API_KEY, GOOGLE_SHEETS_ID,
  GOOGLE_SHEETS_NAME = 'Diário Performance', GOOGLE_SHEETS_RANGE = 'A1:Z200'
} = process.env;

exports.handler = async () => {
  try {
    if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEETS_ID)
      return { statusCode: 500, body: JSON.stringify({ error: 'Sheets não configurado' }) };
    const range = encodeURIComponent(`${GOOGLE_SHEETS_NAME}!${GOOGLE_SHEETS_RANGE}`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;
    const r = await fetch(url);
    const json = await r.json();
    if (json.error) throw new Error(json.error.message);
    console.log('[Sheets] ✓ ' + (json.values || []).length + ' linhas carregadas');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body: JSON.stringify({ values: json.values || [] })
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
