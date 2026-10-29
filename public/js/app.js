// Menú móvil
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
if (burger && nav) {
  burger.addEventListener('click', () => {
    const abierto = nav.classList.toggle('abierto');
    burger.setAttribute('aria-expanded', abierto);
  });
}

// Filtros de la galería: se aplican al cambiar la selección
const form = document.getElementById('filtros');
if (form) {
  const sel = document.getElementById('selCategoria');
  sel.addEventListener('change', () => {
    // Al cambiar de categoría la lista de etiquetas cambia: se limpian las seleccionadas
    form.querySelectorAll('input[name="etiqueta"]').forEach((c) => (c.checked = false));
    form.submit();
  });
  form.querySelectorAll('input[name="etiqueta"]').forEach((c) => c.addEventListener('change', () => form.submit()));
}
