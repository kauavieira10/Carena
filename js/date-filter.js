/* js/date-filter.js — Seletor de período (calendário popup)
 * Técnicas críticas:
 *  - Portal pattern: o popup é filho direto de <body> (escapa de stacking contexts
 *    criados por backdrop-filter dos pais).
 *  - position:fixed + z-index altíssimo + isolation:isolate.
 *  - Event delegation no .cal-grid (innerHTML recria os dias; listeners individuais morreriam).
 *  - stopPropagation em TODOS os handlers internos; fecha com ESC / scroll / clique fora. */
window.DateFilter = (function () {
  let pop = null, view = null, mode = 'range', start = null, end = null, anchor = null;
  const MES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const same = (a,b) => a && b && a.toDateString() === b.toDateString();
  const between = (d,a,b) => a && b && d >= a && d <= b;

  function build(){
    pop = document.createElement('div');
    pop.className = 'cal-popup glass';
    pop.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(pop); // PORTAL
    render();
  }

  function render(){
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1), startDow = first.getDay();
    const days = new Date(y, m+1, 0).getDate();
    let grid = '';
    for (let i=0;i<startDow;i++) grid += '<span class="cal-day empty"></span>';
    for (let d=1; d<=days; d++){
      const date = new Date(y, m, d);
      const cls = ['cal-day'];
      if (same(date,start) || same(date,end)) cls.push('sel');
      else if (between(date,start,end)) cls.push('range');
      grid += `<button class="${cls.join(' ')}" data-d="${date.toISOString()}">${d}</button>`;
    }
    const lbl = !start ? 'Selecione' :
      (mode==='single' || !end || same(start,end)) ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
    pop.innerHTML = `
      <div class="cal-head">
        <div class="cal-modes">
          <button class="cal-mode ${mode==='single'?'active':''}" data-m="single">Dia</button>
          <button class="cal-mode ${mode==='range'?'active':''}" data-m="range">Período</button>
        </div>
        <div class="cal-nav">
          <button class="cal-arrow" data-nav="-1">‹</button>
          <span class="cal-title">${MES[m]} ${y}</span>
          <button class="cal-arrow" data-nav="1">›</button>
        </div>
      </div>
      <div class="cal-weekdays"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>
      <div class="cal-grid">${grid}</div>
      <div class="cal-foot">
        <span class="cal-sel">${lbl}</span>
        <div>
          <button class="cal-btn ghost" data-act="clear">Limpar</button>
          <button class="cal-btn primary" data-act="apply">Aplicar</button>
        </div>
      </div>`;
    wire();
    place();
  }

  function fmt(d){ return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0'); }

  function wire(){
    // modos
    pop.querySelectorAll('.cal-mode').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); mode = b.dataset.m; if (mode==='single') end = start; render();
    }));
    // navegação de mês
    pop.querySelectorAll('.cal-arrow').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation(); view = new Date(view.getFullYear(), view.getMonth()+(+b.dataset.nav), 1); render();
    }));
    // EVENT DELEGATION nos dias (um listener só no .cal-grid)
    pop.querySelector('.cal-grid').addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('.cal-day'); if (!b || b.classList.contains('empty')) return;
      const d = new Date(b.dataset.d);
      if (mode === 'single'){ start = end = d; }
      else {
        if (!start || (start && end)) { start = d; end = null; }
        else { if (d < start){ end = start; start = d; } else { end = d; } }
      }
      render();
    });
    // ações
    pop.querySelectorAll('.cal-btn').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if (b.dataset.act === 'clear'){ start = end = null; render(); return; }
      if (b.dataset.act === 'apply'){ apply(); }
    }));
  }

  function apply(){
    if (!start) { close(); return; }
    const from = start, to = (mode==='single' || !end) ? start : end;
    console.log('[DateFilter] Aplicado:', { from: fmt(from), to: fmt(to) });
    if (window.App && App.applyDateFilter) App.applyDateFilter(from, to);
    close();
  }

  function place(){
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const w = 300, h = pop.offsetHeight || 360;
    let top = r.bottom + 8, left = Math.min(r.left, window.innerWidth - w - 12);
    if (top + h > window.innerHeight) top = Math.max(8, r.top - h - 8); // abre acima se não couber
    pop.style.cssText += `position:fixed!important;z-index:999999;isolation:isolate;top:${top}px;left:${Math.max(12,left)}px;width:${w}px;`;
  }

  function open(btn){
    anchor = btn;
    view = new Date(2026, 4, 1); // mês dos dados (mai/2026)
    if (!pop) build(); else { render(); pop.style.display = 'block'; }
    setTimeout(() => {
      document.addEventListener('click', onOutside, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('scroll', close, true);
    }, 0);
  }
  function close(){
    if (pop) pop.style.display = 'none';
    document.removeEventListener('click', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('scroll', close, true);
  }
  function onOutside(e){ if (pop && !pop.contains(e.target) && e.target !== anchor) close(); }
  function onKey(e){ if (e.key === 'Escape') close(); }

  function init(){
    const btn = document.getElementById('open-cal');
    if (btn) btn.addEventListener('click', e => { e.stopPropagation(); (pop && pop.style.display==='block') ? close() : open(btn); });
  }
  return { init };
})();
