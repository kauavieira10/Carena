/* js/collapse.js — Cabeçalho "Resumo diário" clicável: começa recolhido,
 * clica e abre a tabela rolável embaixo. Módulo isolado, não toca em app.js. */
(function () {
  function init(){
    var head   = document.getElementById('daily-head');
    var scroll = document.getElementById('daily-scroll');
    var caret  = document.getElementById('daily-caret');
    if (!head || !scroll) return;
    head.addEventListener('click', function () {
      var aberto = scroll.style.display !== 'none';
      scroll.style.display = aberto ? 'none' : '';
      if (caret) caret.textContent = aberto ? '▸' : '▾';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
