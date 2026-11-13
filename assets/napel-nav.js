/* Menu do celular do cabeçalho único Napel. */
(function () {
  var h = document.querySelector('.nph'); if (!h) return;
  var b = h.querySelector('.nph-burger'); if (!b) return;
  function set(open) {
    h.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
    b.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  b.addEventListener('click', function () { set(!h.classList.contains('open')); });
  h.querySelectorAll('.nph-panel a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && h.classList.contains('open')) { set(false); b.focus(); }
  });
  window.matchMedia('(min-width:1100px)').addEventListener('change', function (m) { if (m.matches) set(false); });
})();
