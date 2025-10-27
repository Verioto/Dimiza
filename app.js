async function incluirPartes() {
  const nodos = document.querySelectorAll('[data-include]');
  for (const n of nodos) {
    const url = n.getAttribute('data-include');
    const res = await fetch(url);
    const html = await res.text();
    n.outerHTML = html;
  }
}

function ajustarOffset() {
  const h = document.querySelector('.cabecera');
  if (h) document.body.style.paddingTop = h.offsetHeight + 'px';
}

let items = {};

function cargarItems() {
  try {
    items = JSON.parse(localStorage.getItem('carrito_items') || '{}');
  } catch (_) {
    items = {};
  }
}

function guardarItems() {
  localStorage.setItem('carrito_items', JSON.stringify(items));
}

function totalDesdeItems() {
  return Object.values(items).reduce((a, b) => a + Number((b && b.q) || 0), 0);
}

function pintarInsignia() {
  const b = document.querySelector('.carrito__num');
  if (!b) return;
  cargarItems();
  b.textContent = String(totalDesdeItems()).padStart(2, '0');
}

function claveDe(tarjeta) {
  const n = tarjeta.querySelector('.fav__nombre');
  return n ? n.textContent.trim().toLowerCase() : 'item';
}

function iniciarCantidadYCarrito() {
  cargarItems();
  pintarInsignia();

  document.addEventListener('click', e => {
    const menos = e.target.closest?.('.cantidad__btn--menos');
    const mas = e.target.closest?.('.cantidad__btn--mas');
    const agregar = e.target.closest?.('.fav__cta');
    if (!menos && !mas && !agregar) return;

    const tarjeta = e.target.closest?.('.fav__item');
    if (!tarjeta) return;

    const caja = tarjeta.querySelector('.cantidad');
    const num = tarjeta.querySelector('.cantidad__num');
    if (!caja || !num) return;

    let cant = Number(caja.dataset.cant || num.textContent || '1');

    if (menos) {
      cant = Math.max(1, cant - 1);
      caja.dataset.cant = String(cant);
      num.textContent = cant;
      caja.classList.toggle('is-max', cant === 5);
      return;
    }

    if (mas) {
      cant = Math.min(5, cant + 1);
      caja.dataset.cant = String(cant);
      num.textContent = cant;
      caja.classList.toggle('is-max', cant === 5);
      return;
    }

    if (agregar) {
      const key = claveDe(tarjeta);
      const actual = Number(items[key]?.q || 0);
      const nuevo = Math.min(5, actual + cant);
      const agregado = nuevo - actual;
      if (agregado <= 0) {
        caja.classList.add('is-max');
        num.textContent = '5';
        return;
      }
      const precioTxt = tarjeta.querySelector('.fav__precio')?.textContent || '0';
      const precio = parseInt((precioTxt.match(/\d+/g) || ['0']).join(''), 10) || 0;
      const img = tarjeta.querySelector('img')?.src || '';
      items[key] = { q: nuevo, p: precio, img: img };
      guardarItems();
      pintarInsignia();
      caja.dataset.cant = '1';
      num.textContent = '1';
      caja.classList.toggle('is-max', nuevo === 5);
      return;
    }
  });
}

function s(v) {
  return 'S/ ' + Number(v).toFixed(2);
}

function pintarPagar() {
  const lista = document.getElementById('pagoLista');
  const sub = document.getElementById('pagoSubtotal');
  const tot = document.getElementById('pagoTotal');
  if (!lista || !sub || !tot) return;

  cargarItems();
  lista.innerHTML = '';
  let suma = 0;

  Object.entries(items).forEach(([nombre, info]) => {
    const q = Number(info?.q || 0);
    const p = Number(info?.p || 0);
    const img = info?.img || '';
    const el = document.createElement('div');
    el.className = 'pago__item';
    el.innerHTML =
      '<img class="pago__img" src="' + img + '">' +
      '<div class="pago__info">' +
      '<div class="pago__nom">' + nombre + '</div>' +
      '<div class="pago__acc">' +
      '<select class="pago__sel">' +
      [1, 2, 3, 4, 5].map(n => '<option' + (n === q ? ' selected' : '') + '>' + n + '</option>').join('') +
      '</select>' +
      '<button class="pago__del">Quitar</button>' +
      '</div>' +
      '</div>' +
      '<div class="pago__precio">' + s(q * p) + '</div>';
    lista.appendChild(el);

    el.querySelector('.pago__sel').addEventListener('change', ev => {
      let nv = Number(ev.target.value || 1);
      if (nv < 1) nv = 1;
      if (nv > 5) nv = 5;
      if (items[nombre]) {
        items[nombre].q = nv;
        guardarItems();
        pintarPagar();
        pintarInsignia();
      }
    });

    el.querySelector('.pago__del').addEventListener('click', () => {
      delete items[nombre];
      guardarItems();
      pintarPagar();
      pintarInsignia();
    });

    suma += q * p;
  });

  sub.textContent = s(suma);
  tot.textContent = s(suma);
}

