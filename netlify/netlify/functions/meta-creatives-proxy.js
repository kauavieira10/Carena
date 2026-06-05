/* netlify/functions/meta-creatives-proxy.js — proxy de criativos Meta Ads (Netlify)
 * 2 chamadas paralelas (/ads + /insights) + cascata de thumbnail + resolução de image_hash. */
const { META_ACCESS_TOKEN, META_AD_ACCOUNT_ID } = process.env;
const CONV = ['lead','purchase','complete_registration','offsite_conversion','submit_application'];

const countConv = a => Array.isArray(a)
  ? a.reduce((s,x)=> CONV.some(t=>(x.action_type||'').includes(t)) ? s+Number(x.value||0) : s, 0) : 0;

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
  return cr.image_url || cr.thumbnail_url || '';
}
function hashesOf(cr){
  const h=[];
  if (cr && cr.object_story_spec && cr.object_story_spec.link_data && cr.object_story_spec.link_data.image_hash) h.push(cr.object_story_spec.link_data.image_hash);
  if (cr && cr.image_hash) h.push(cr.image_hash);
  return h;
}

exports.handler = async () => {
  try {
    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID)
      return { statusCode: 500, body: JSON.stringify({ error: 'Meta não configurado' }) };
    const acct = META_AD_ACCOUNT_ID, tok = META_ACCESS_TOKEN, base = 'https://graph.facebook.com/v19.0';
    const adsUrl = `${base}/${acct}/ads?fields=id,name,status,creative{id,name,image_url,thumbnail_url,image_hash,object_story_spec,asset_feed_spec}&limit=100&access_token=${tok}`;
    const insUrl = `${base}/${acct}/insights?level=ad&fields=ad_id,spend,clicks,ctr,impressions,actions&limit=200&access_token=${tok}`;

    const [adsR, insR] = await Promise.all([ fetch(adsUrl).then(r=>r.json()), fetch(insUrl).then(r=>r.json()) ]);
    if (adsR.error) throw new Error(adsR.error.message);
    const ins = {}; (insR.data||[]).forEach(i => ins[i.ad_id]=i);

    const hashes = [];
    (adsR.data||[]).forEach(a => hashesOf(a.creative).forEach(h => { if(!hashes.includes(h)) hashes.push(h); }));
    const hmap = {};
    if (hashes.length){
      try {
        const hr = await fetch(`${base}/${acct}/adimages?hashes=${encodeURIComponent(JSON.stringify(hashes))}&fields=hash,url&access_token=${tok}`).then(r=>r.json());
        (hr.data || (hr.images?Object.values(hr.images):[])).forEach(im => { if(im.hash) hmap[im.hash]=im.url; });
      } catch(e){}
    }

    const creatives = (adsR.data||[]).map(a => {
      const m = ins[a.id] || {};
      let thumb = pickThumb(a.creative);
      const hs = hashesOf(a.creative);
      if (hs.length && hmap[hs[0]]) thumb = hmap[hs[0]];
      return {
        id:a.id, name:a.name||'Criativo', status:a.status, thumb,
        video: !!(a.creative && a.creative.object_story_spec && a.creative.object_story_spec.video_data),
        spend:Number(m.spend||0), conversions:countConv(m.actions),
        clicks:Number(m.clicks||0), ctr:Number(m.ctr||0), impressions:Number(m.impressions||0)
      };
    });
    console.log('[Meta] ✓ ' + creatives.length + ' criativos');
    return {
      statusCode: 200,
      headers: { 'Content-Type':'application/json', 'Cache-Control':'public, max-age=300' },
      body: JSON.stringify({ creatives })
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
