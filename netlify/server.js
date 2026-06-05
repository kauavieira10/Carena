/* server.js — Proxy backend em Node puro (sem Express) para o Render.
 * - Serve os arquivos estáticos do projeto.
 * - /api/sheets         -> Google Sheets API (cache 5 min). Frontend nunca chama o Google direto.
 * - /api/meta-creatives -> Meta Marketing API (2 chamadas paralelas + cascata de thumbnail). */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const {
  GOOGLE_SHEETS_API_KEY, GOOGLE_SHEETS_ID,
  GOOGLE_SHEETS_NAME = 'Diário Performance', GOOGLE_SHEETS_RANGE = 'A1:Z200',
  META_ACCESS_TOKEN, META_AD_ACCOUNT_ID
} = process.env;

const MIME = { '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon' };

/* GET JSON via HTTPS */
function getJSON(url){
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

/* ---------- cache simples (5 min) ---------- */
const cache = new Map();
const TTL = 5 * 60 * 1000;
function cached(key){ const e = cache.get(key); return (e && Date.now()-e.t < TTL) ? e.v : null; }
function setCache(key, v){ cache.set(key, { t: Date.now(), v }); }

/* ---------- /api/sheets ---------- */
async function getSheets(){
  const hit = cached('sheets'); if (hit) return hit;
  if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEETS_ID) throw new Error('Sheets não configurado');
  const range = encodeURIComponent(`${GOOGLE_SHEETS_NAME}!${GOOGLE_SHEETS_RANGE}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;
  const json = await getJSON(url);
  if (json.error) throw new Error(json.error.message || 'erro Sheets');
  const out = { values: json.values || [] };
  console.log('[Sheets] ✓ ' + out.values.length + ' linhas carregadas');
  setCache('sheets', out);
  return out;
}

/* ---------- /api/meta-creatives ---------- */
const CONV_TYPES = ['lead','purchase','complete_registration','offsite_conversion','submit_application'];
function countConversions(actions){
  if (!Array.isArray(actions)) return 0;
  return actions.reduce((s,a) => CONV_TYPES.some(t => (a.action_type||'').includes(t)) ? s + Number(a.value||0) : s, 0);
}
/* cascata de prioridade p/ thumbnail */
function pickThumb(cr){
  if (!cr) return '';
  const afs = cr.asset_feed_spec;
  if (afs && afs.images && afs.images[0] && afs.images[0].url) return afs.images[0].url;
  const oss = cr.object_story_spec;
  if (oss){
    const ld = oss.link_data, vd = oss.video_data;
    if (ld && ld.picture) return ld.picture;
    if (ld && ld.child_attachments && ld.child_attachments[0] && ld.child_attachments[0].picture) return ld.child_attachments[0].picture;
    if (vd && vd.image_url) return vd.image_url;
  }
  if (cr.image_url) return cr.image_url;
  return cr.thumbnail_url || ''; // 64px, último recurso
}
function collectHashes(cr){
  const h = [];
  if (cr && cr.object_story_spec && cr.object_story_spec.link_data && cr.object_story_spec.link_data.image_hash)
    h.push(cr.object_story_spec.link_data.image_hash);
  if (cr && cr.image_hash) h.push(cr.image_hash);
  return h;
}

async function getCreatives(query){
  const key = 'creatives:' + (query || '');
  const hit = cached(key); if (hit) return hit;
  if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) throw new Error('Meta não configurado');

  const acct = META_AD_ACCOUNT_ID, tok = META_ACCESS_TOKEN, base = 'https://graph.facebook.com/v19.0';
  const adsUrl = `${base}/${acct}/ads?fields=id,name,status,creative{id,name,image_url,thumbnail_url,image_hash,object_story_spec,asset_feed_spec}&limit=100&access_token=${tok}`;
  // NÃO usar field expansion insights.time_range(JSON){...} (dá 400). 2 chamadas paralelas:
  const insightsUrl = `${base}/${acct}/insights?level=ad&fields=ad_id,spend,clicks,ctr,impressions,actions&limit=200&access_token=${tok}`;

  const [adsRes, insRes] = await Promise.all([ getJSON(adsUrl), getJSON(insightsUrl) ]);
  if (adsRes.error) throw new Error(adsRes.error.message);
  const ins = {};
  (insRes.data || []).forEach(i => { ins[i.ad_id] = i; });

  // resolve image_hash -> URL original (uma chamada extra ao /adimages)
  const allHashes = [];
  (adsRes.data || []).forEach(a => collectHashes(a.creative).forEach(h => { if (!allHashes.includes(h)) allHashes.push(h); }));
  const hashMap = {};
  if (allHashes.length){
    try {
      const hUrl = `${base}/${acct}/adimages?hashes=${encodeURIComponent(JSON.stringify(allHashes))}&fields=hash,url&access_token=${tok}`;
      const hRes = await getJSON(hUrl);
      const data = hRes.data || (hRes.images ? Object.values(hRes.images) : []);
      (data || []).forEach(img => { if (img.hash) hashMap[img.hash] = img.url; });
    } catch (e) { console.warn('[Meta] adimages falhou:', e.message); }
  }

  const creatives = (adsRes.data || []).map(a => {
    const m = ins[a.id] || {};
    let thumb = pickThumb(a.creative);
    const hashes = collectHashes(a.creative);
    if (hashes.length && hashMap[hashes[0]]) thumb = hashMap[hashes[0]];
    const video = !!(a.creative && a.creative.object_story_spec && a.creative.object_story_spec.video_data);
    return {
      id: a.id, name: a.name || (a.creative && a.creative.name) || 'Criativo',
      status: a.status, thumb, video,
      spend: Number(m.spend || 0),
      conversions: countConversions(m.actions),
      clicks: Number(m.clicks || 0),
      ctr: Number(m.ctr || 0),
      impressions: Number(m.impressions || 0)
    };
  });
  const out = { creatives };
  const spend = creatives.reduce((s,c)=>s+c.spend,0), conv = creatives.reduce((s,c)=>s+c.conversions,0);
  console.log('[Meta] ✓ ' + creatives.length + ' criativos · R$ ' + spend.toFixed(2) + ' · ' + conv + ' conversões');
  setCache(key, out);
  return out;
}

/* ---------- estáticos ---------- */
function serveStatic(req, res){
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(__dirname, p);
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ---------- servidor ---------- */
http.createServer(async (req, res) => {
  const url = req.url || '';
  try {
    if (url.startsWith('/api/sheets')) {
      const data = await getSheets();
      res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'public, max-age=300' });
      return res.end(JSON.stringify(data));
    }
    if (url.startsWith('/api/meta-creatives')) {
      const q = url.split('?')[1] || '';
      const data = await getCreatives(q);
      res.writeHead(200, { 'Content-Type':'application/json', 'Cache-Control':'public, max-age=300' });
      return res.end(JSON.stringify(data));
    }
    serveStatic(req, res);
  } catch (e) {
    console.error('[API] erro:', e.message);
    res.writeHead(502, { 'Content-Type':'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(PORT, () => console.log('Dashboard CARENA rodando na porta ' + PORT));
