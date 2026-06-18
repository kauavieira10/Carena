/* js/tiktok.js — View TikTok: consome o proxy /api/tiktok/* (serviço tiktok-sync)
 * e desenha KPIs, evolução de seguidores e top vídeos no visual do dashboard.
 * Sem dados/credenciais aqui — tudo vem via proxy do server.js (env TIKTOK_SYNC_URL). */
window.TikTok = (function () {
  let chart = null;
  let lastSnaps = [];

  const compact = new Intl.NumberFormat('pt-BR', { notation:'compact', maximumFractionDigits:1 });
  const nf = n => (n == null ? '—' : compact.format(n));

  /* helpers locais (não dependem da ordem de carga do app.js) */
  const elx = id => document.getElementById(id);
  const txt = (id, v) => { const e = elx(id); if (e) e.textContent = v; };

  function setStatus(msg){
    const box = elx('tt-status');
    if (box){ box.textContent = msg || ''; box.style.display = msg ? '' : 'none'; }
    const body = elx('tt-body');
    if (body) body.style.display = msg ? 'none' : '';
  }

  function fmtDate(s){
    const d = new Date(s);
    return isNaN(d) ? String(s) : d.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
  }

  function hexA(hex, a){
    const m = String(hex || '').trim().replace('#','');
    if (m.length !== 6) return 'rgba(31,111,229,' + a + ')';
    const r = parseInt(m.slice(0,2),16), g = parseInt(m.slice(2,4),16), b = parseInt(m.slice(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  async function getJSON(url){
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ' -> ' + res.status);
    return res.json();
  }

  async function load(){
    setStatus('Carregando…');
    let accounts;
    try { accounts = await getJSON(CONFIG.api.tiktokAccounts); }
    catch (e){
      console.warn('[TikTok] proxy indisponível:', e.message);
      setStatus('TikTok não configurado — defina TIKTOK_SYNC_URL no backend e conecte uma conta no serviço tiktok-sync.');
      return;
    }
    if (!Array.isArray(accounts) || !accounts.length){
      setStatus('Nenhuma conta do TikTok conectada ainda no serviço tiktok-sync.');
      return;
    }

    const wanted = (CONFIG.tiktok && CONFIG.tiktok.openId) || '';
    const acc = accounts.find(a => a.open_id === wanted) || accounts[0];

    let overview, videos;
    try {
      [overview, videos] = await Promise.all([
        getJSON(CONFIG.api.tiktokOverview + '?openId=' + encodeURIComponent(acc.open_id)),
        getJSON(CONFIG.api.tiktokVideos   + '?openId=' + encodeURIComponent(acc.open_id)),
      ]);
    } catch (e){
      console.warn('[TikTok] erro ao carregar dados:', e.message);
      setStatus('Não foi possível carregar os dados desta conta.');
      return;
    }

    setStatus('');
    txt('tt-account', acc.display_name || acc.open_id);
    lastSnaps = overview.snapshots || [];
    renderKpis(lastSnaps[lastSnaps.length - 1] || null);
    renderChart(lastSnaps);
    renderVideos(videos.videos || []);
    console.log('[TikTok] ✓ ' + (acc.display_name || acc.open_id) + ' · ' + lastSnaps.length + ' snapshots');
  }

  function renderKpis(snap){
    txt('tt-followers', snap ? nf(snap.follower_count) : '—');
    txt('tt-following', snap ? nf(snap.following_count) : '—');
    txt('tt-likes',     snap ? nf(snap.likes_count) : '—');
    txt('tt-videos-kpi',snap ? nf(snap.video_count) : '—');
  }

  function renderChart(snaps){
    const cv = elx('ttFollowersChart'); if (!cv || typeof Chart === 'undefined') return;
    txt('tt-chart-sub', snaps.length ? snaps.length + ' snapshot(s)' : 'Sem dados ainda — rode uma coleta');
    const ctx = cv.getContext('2d');
    const prim = U.cssVar('--primary') || '#1F6FE5';
    const grad = ctx.createLinearGradient(0,0,0,300);
    grad.addColorStop(0, hexA(prim, 0.35)); grad.addColorStop(1, hexA(prim, 0));
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type:'line',
      data:{ labels: snaps.map(s => fmtDate(s.snapshot_date)),
        datasets:[{ data: snaps.map(s => s.follower_count), borderColor: prim, backgroundColor: grad,
          borderWidth:3, fill:true, tension:.35, pointRadius: snaps.length === 1 ? 5 : 0,
          pointHoverRadius:5, pointHoverBackgroundColor: prim }]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false },
          tooltip:{ padding:10, cornerRadius:10, callbacks:{ label: c => ' ' + U.NUM(c.parsed.y) + ' seguidores' } } },
        scales:{ x:{ grid:{ display:false }, ticks:{ maxTicksLimit:8 } },
          y:{ grid:{ color: U.cssVar('--hairline') }, ticks:{ callback: v => compact.format(v) } } } }
    });
  }

  function renderVideos(videos){
    const grid = elx('tt-videos-grid'); if (!grid) return;
    const list = videos.slice().sort((a,b) => (b.view_count||0) - (a.view_count||0));
    txt('tt-videos-count', list.length ? list.length + ' vídeo' + (list.length>1?'s':'') : '');
    if (!list.length){
      grid.innerHTML = '<div class="cr-empty">Sem vídeos coletados ainda — rode uma coleta no tiktok-sync.</div>';
      return;
    }
    grid.innerHTML = list.map(card).join('');
  }

  function card(v){
    const title = (v.title || 'Sem título').replace(/</g,'&lt;');
    const thumb = v.cover_image_url
      ? `<img src="${v.cover_image_url}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='<div class=&quot;cr-noimg&quot;>🎬</div>'">`
      : '<div class="cr-noimg">🎬</div>';
    return `<article class="cr-card glass">
      <div class="cr-thumb">${thumb}</div>
      <div class="cr-name">${title}</div>
      <div class="cr-metrics" style="grid-template-columns:repeat(2,1fr)">
        <div class="cr-metric"><span class="cr-m-label">Views</span><span class="cr-m-value">${nf(v.view_count)}</span></div>
        <div class="cr-metric"><span class="cr-m-label">Curtidas</span><span class="cr-m-value accent">${nf(v.like_count)}</span></div>
        <div class="cr-metric"><span class="cr-m-label">Comentários</span><span class="cr-m-value">${nf(v.comment_count)}</span></div>
        <div class="cr-metric"><span class="cr-m-label">Compart.</span><span class="cr-m-value">${nf(v.share_count)}</span></div>
      </div>
    </article>`;
  }

  /* redesenha o gráfico (ex.: ao trocar de tema) */
  function redraw(){ if (lastSnaps.length) renderChart(lastSnaps); }

  return { load, redraw };
})();
