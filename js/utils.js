/* js/utils.js — Formatadores e helpers */
window.U = (function () {
  const BRL  = n => 'R$ ' + Number(n||0).toLocaleString('pt-BR', { minimumFractionDigits:0, maximumFractionDigits:0 });
  const BRL2 = n => 'R$ ' + Number(n||0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
  const NUM  = n => Number(n||0).toLocaleString('pt-BR');
  const cssVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();

  // "R$ 1.234,56" | "R$1234,56" | "206,13" -> 1234.56
  const parseBRL = v => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const s = String(v).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };
  const parseInt0 = v => {
    const n = parseInt(String(v||'').replace(/[^\d-]/g,''), 10);
    return isNaN(n) ? 0 : n;
  };

  const WD = {
    'segunda-feira':'Seg','terça-feira':'Ter','terca-feira':'Ter','quarta-feira':'Qua',
    'quinta-feira':'Qui','sexta-feira':'Sex','sábado':'Sáb','sabado':'Sáb','domingo':'Dom'
  };
  const weekdayShort = full => WD[String(full||'').trim().toLowerCase()] || (full||'').slice(0,3);

  // "01/05/2026" -> Date
  const parseDate = v => {
    const m = String(v||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    let [_, d, mo, y] = m; y = y.length === 2 ? '20'+y : y;
    return new Date(+y, +mo-1, +d);
  };

  return { BRL, BRL2, NUM, cssVar, parseBRL, parseInt0, weekdayShort, parseDate };
})();
