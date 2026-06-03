/* js/report.js — Relatório imprimível (usa window.print -> "Salvar como PDF")
 * Mantém leve e sem dependências; o usuário pode "imprimir em PDF" pelo navegador. */
window.Report = (function () {
  function generate(state){
    const t = state.totals();
    const win = window.open('', '_blank');
    if (!win){ alert('Permita pop-ups para gerar o relatório.'); return; }
    const range = state.data.length === 1 ? state.data[0].label
      : `${state.data[0].label} a ${state.data[state.data.length-1].label}`;
    const rows = state.data.map(r => `<tr>
      <td>${r.label}</td><td>${r.weekday}</td>
      <td>${U.BRL(r.gSpend)}</td><td>${r.gLeads}</td>
      <td>${U.BRL(r.fSpend)}</td><td>${r.fLeads}</td>
      <td><b>${r.totalLeads}</b></td></tr>`).join('');
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Relatório — ${CONFIG.cliente}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#0F1F38;margin:32px}
        h1{color:#1452B8;margin:0 0 4px} .sub{color:#5B6B87;margin-bottom:18px}
        .kpis{display:flex;gap:16px;margin:18px 0}
        .kpi{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
        .kpi b{display:block;font-size:22px;color:#1452B8}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:14px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:right}
        th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){text-align:left}
        th{background:#EBF1F9}
      </style></head><body>
      <h1>${CONFIG.cliente}</h1>
      <div class="sub">${CONFIG.subtitulo} · Período: ${range}</div>
      <div class="kpis">
        <div class="kpi">Orçamento<b>${U.BRL(t.budget)}</b></div>
        <div class="kpi">Leads<b>${U.NUM(t.leads)}</b></div>
        <div class="kpi">CPL médio<b>${U.BRL2(t.cpl)}</b></div>
      </div>
      <table><thead><tr><th>Data</th><th>Dia</th><th>Verba G</th><th>Leads G</th><th>Verba FB</th><th>Leads FB</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>setTimeout(()=>window.print(),300)<\/script>
      </body></html>`);
    win.document.close();
    console.log('[Report] Gerado para', range);
  }
  return { generate };
})();
