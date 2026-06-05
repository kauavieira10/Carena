/* js/sheets.js — Cliente da planilha (via proxy backend)
 * O frontend NUNCA chama a API do Google direto (CORS + segurança).
 * Espera do proxy: { values: [[...linha...], ...] } (formato Google Sheets API). */
window.Sheets = (function () {
  function withTimeout(promise, ms){
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
    ]);
  }

  /* Converte a matriz da planilha no array de dias + metas do dashboard.
   * Tolerante à estrutura real: localiza a linha de cabeçalho "DATA | DIA | VERBA GOOGLE ..."
   * e lê as colunas por posição. Lê também o bloco PROJETADO (metas). */
  function parse(values){
    const dias = [];
    const goals = JSON.parse(JSON.stringify(CONFIG.goals)); // metas padrão

    // 1) Localiza o cabeçalho da tabela diária PRIMEIRO (normaliza espaços/quebras de linha)
    let head = -1;
    for (let i=0;i<values.length;i++){
      const joined = values[i].join('|').toUpperCase().replace(/\s+/g, ' ');
      if (joined.includes('DATA') && joined.includes('VERBA GOOGLE')) { head = i; break; }
    }

    // 2) Metas do bloco PROJETADO — SOMENTE antes do cabeçalho diário
    //    (a planilha tem uma 2ª linha "TOTAL" no fim da tabela diária que NÃO é meta)
    const limit = head >= 0 ? head : values.length;
    for (let i=0;i<limit;i++){
      const r = values[i];
      const k = String(r[0]||'').trim().toLowerCase();
      if (k === 'google')   goals.google   = { budget:U.parseBRL(r[1]), leads:U.parseInt0(r[3]), cpl:U.parseBRL(r[4]) };
      if (k === 'facebook') goals.facebook = { budget:U.parseBRL(r[1]), leads:U.parseInt0(r[3]), cpl:U.parseBRL(r[4]) };
      if (k === 'total')    goals.all      = { budget:U.parseBRL(r[1]), leads:U.parseInt0(r[3]), cpl:U.parseBRL(r[4]) };
    }

    // 3) Lê as linhas diárias (col: 0 DATA,1 DIA,2 VERBA G,3 LEAD G,7 VERBA FB,8 LEAD FB)
    const dailyGoal = (goals.all.leads || 885) / CONFIG.monthDaysFallback;
    if (head >= 0){
      for (let i=head+1;i<values.length;i++){
        const r = values[i];
        const date = U.parseDate(r[0]);
        if (!date) continue;
        const gSpend = U.parseBRL(r[2]);
        const gLeads = U.parseInt0(r[3]);
        const fSpend = U.parseBRL(r[7]);
        const fLeads = U.parseInt0(r[8]);
        const total  = gLeads + fLeads;
        dias.push({
          date, label: r[0].trim().slice(0,5),
          weekday: U.weekdayShort(r[1]),
          gSpend, gLeads, gCpl: gLeads ? gSpend/gLeads : 0,
          fSpend, fLeads, fCpl: fLeads && fSpend ? fSpend/fLeads : 0,
          totalLeads: total,
          pctGoal: dailyGoal ? Math.round(total/dailyGoal*100) : 0
        });
      }
    }
    return { dias, goals };
  }

  async function fetchData(){
    const res = await withTimeout(fetch(CONFIG.api.sheets, { headers:{Accept:'application/json'} }), CONFIG.fetchTimeout);
    if (!res.ok) throw new Error('HTTP '+res.status);
    const json = await res.json();
    const values = json.values || json.data || [];
    if (!values.length) throw new Error('planilha vazia');
    const out = parse(values);
    if (!out.dias.length) throw new Error('cabeçalho da tabela diária não encontrado');
    console.log('[Sheets] ✓ '+out.dias.length+' linhas carregadas');
    return out;
  }

  return { fetchData, parse };
})();
