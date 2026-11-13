/* EJV — Pavos de Thanksgiving sobre el video de portada (solo Home).
 * Autorizado por Ender el 13 nov 2026 para la semana de Thanksgiving.
 * Se carga via Shortcoder solo en la Home: busca el Cover con video y
 * monta una capa decorativa (sin interaccion) con 3 pavos que cruzan
 * caminando por la parte baja de la portada en un ciclo de ~45 s.
 * Para retirarlo: quitar el shortcode [ejv_turkeys] de la Home. */
(function () {
  function montar() {
    var video = document.querySelector('.wp-block-cover video');
    if (!video) return;
    var cover = video.closest('.wp-block-cover');
    if (!cover || cover.querySelector('.ejv-tgk')) return;

    var style = document.createElement('style');
    style.textContent =
      '.ejv-tgk{position:absolute;left:0;right:0;bottom:6px;height:84px;overflow:hidden;pointer-events:none}' +
      '.ejv-tgk .flock{position:absolute;bottom:0;left:0;display:flex;gap:10px;align-items:flex-end;transform:translateX(-220px);animation:ejvTgkCross 45s linear infinite}' +
      '.ejv-tgk .t{display:inline-block;animation:ejvTgkBob .52s ease-in-out infinite alternate}' +
      '.ejv-tgk .t2{animation-delay:.13s}' +
      '.ejv-tgk .t3{animation-delay:.26s}' +
      '@keyframes ejvTgkCross{0%{transform:translateX(-220px)}42%{transform:translateX(100vw)}42.01%,100%{transform:translateX(100vw)}}' +
      '@keyframes ejvTgkBob{from{transform:scaleX(-1) rotate(-3deg) translateY(0)}to{transform:scaleX(-1) rotate(3deg) translateY(-3px)}}' +
      '@media (prefers-reduced-motion: reduce){.ejv-tgk{display:none}}';
    document.head.appendChild(style);

    var layer = document.createElement('div');
    layer.className = 'ejv-tgk';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '<div class="flock">' +
      '<span class="t" style="font-size:46px">\uD83E\uDD83</span>' +
      '<span class="t t2" style="font-size:34px">\uD83E\uDD83</span>' +
      '<span class="t t3" style="font-size:26px">\uD83E\uDD83</span>' +
      '</div>';

    var inner = cover.querySelector('.wp-block-cover__inner-container');
    if (inner) cover.insertBefore(layer, inner);
    else cover.appendChild(layer);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montar);
  } else {
    montar();
  }
})();
