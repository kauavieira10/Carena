/* js/campaigns.js — Top campanhas Google Ads (snapshot estático, Opção A).
 * Módulo ISOLADO: não toca em app.js/charts.js. Lê window.GOOGLE_CAMPAIGNS,
 * renderiza no #campaigns-body e some quando o filtro está em "facebook". */
window.Campaigns = (function () {

  function typeOf(name){
    if (/\[Pmax\]/i.test(name))   return 'PMax';
    if (/\[Search\]/i.test(name)) return 'Search';
    return '—';
  }
  // remove rótulos internos ([Acesso], [Search], [MaxConv], [Pmax]) p/ exibir limpo
  function cleanName(name){
    return String(name||'')
      .replace(/\[(Acesso|Search|Pmax|MaxConv)\]/ig, '')
      .replace(/^[\s-]+|[\s-]+$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim() || name;
  }

  function render(){
    const body = document.getElementById('campaigns-body');
    if (!body) return;
    const list = (window.GOOGLE_CAMPAIGNS || []).slice().sort((a,b)=> b.spend - a.spend);

    const totSpend = list.reduce((s,c)=> s + (c.spend||0), 0);
    const totConv  = list.reduce((s,c)=> s + (c.conversions||0), 0);
    const cnt = document.getElementById('campaigns-count');
    if (cnt) cnt.textContent = list.length + ' campanhas · ' + U.BRL(totSpend) + ' · ' + U.NUM(totConv) + ' conv.';

    body.innerHTML = list.map(c => `
      <tr>
        <td title="${c.name}">${cleanName(c.name)}</td>
        <td style="color:var(--muted)">${typeOf(c.name)}</td>
        <td>${U.BRL2(c.spend)}</td>
        <td>${U.NUM(c.clicks)}</td>
        <td style="font-weight:700">${U.NUM(c.conversions)}</td>
        <td>${U.BRL2(c.cpa)}</td>
      </tr>`).join('');
  }

  function toggle(pf){
    const card = document.getElementById('campaigns-card');
    if (card) card.style.display = (pf === 'facebook') ? 'none' : '';
  }

  function init(){
    render();
    const sel = document.getElementById('pf-filter');
    if (sel){
      toggle(sel.value);
      sel.addEventListener('change', e => toggle(e.target.value));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { render, toggle };
})();
