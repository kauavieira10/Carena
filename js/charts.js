/* js/charts.js — Gráficos Chart.js (hero acumulado, doughnut de verba, tendência de CPL) */
window.Charts = (function () {
  const inst = {};

  function render(data, platform){
    const P = platform || 'all';
    const text = U.cssVar('--text'), muted = U.cssVar('--muted'), hair = U.cssVar('--hairline');
    Chart.defaults.font.family = 'Inter, sans-serif';
    Chart.defaults.color = muted;
    Object.values(inst).forEach(c => c && c.destroy());

    const labels = data.map(r => r.label);

    // HERO — leads acumulados (área), série conforme plataforma
    const series = data.map(r => P==='google'?r.gLeads : P==='facebook'?r.fLeads : r.totalLeads);
    let acc = 0; const accLeads = series.map(v => acc += v);
    const ctx = document.getElementById('heroChart').getContext('2d');
    const grad = ctx.createLinearGradient(0,0,0,320);
    grad.addColorStop(0,'rgba(31,111,229,0.35)'); grad.addColorStop(1,'rgba(31,111,229,0)');
    inst.hero = new Chart(ctx,{ type:'line', data:{ labels, datasets:[{
      data:accLeads, borderColor:U.cssVar('--primary'), backgroundColor:grad,
      borderWidth:3, fill:true, tension:.4, pointRadius:0, pointHoverRadius:5,
      pointHoverBackgroundColor:U.cssVar('--primary')
    }]}, options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{padding:10, backgroundColor:'rgba(15,31,56,.92)', cornerRadius:10} },
      scales:{ x:{grid:{display:false}, ticks:{maxTicksLimit:8}}, y:{grid:{color:hair}, ticks:{precision:0}} } } });

    // DOUGHNUT — distribuição de verba (sempre comparativo)
    const gSpend = data.reduce((s,r)=>s+r.gSpend,0), fSpend = data.reduce((s,r)=>s+r.fSpend,0);
    inst.doughnut = new Chart(document.getElementById('doughnutChart'),{ type:'doughnut',
      data:{ labels:['Google','Facebook'], datasets:[{ data:[gSpend,fSpend],
        backgroundColor:[U.cssVar('--primary'), U.cssVar('--accent')], borderWidth:0, hoverOffset:8 }]},
      options:{ responsive:true, maintainAspectRatio:false, cutout:'66%',
        plugins:{ legend:{position:'bottom', labels:{usePointStyle:true, padding:16, font:{size:12}}},
          tooltip:{ callbacks:{ label:c=>' '+c.label+': '+U.BRL(c.parsed) } } } } });

    // CPL TREND — linha(s) conforme plataforma
    const sets = [];
    if (P!=='facebook') sets.push({ label:'Google', data:data.map(r=>+r.gCpl.toFixed(1)), borderColor:U.cssVar('--primary'), borderWidth:2.5, tension:.4, pointRadius:0, pointHoverRadius:4 });
    if (P!=='google')   sets.push({ label:'Facebook', data:data.map(r=>+r.fCpl.toFixed(1)), borderColor:U.cssVar('--accent'), borderWidth:2.5, tension:.4, pointRadius:0, pointHoverRadius:4 });
    inst.cpl = new Chart(document.getElementById('cplChart'),{ type:'line', data:{ labels, datasets:sets },
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{position:'bottom', labels:{usePointStyle:true, padding:16, font:{size:12}}},
          tooltip:{ callbacks:{ label:c=>' '+c.dataset.label+': '+U.BRL2(c.parsed.y) } } },
        scales:{ x:{grid:{display:false}, ticks:{maxTicksLimit:8}}, y:{grid:{color:hair}, ticks:{callback:v=>'R$'+v}} } } });
  }

  return { render };
})();
