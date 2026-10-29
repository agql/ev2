(() => {
  const visor = document.getElementById('visor');
  const modal = document.getElementById('modal');
  const stage = document.getElementById('stage');
  const img = document.getElementById('zImg');
  let scale = 1, x = 0, y = 0;

  // ---- Navegación: teclado y gestos táctiles ----
  const ir = (url) => { if (url) location.href = url; };
  document.addEventListener('keydown', (e) => {
    if (!modal.hidden) { if (e.key === 'Escape') cerrar(); return; }
    if (e.key === 'ArrowLeft') ir(visor.dataset.prev);
    else if (e.key === 'ArrowRight') ir(visor.dataset.next);
    else if (e.key === 'Escape') document.querySelector('.cerrar').click();
  });
  let tx = null, ty = null;
  const foto = document.getElementById('foto');
  foto.addEventListener('touchstart', (e) => { if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } else tx = null; }, { passive: true });
  foto.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    tx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) ir(dx > 0 ? visor.dataset.prev : visor.dataset.next);
  });

  // ---- Zoom en ventana emergente ----
  const aplicar = () => { img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`; };
  function reset() { scale = 1; x = 0; y = 0; aplicar(); }
  function abrir() { reset(); modal.hidden = false; document.getElementById('zClose').focus(); }
  function cerrar() { modal.hidden = true; }

  // Zoom alrededor de un punto (cx, cy relativo al centro del stage)
  function zoomEn(nuevo, cx = 0, cy = 0) {
    nuevo = Math.min(8, Math.max(1, nuevo));
    const k = nuevo / scale;
    x = cx - (cx - x) * k;
    y = cy - (cy - y) * k;
    scale = nuevo;
    if (scale === 1) { x = 0; y = 0; }
    aplicar();
  }
  const centro = (e) => {
    const r = stage.getBoundingClientRect();
    return [e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)];
  };

  document.getElementById('btnZoom').addEventListener('click', abrir);
  document.getElementById('zClose').addEventListener('click', cerrar);
  document.getElementById('zIn').addEventListener('click', () => zoomEn(scale * 1.5));
  document.getElementById('zOut').addEventListener('click', () => zoomEn(scale / 1.5));
  document.getElementById('zReset').addEventListener('click', reset);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [cx, cy] = centro(e);
    zoomEn(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), cx, cy);
  }, { passive: false });

  stage.addEventListener('dblclick', (e) => {
    const [cx, cy] = centro(e);
    scale > 1 ? reset() : zoomEn(2.5, cx, cy);
  });

  // Arrastre con un dedo/ratón y pellizco con dos dedos
  const punteros = new Map();
  let distIni = 0, escalaIni = 1;
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      distIni = Math.hypot(a.x - b.x, a.y - b.y); escalaIni = scale;
    }
    stage.classList.add('arrastrando');
  });
  stage.addEventListener('pointermove', (e) => {
    const p = punteros.get(e.pointerId);
    if (!p) return;
    if (punteros.size === 2) {
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...punteros.values()];
      const r = stage.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - (r.left + r.width / 2), my = (a.y + b.y) / 2 - (r.top + r.height / 2);
      zoomEn(escalaIni * Math.hypot(a.x - b.x, a.y - b.y) / distIni, mx, my);
    } else if (scale > 1) {
      x += e.clientX - p.x; y += e.clientY - p.y;
      punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      aplicar();
    }
  });
  const soltar = (e) => { punteros.delete(e.pointerId); if (!punteros.size) stage.classList.remove('arrastrando'); };
  stage.addEventListener('pointerup', soltar);
  stage.addEventListener('pointercancel', soltar);
})();
