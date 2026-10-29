// Vista previa de la imagen elegida
const input = document.getElementById('inputImagen');
const previa = document.getElementById('previa');
if (input && previa) {
  input.addEventListener('change', () => {
    const f = input.files[0];
    if (!f) { previa.hidden = true; return; }
    previa.src = URL.createObjectURL(f);
    previa.hidden = false;
    const titulo = document.querySelector('input[name="titulo"]');
    if (titulo && !titulo.value) titulo.value = f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  });
}
