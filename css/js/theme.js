/* js/theme.js — Tema claro/escuro persistente
 * O tema inicial é aplicado por um script inline no <head> (evita flash). */
window.Theme = (function () {
  const SUN  = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/></svg>';

  function current(){ return document.documentElement.getAttribute('data-theme') || 'dark'; }
  function icon(){
    const el = document.getElementById('theme-icon');
    if (el) el.innerHTML = current() === 'dark' ? SUN : MOON;
  }
  function toggle(onChange){
    const next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('dashboard-theme', next); } catch(e){}
    icon();
    if (typeof onChange === 'function') onChange();
  }
  function init(onChange){
    icon();
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', () => toggle(onChange));
  }
  return { init, toggle, current, icon };
})();
