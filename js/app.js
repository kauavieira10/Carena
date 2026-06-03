/* js/app.js — Estado central + orquestração (boot por último no index.html)
 * IMPORTANTE: App é atribuído a window.App explicitamente (const não vira global). */
window.App = {
  FULL: [], data: [], platform: 'all',
  goals: CONFIG.goals,
  monthDays: CONFIG.monthDaysFallback,
  creativesLoaded: false,
  PF_LABEL: { all:'Todas as plataformas', google:'Google', facebook:'Facebook' },

  /* ---------- cálculos ---------- */
  totals(){
    const d = this.data;
    const gSpend = d.reduce((s,r)=>s+r.gSpend,0), fSpend = d.reduce((s,r)=>s+r.fSpend,0);
    const gLeads = d.reduce((s,r)=>s+r.gLeads,0), fLeads = d.reduce((s,r)=>s+r.fLeads,0);
    const budget = gSpend+fSpend, leads = gLeads+fLeads;
    return { gSpend, fSpend, gLeads, fLeads, budget, leads, cpl: leads ? budget/leads : 0 };
  },
  scaleGoal(base){ return base * this.data.length / (this.monthDays || 1); },

  /* ---------- filtros de período ---------- */
  applyPreset(d){
    const F = this.FULL;
    if (d === 'month')      this.data = F.slice();
    else if (d === '1')     this.data = F.slice(-1);
    else if (d === '2')     this.data = F.slice(-2,-1);
    else                    this.data = F.slice(-parseInt(d,10));
    if (!this.data.length)  this.data = F.slice(-1);
    console.log('[DateFilter] Aplicado:', { from:this.data[0].label, to:this.data[this.data.length-1].label });
    this.render(); this.syncCreatives();
  },
  applyDateFilter(from, to){
    this.data = this.FULL.filter(r => r.date >= stripTime(from) && r.date <= stripTime(to));
    if (!this.data.length) this.data = this.FULL.slice();
    document.querySelectorAll('.preset').forEach(p=>p.classList.remove('active'));
    console.log('[App.applyDateFilter] CHAMADO!', { dias:this.data.length });
    this.render(); this.syncCreatives();
  },

  /* ---------- render ---------- */
  render(){ this.renderKpis(); this.renderPlatforms(); this.renderTable(); Charts.render(this.data, this.platform); this.renderRange(); },

  renderRange(){
    const d = this.data;
    const lbl = d.length===1 ? d[0].label : `${d[0].label} – ${d[d.length-1].label}`;
    txt('range-label', lbl + '  ·  ' + d.length + (d.length>1?' dias':' dia'));
    txt('table-count', d.length + ' registro' + (d.length>1?'s':''));
    const pf = this.platform!=='all' ? (' · '+this.PF_LABEL[this.platform]) : '';
    txt('hero-sub', 'Evolução diária · ' + lbl + pf);
  },

  renderKpis(){
    const t = this.totals(), P = this.platform, g = this.goals[P];
    const budget = P==='google'?t.gSpend : P==='facebook'?t.fSpend : t.budget;
    const leads  = P==='google'?t.gLeads : P==='facebook'?t.fLeads : t.leads;
    const cpl    = leads ? budget/leads : 0;
    const goalBudget = this.scaleGoal(g.budget), goalLeads = this.scaleGoal(g.leads), cplTarget = g.cpl;
    const fbNoCpl = (P==='facebook'); // verba FB não lançada por dia

    txt('kpi-budget', U.BRL(budget)); txt('kpi-budget-goal','meta '+U.BRL(goalBudget));
    const bp = goalBudget?Math.round(budget/goalBudget*100):0;
    txt('kpi-budget-pct', bp+'%'); bar('kpi-budget-bar', bp);

    txt('kpi-leads', U.NUM(leads)); txt('kpi-leads-goal','meta '+U.NUM(goalLeads));
    const lp = goalLeads?Math.round(leads/goalLeads*100):0;
    const lpEl = el('kpi-leads-pct'); lpEl.textContent = lp+'%'; lpEl.className='kpi-pct '+(lp>=100?'up':'down'); bar('kpi-leads-bar', lp);

    txt('kpi-cpl', fbNoCpl?'n/d':U.BRL2(cpl)); txt('kpi-cpl-goal','meta '+U.BRL2(cplTarget));
    const cp = fbNoCpl?0:Math.round(cpl/cplTarget*100);
    const cpEl = el('kpi-cpl-pct'); cpEl.textContent = fbNoCpl?'—':cp+'%';
    cpEl.className = 'kpi-pct '+(!fbNoCpl && cpl<=cplTarget?'up':'down'); bar('kpi-cpl-bar', fbNoCpl?0:cp);
  },

  renderPlatforms(){
    const t = this.totals(), P = this.platform;
    document.querySelector('.platform.google').style.display   = P==='facebook'?'none':'';
    document.querySelector('.platform.facebook').style.display = P==='google'?'none':'';
    el('platforms-grid').style.gridTemplateColumns = P==='all'?'1fr 1fr':'1fr';

    const gS = this.scaleGoal(this.goals.google.budget), gL = this.scaleGoal(this.goals.google.leads), gC = this.goals.google.cpl;
    const fS = this.scaleGoal(this.goals.facebook.budget), fL = this.scaleGoal(this.goals.facebook.leads), fC = this.goals.facebook.cpl;
    const row = (m,goal,real,pct,goodHigh=true) => {
      const ok = goodHigh ? pct>=100 : pct<=100;
      return `<tr><td>${m}</td><td>${goal}</td><td>${real}</td><td class="pct ${ok?'up':'down'}">${pct}%</td></tr>`;
    };
    el('pf-google').innerHTML =
      row('Investimento', U.BRL(gS), U.BRL(t.gSpend), Math.round(t.gSpend/gS*100)) +
      row('Leads', U.NUM(gL), U.NUM(t.gLeads), Math.round(t.gLeads/gL*100)) +
      row('CPL', U.BRL2(gC), U.BRL2(t.gLeads?t.gSpend/t.gLeads:0), Math.round((t.gLeads?t.gSpend/t.gLeads:0)/gC*100), false);
    el('pf-facebook').innerHTML =
      row('Investimento', U.BRL(fS), U.BRL(t.fSpend), Math.round(t.fSpend/fS*100)) +
      row('Leads', U.NUM(fL), U.NUM(t.fLeads), Math.round(t.fLeads/fL*100)) +
      `<tr><td>CPL</td><td>${U.BRL2(fC)}</td><td style="color:var(--muted)">n/d*</td><td class="pct" style="color:var(--muted)">—</td></tr>`;
  },

  renderTable(){
    el('daily-body').innerHTML = this.data.map(r => `
      <tr>
        <td>${r.label}</td><td style="color:var(--muted)">${r.weekday}</td>
        <td>${U.BRL(r.gSpend)}</td><td>${r.gLeads}</td><td>${U.BRL2(r.gCpl)}</td>
        <td>${U.BRL(r.fSpend)}</td><td>${r.fLeads}</td><td>${U.BRL2(r.fCpl)}</td>
        <td style="font-weight:700">${r.totalLeads}</td>
        <td><span class="chip ${r.pctGoal>=100?'up':'down'}">${r.pctGoal}%</span></td>
      </tr>`).join('');
  },

  /* ---------- abas + criativos ---------- */
  switchTab(name){
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view===name));
    el('view-overview').style.display  = name==='overview' ? '' : 'none';
    el('view-creatives').style.display = name==='creatives' ? '' : 'none';
    if (name==='creatives' && !this.creativesLoaded){ this.creativesLoaded = true; Meta.load(this.range()); }
  },
  range(){ const d=this.data; return d.length?{ from:d[0].label, to:d[d.length-1].label }:null; },
  syncCreatives(){ if (this.creativesLoaded) Meta.load(this.range()); },

  /* ---------- dados ---------- */
  async loadData(){
    try {
      const out = await Sheets.fetchData();
      this.FULL = out.dias; this.goals = out.goals; this.monthDays = out.dias.length || CONFIG.monthDaysFallback;
      this.data = this.FULL.slice();
      this.toast('Dados atualizados da planilha', 'online');
    } catch (e) {
      console.warn('[Sheets] fallback offline:', e.message);
      this.FULL = window.DATASET.slice();
      this.goals = window.GOALS_FALLBACK || CONFIG.goals;
      this.monthDays = this.FULL.length;
      this.data = this.FULL.slice();
      this.toast('Modo demonstração (planilha não conectada)', 'demo');
    }
  },

  toast(msg, type){
    let t = el('toast');
    if (!t){ t = document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'toast show ' + (type||'');
    clearTimeout(this._tt); this._tt = setTimeout(()=> t.className='toast '+(type||''), 3200);
  },

  /* ---------- wiring ---------- */
  wire(){
    document.getElementById('presets').addEventListener('click', e => {
      const b = e.target.closest('.preset'); if (!b) return;
      document.querySelectorAll('.preset').forEach(p=>p.classList.remove('active'));
      b.classList.add('active'); this.applyPreset(b.dataset.d);
    });
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => this.switchTab(t.dataset.view)));
    document.getElementById('pf-filter').addEventListener('change', e => {
      this.platform = e.target.value; console.log('[Filter] Plataforma:', this.platform); this.render(); this.syncCreatives();
    });
    document.getElementById('refresh').addEventListener('click', async () => { await this.loadData(); this.applyPreset('month'); });
    document.getElementById('report').addEventListener('click', () => Report.generate(this));
    Theme.init(() => Charts.render(this.data, this.platform));
    DateFilter.init();
    Meta.initFilters();
  },

  async boot(){
    this.wire();
    await this.loadData();
    this.render();
    Meta.initFilters();
    console.log('[App] Boot OK · '+this.FULL.length+' dias · plataforma '+this.platform);
  }
};

/* helpers de DOM */
function el(id){ return document.getElementById(id); }
function txt(id,v){ const e=el(id); if(e) e.textContent=v; }
function bar(id,pct){ const e=el(id); if(e) e.style.width=Math.max(0,Math.min(pct,100))+'%'; }
function stripTime(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => App.boot());
else App.boot();
