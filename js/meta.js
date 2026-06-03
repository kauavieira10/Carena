/* js/meta.js — Criativos do Meta Ads (via proxy backend)
 * O proxy faz 2 chamadas paralelas (/ads + /insights?level=ad) e resolve thumbnails.
 * Aqui só consumimos o JSON já tratado e renderizamos. */
window.Meta = (function () {
  let CREATIVES = [];
  let statusFilter = 'all';

  // Demo usado quando não há token/proxy (preview offline)
  const DEMO = [
    { id:'1', name:'Carrossel — Lançamento', status:'ACTIVE', thumb:'', video:false, spend:1820.50, conversions:64, clicks:980, ctr:2.4, impressions:40800 },
    { id:'2', name:'Vídeo — Depoimento',     status:'ACTIVE', thumb:'', video:true,  spend:1240.00, conversions:38, clicks:610, ctr:1.9, impressions:32100 },
    { id:'3', name:'Imagem — Oferta',        status:'PAUSED', thumb:'', video:false, spend:540.25,  conversions:12, clicks:220, ctr:1.2, impressions:18300 },
    { id:'4', name:'Vídeo — Tour',           status:'ACTIVE', thumb:'', video:true,  spend:990.80,  conversions:29, clicks:470, ctr:2.0, impressions:23500 },
    { id:'5', name:'Imagem — Remarketing',   status:'PAUSED', thumb:'', video:false, spend:312.00,  conversions:7,  clicks:140, ctr:0.9, impressions:15400 },
    { id:'6', name:'Carrossel — Benefícios', status:'ACTIVE', thumb:'', video:false, spend:760.40,  conversions:21, clicks:355, ctr:1.6, impressions:21900 }
  ];

  async function load(range){
    const box = document.getElementById('creatives-grid');
    if (box) box.innerHTML = '<div class="cr-empty">Carregando criativos…</div>';
    try {
      const qs = range ? ('?from='+range.from+'&to='+range.to) : '';
      const res = await fetch(CONFIG.api.creatives + qs, { headers:{Accept:'application/json'} });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
      CREATIVES = json.creatives || [];
      if (!CREATIVES.length) throw new Error('sem criativos');
      console.log('[Meta] ✓ '+CREATIVES.length+' criativos · live');
    } catch (e) {
      CREATIVES = DEMO;
      console.warn('[Meta] usando criativos DEMO (sem proxy/token):', e.message);
    }
    render();
  }

  function filtered(){
    if (statusFilter === 'active') return CREATIVES.filter(c => c.status === 'ACTIVE');
    if (statusFilter === 'paused') return CREATIVES.filter(c => c.status !== 'ACTIVE');
    return CREATIVES;
  }

  function render(){
    renderCounts();
    renderSummary();
    renderGrid();
  }

  function renderCounts(){
    const all = CREATIVES.length;
    const act = CREATIVES.filter(c => c.status==='ACTIVE').length;
    set('count-all', all); set('count-active', act); set('count-paused', all-act);
  }
  function set(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; }

  function renderSummary(){
    const f = filtered();
    const spend = f.reduce((s,c)=>s+ (c.spend||0),0);
    const conv  = f.reduce((s,c)=>s+ (c.conversions||0),0);
    set('cr-kpi-count', f.length);
    set('cr-kpi-spend', U.BRL(spend));
    set('cr-kpi-conv',  U.NUM(conv));
    set('cr-kpi-cpl',   conv ? U.BRL2(spend/conv) : '—');
  }

  function metric(label, value, cls){
    return `<div class="cr-metric"><span class="cr-m-label">${label}</span><span class="cr-m-value ${cls||''}">${value}</span></div>`;
  }

  function renderGrid(){
    const box = document.getElementById('creatives-grid');
    if (!box) return;
    const f = filtered();
    if (!f.length){ box.innerHTML = '<div class="cr-empty">Nenhum criativo nesta categoria.</div>'; return; }
    box.innerHTML = f.map(c => {
      const active = c.status === 'ACTIVE';
      const cpl = c.conversions ? U.BRL2(c.spend/c.conversions) : '—';
      const thumb = c.thumb
        ? `<img src="${c.thumb}" alt="" loading="lazy">`
        : `<div class="cr-noimg">${c.video?'▶':'🖼'}</div>`;
      return `<div class="cr-card glass">
        <div class="cr-thumb">${thumb}
          ${c.video?'<span class="cr-play">▶</span>':''}
          <span class="cr-badge ${active?'on':'off'}">${active?'Ativo':'Pausado'}</span>
        </div>
        <div class="cr-name">${c.name||'Criativo'}</div>
        <div class="cr-metrics">
          ${metric('Investimento', U.BRL(c.spend))}
          ${metric('Conversões', U.NUM(c.conversions), 'accent')}
          ${metric('CPL', cpl)}
          ${metric('Cliques', U.NUM(c.clicks))}
          ${metric('CTR', (c.ctr||0).toFixed(1)+'%')}
          ${metric('Impressões', U.NUM(c.impressions))}
        </div>
      </div>`;
    }).join('');
  }

  function initFilters(){
    const bar = document.getElementById('cr-status');
    if (!bar) return;
    bar.addEventListener('click', e => {
      const b = e.target.closest('.cr-pill'); if (!b) return;
      bar.querySelectorAll('.cr-pill').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      statusFilter = b.dataset.s;
      render();
    });
  }

  return { load, initFilters };
})();