function iniciarPagar() {
  if (document.getElementById('pagoLista')) {
    pintarPagar();
    const fin = document.getElementById('pagoFinalizar');
    if (fin) {
      fin.addEventListener('click', () => {
        localStorage.removeItem('carrito_items');
        localStorage.removeItem('carrito_total');
        window.location.href = 'index.html';
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await incluirPartes();
  ajustarOffset();
  iniciarCantidadYCarrito();
  iniciarPagar();
  iniciarCarrusel();
});

window.addEventListener('resize', ajustarOffset);

function desplazarSuave(elem, objetivo, duracion) {
  const inicio = elem.scrollLeft;
  const delta = objetivo - inicio;
  const t0 = performance.now();
  function paso(t) {
    const p = Math.min(1, (t - t0) / duracion);
    const e = 1 - Math.pow(1 - p, 3);
    elem.scrollLeft = inicio + delta * e;
    if (p < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}
function desplazarSuave(elem, objetivo, duracionMin) {
  const inicio = elem.scrollLeft
  const delta = objetivo - inicio
  const distancia = Math.abs(delta)
  const duracion = Math.min(900, Math.max(duracionMin, distancia * 0.6))
  const t0 = performance.now()
  function paso(t) {
    const p = Math.min(1, (t - t0) / duracion)
    const e = 1 - Math.pow(1 - p, 3)
    elem.scrollLeft = inicio + delta * e
    if (p < 1) requestAnimationFrame(paso)
  }
  requestAnimationFrame(paso)
}

function iniciarCarrusel() {
  const marco = document.querySelector('.fav__marco')
  const pista = document.querySelector('.fav__track')
  const progreso = document.querySelector('.fav__progress')
  const pulgar = document.querySelector('.fav__thumb')
  if (!marco || !pista || !progreso || !pulgar) return

  function limite(v, a, b) {
    return Math.max(a, Math.min(b, v))
  }

  function maxScroll() {
    return Math.max(0, marco.scrollWidth - marco.clientWidth)
  }

  function anchoUtil() {
    return Math.max(1, pista.clientWidth - pulgar.offsetWidth)
  }

  function posDesdeScroll() {
    const m = maxScroll()
    const p = m > 0 ? marco.scrollLeft / m : 0
    return p * anchoUtil()
  }

  function scrollDesdePos(x) {
    const a = anchoUtil()
    const p = a > 0 ? x / a : 0
    return p * maxScroll()
  }

  function actualizar() {
    const m = maxScroll()
    const x = posDesdeScroll()
    progreso.style.width = (m > 0 ? (marco.scrollLeft / m) * 100 : 0) + '%'
    pulgar.style.left = x + 'px'
    pista.classList.toggle('is-hidden', m <= 2)
  }

  let arrastrando = false
  let offsetPulgar = 0
  let raf = null
  let xObjetivo = 0

  function moverSegunPulgar(xCliente) {
    const rect = pista.getBoundingClientRect()
    let x = xCliente - rect.left - offsetPulgar
    x = limite(x, 0, anchoUtil())
    xObjetivo = x
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = null
        const s = scrollDesdePos(xObjetivo)
        marco.scrollLeft = s
        progreso.style.width = (maxScroll() > 0 ? (s / maxScroll()) * 100 : 0) + '%'
        pulgar.style.left = xObjetivo + 'px'
      })
    }
  }

  pulgar.addEventListener('pointerdown', e => {
    arrastrando = true
    try { pulgar.setPointerCapture(e.pointerId) } catch(_) {}
    const r = pulgar.getBoundingClientRect()
    offsetPulgar = e.clientX - r.left
    document.body.style.userSelect = 'none'
  })

  pulgar.addEventListener('pointermove', e => {
    if (!arrastrando) return
    moverSegunPulgar(e.clientX)
  })

  function soltar(e) {
    if (!arrastrando) return
    arrastrando = false
    try { pulgar.releasePointerCapture(e.pointerId) } catch(_) {}
    document.body.style.userSelect = ''
  }

  pulgar.addEventListener('pointerup', soltar)
  pulgar.addEventListener('pointercancel', soltar)
  pulgar.addEventListener('lostpointercapture', soltar)

  pista.addEventListener('click', e => {
    if (e.target === pulgar) return
    const rect = pista.getBoundingClientRect()
    const x = limite(e.clientX - rect.left - pulgar.offsetWidth / 2, 0, anchoUtil())
    const s = scrollDesdePos(x)
    marco.scrollTo({ left: s, behavior: 'smooth' })
  })

  marco.addEventListener('scroll', actualizar, { passive: true })
  window.addEventListener('resize', actualizar)
  actualizar()
}

function enfocarFavoritos() {
  const seccion = document.querySelector('.favoritos')
  if (!seccion) return
  const cab = document.querySelector('.cabecera')
  const altoCab = cab ? cab.offsetHeight : 64
  const rect = seccion.getBoundingClientRect()
  const y = Math.max(0, window.scrollY + rect.top - (altoCab + 200))
  window.scrollTo({ top: y, behavior: 'smooth' })

  const marco = seccion.querySelector('.fav__marco')
  const item = seccion.querySelector('.fav__item')
  if (!marco || !item) return
  const objetivo = Math.max(0, item.offsetLeft - (marco.clientWidth - item.clientWidth) / 2)
  marco.scrollTo({ left: objetivo, behavior: 'smooth' })
}

document.addEventListener('click', e => {
  const boton = e.target.closest('a,button')
  if (!boton) return
  const texto = (boton.textContent || '').trim().toUpperCase()
  if (texto === 'COMPRAR AHORA') {
    e.preventDefault()
    enfocarFavoritos()
  }
})

function normalizar(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function irAMapa(q) {
  const modal = document.getElementById('modalMapa')
  const frame = document.getElementById('iframeMapa')
  if (!modal || !frame) return
  const consulta = q && q.length ? q : 'panaderia'
  const url = 'https://www.google.com/maps?q=' + encodeURIComponent(consulta)
  frame.src = url
  modal.hidden = false
}

function cerrarMapa() {
  const modal = document.getElementById('modalMapa')
  const frame = document.getElementById('iframeMapa')
  if (!modal || !frame) return
  frame.src = ''
  modal.hidden = true
}

function irAMapa(q) {
  const modal = document.getElementById('modalMapa')
  const frame = document.getElementById('iframeMapa')
  if (!modal || !frame) return
  const consulta = q && q.length ? q : 'panaderia'
  const url = 'https://maps.google.com/maps?output=embed&q=' + encodeURIComponent(consulta)
  frame.src = url
  modal.hidden = false
}

function cerrarMapa() {
  const modal = document.getElementById('modalMapa')
  const frame = document.getElementById('iframeMapa')
  if (!modal || !frame) return
  frame.src = ''
  modal.hidden = true
}

function normalizar(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function enfocarItemPorNombre(busqueda) {
  const seccion = document.querySelector('.favoritos')
  const marco = document.querySelector('.fav__marco')
  const items = Array.from(document.querySelectorAll('.fav__item'))
  if (!seccion || !marco || !items.length) return
  const nombreLimpio = normalizar(busqueda)
  let objetivo = items.find(el => normalizar(el.querySelector('.fav__nombre')?.textContent || '').includes(nombreLimpio))
  if (!objetivo) objetivo = items[0]
  const cab = document.querySelector('.cabecera')
  const altoCab = cab ? cab.offsetHeight : 64
  const rect = seccion.getBoundingClientRect()
  const y = Math.max(0, window.scrollY + rect.top - (altoCab + 14))
  window.scrollTo({ top: y, behavior: 'smooth' })
  const x = Math.max(0, objetivo.offsetLeft - (marco.clientWidth - objetivo.clientWidth) / 2)
  marco.scrollTo({ left: x, behavior: 'smooth' })
}

document.addEventListener('click', e => {
  const abre = e.target.closest('#abrirMapa,#eligeDireccion')
  const cierra = e.target.closest('#cerrarMapa,#modalMapa')
  if (abre) {
    e.preventDefault()
    irAMapa('')
  }
  if (cierra) {
    if (cierra.id === 'modalMapa' && e.target !== cierra) return
    cerrarMapa()
  }
})

document.addEventListener('submit', e => {
  if (!e.target.matches('#formBuscar')) return
  e.preventDefault()
  const v = e.target.querySelector('#textoBuscar')?.value || ''
  if (!v.trim()) return
  enfocarItemPorNombre(v)
})

