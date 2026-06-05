/* js/platform-toggle.js — Botões "Google" / "Meta" no lugar do dropdown.
 * Não toca em app.js: os botões apenas ajustam o <select id="pf-filter">
 * (escondido) e disparam o 'change' que o app.js já escuta. Default: Google. */
(function () {
  function init(){
    var seg = document.getElementById('pf-seg');
    var sel = document.getElementById('pf-filter');
    if (!seg || !sel) return;

    function set(pf){
      sel.value = pf;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      seg.querySelectorAll('.pf-seg-btn').forEach(function (b){
        b.classList.toggle('active', b.dataset.pf === pf);
      });
    }

    seg.addEventListener('click', function (e){
      var b = e.target.closest('.pf-seg-btn');
      if (b) set(b.dataset.pf);
    });

    set('google'); // estado inicial (antes era "Todas as plataformas")
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
