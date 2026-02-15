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
      const s = stockDe(key);
      const cantSel = Math.max(1, Math.min(5, Number(caja.dataset.cant || num.textContent || '1')));
      if (s <= 0 || cantSel > s) return;

      const actual = Number(items[key]?.q || 0);
      const nuevo = Math.min(5, actual + cantSel);
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

      disminuirStock(key, cantSel);
      pintarStockEnTarjetas();

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
  const inicio = elem.scrollLeft;
  const delta = objetivo - inicio;
  const distancia = Math.abs(delta);
  const duracion = Math.min(900, Math.max(duracionMin, distancia * 0.6));
  const t0 = performance.now();
  function paso(t) {
    const p = Math.min(1, (t - t0) / duracion);
    const e = 1 - Math.pow(1 - p, 3);
    elem.scrollLeft = inicio + delta * e;
    if (p < 1) requestAnimationFrame(paso);
  }
  requestAnimationFrame(paso);
}

function iniciarCarrusel() {
  const marco = document.querySelector('.fav__marco');
  const pista = document.querySelector('.fav__track');
  const progreso = document.querySelector('.fav__progress');
  const pulgar = document.querySelector('.fav__thumb');
  if (!marco || !pista || !progreso || !pulgar) return;

  function limite(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function maxScroll() {
    return Math.max(0, marco.scrollWidth - marco.clientWidth);
  }

  function anchoUtil() {
    return Math.max(1, pista.clientWidth - pulgar.offsetWidth);
  }

  function posDesdeScroll() {
    const m = maxScroll();
    const p = m > 0 ? marco.scrollLeft / m : 0;
    return p * anchoUtil();
  }

  function scrollDesdePos(x) {
    const a = anchoUtil();
    const p = a > 0 ? x / a : 0;
    return p * maxScroll();
  }

  function actualizar() {
    const m = maxScroll();
    const x = posDesdeScroll();
    progreso.style.width = (m > 0 ? (marco.scrollLeft / m) * 100 : 0) + '%';
    pulgar.style.left = x + 'px';
    pista.classList.toggle('is-hidden', m <= 2);
  }

  let arrastrando = false;
  let offsetPulgar = 0;
  let raf = null;
  let xObjetivo = 0;

  function moverSegunPulgar(xCliente) {
    const rect = pista.getBoundingClientRect();
    let x = xCliente - rect.left - offsetPulgar;
    x = limite(x, 0, anchoUtil());
    xObjetivo = x;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = null;
        const s = scrollDesdePos(xObjetivo);
        marco.scrollLeft = s;
        progreso.style.width = (maxScroll() > 0 ? (s / maxScroll()) * 100 : 0) + '%';
        pulgar.style.left = xObjetivo + 'px';
      });
    }
  }

  pulgar.addEventListener('pointerdown', e => {
    arrastrando = true;
    try { pulgar.setPointerCapture(e.pointerId) } catch(_) {}
    const r = pulgar.getBoundingClientRect();
    offsetPulgar = e.clientX - r.left;
    document.body.style.userSelect = 'none';
  });

  pulgar.addEventListener('pointermove', e => {
    if (!arrastrando) return;
    moverSegunPulgar(e.clientX);
  });

  function soltar(e) {
    if (!arrastrando) return;
    arrastrando = false;
    try { pulgar.releasePointerCapture(e.pointerId) } catch(_) {}
    document.body.style.userSelect = '';
  }

  pulgar.addEventListener('pointerup', soltar);
  pulgar.addEventListener('pointercancel', soltar);
  pulgar.addEventListener('lostpointercapture', soltar);

  pista.addEventListener('click', e => {
    if (e.target === pulgar) return;
    const rect = pista.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left - pulgar.offsetWidth / 2));
    const s = scrollDesdePos(x);
    marco.scrollTo({ left: s, behavior: 'smooth' });
  });

  marco.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);
  actualizar();
}

function enfocarFavoritos() {
  const seccion = document.querySelector('.favoritos');
  if (!seccion) return;
  const cab = document.querySelector('.cabecera');
  const altoCab = cab ? cab.offsetHeight : 64;
  const rect = seccion.getBoundingClientRect();
  const y = Math.max(0, window.scrollY + rect.top - (altoCab + 200));
  window.scrollTo({ top: y, behavior: 'smooth' });

  const marco = seccion.querySelector('.fav__marco');
  const item = seccion.querySelector('.fav__item');
  if (!marco || !item) return;
  const objetivo = Math.max(0, item.offsetLeft - (marco.clientWidth - item.clientWidth) / 2);
  marco.scrollTo({ left: objetivo, behavior: 'smooth' });
}

document.addEventListener('click', e => {
  const boton = e.target.closest('a,button');
  if (!boton) return;
  const texto = (boton.textContent || '').trim().toUpperCase();
  if (texto === 'COMPRAR AHORA') {
    e.preventDefault();
    enfocarFavoritos();
  }
});

function normalizar(t) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function irAMapa(q) {
  const modal = document.getElementById('modalMapa');
  const frame = document.getElementById('iframeMapa');
  if (!modal || !frame) return;
  const consulta = q && q.length ? q : 'panaderia';
  const url = 'https://maps.google.com/maps?output=embed&q=' + encodeURIComponent(consulta);
  frame.src = url;
  modal.hidden = false;
}

function cerrarMapa() {
  const modal = document.getElementById('modalMapa');
  const frame = document.getElementById('iframeMapa');
  if (!modal || !frame) return;
  frame.src = '';
  modal.hidden = true;
}

function enfocarItemPorNombre(busqueda) {
  const seccion = document.querySelector('.favoritos');
  const marco = document.querySelector('.fav__marco');
  const itemsEls = Array.from(document.querySelectorAll('.fav__item'));
  if (!seccion || !marco || !itemsEls.length) return;
  const nombreLimpio = normalizar(busqueda);
  let objetivo = itemsEls.find(el => normalizar(el.querySelector('.fav__nombre')?.textContent || '').includes(nombreLimpio));
  if (!objetivo) objetivo = itemsEls[0];
  const cab = document.querySelector('.cabecera');
  const altoCab = cab ? cab.offsetHeight : 64;
  const rect = seccion.getBoundingClientRect();
  const y = Math.max(0, window.scrollY + rect.top - (altoCab + 14));
  window.scrollTo({ top: y, behavior: 'smooth' });
  const x = Math.max(0, objetivo.offsetLeft - (marco.clientWidth - objetivo.clientWidth) / 2);
  marco.scrollTo({ left: x, behavior: 'smooth' });
}

document.addEventListener('click', e => {
  const abre = e.target.closest('#abrirMapa,#eligeDireccion');
  const cierra = e.target.closest('#cerrarMapa,#modalMapa');
  if (abre) {
    e.preventDefault();
    irAMapa('');
  }
  if (cierra) {
    if (cierra.id === 'modalMapa' && e.target !== cierra) return;
    cerrarMapa();
  }
});

document.addEventListener('submit', e => {
  if (!e.target.matches('#formBuscar')) return;
  e.preventDefault();
  const v = e.target.querySelector('#textoBuscar')?.value || '';
  if (!v.trim()) return;
  enfocarItemPorNombre(v);
});

let inventario = {};

function cargarInventario() {
  try { inventario = JSON.parse(localStorage.getItem('inventario_dimiza') || '{}'); } catch(_) { inventario = {}; }
}

function guardarInventario() {
  localStorage.setItem('inventario_dimiza', JSON.stringify(inventario));
}

function k(nombre) {
  return String(nombre || '').toLowerCase().trim();
}

function stockDe(nombre) {
  cargarInventario();
  return Number(inventario[k(nombre)]?.s || 0);
}

function precioDe(nombre) {
  cargarInventario();
  return Number(inventario[k(nombre)]?.p || 0);
}

function imgDe(nombre) {
  cargarInventario();
  return String(inventario[k(nombre)]?.img || '');
}

function fijarProducto(nombre, s, p, img) {
  cargarInventario();
  const clave = k(nombre);
  inventario[clave] = { s: Math.max(0, Number(s) || 0), p: Math.max(0, Number(p) || 0), img: img || '' };
  guardarInventario();
}

function disminuirStock(nombre, q) {
  cargarInventario();
  const clave = k(nombre);
  const s = Math.max(0, Number(inventario[clave]?.s || 0) - Number(q || 0));
  if (inventario[clave]) inventario[clave].s = s;
  guardarInventario();
}

function aumentarStock(nombre, q) {
  cargarInventario();
  const clave = k(nombre);
  const s = Math.max(0, Number(inventario[clave]?.s || 0) + Number(q || 0));
  if (!inventario[clave]) inventario[clave] = { s: 0, p: 0, img: '' };
  inventario[clave].s = s;
  guardarInventario();
}

function inicializarInventarioDesdeDom() {
  cargarInventario();
  document.querySelectorAll('.fav__item').forEach(t => {
    const nombre = claveDe(t);
    const clave = k(nombre);
    if (!inventario[clave]) {
      const s = Number(t.getAttribute('data-stock') || 0);
      const precioTxt = t.querySelector('.fav__precio')?.textContent || '0';
      const p = parseInt((precioTxt.match(/\d+/g) || ['0']).join(''), 10) || 0;
      const img = t.querySelector('img')?.src || '';
      inventario[clave] = { s: Math.max(0, s), p: Math.max(0, p), img: img };
    }
  });
  guardarInventario();
}

function pintarStockEnTarjetas() {
  const tarjetas = document.querySelectorAll('.fav__item');
  tarjetas.forEach(t => {
    const nombre = claveDe(t);
    const s = stockDe(nombre);
    let badge = t.querySelector('.fav__stock');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'fav__stock';
      t.appendChild(badge);
    }
    badge.textContent = s > 0 ? 'Stock: ' + s : 'Sin stock';
    t.classList.toggle('is-sin-stock', s <= 0);
  });
}

function pintarInventario() {
  const lista = document.getElementById('listaInventario');
  if (!lista) return;
  cargarInventario();
  lista.innerHTML = '';
  Object.keys(inventario).sort().forEach(n => {
    const obj = inventario[n];
    const fila = document.createElement('div');
    fila.className = 'inventario__fila';
    fila.innerHTML =
      '<div class="inventario__col">' + n + '</div>' +
      '<div class="inventario__col">' + obj.s + '</div>' +
      '<div class="inventario__col">S/ ' + Number(obj.p).toFixed(2) + '</div>' +
      '<div class="inventario__col">' + (obj.img || '') + '</div>' +
      '<div class="inventario__col inventario__acciones">' +
      '<button class="inventario__btn" data-accion="mas" data-nombre="' + n + '">+1</button>' +
      '<button class="inventario__btn" data-accion="menos" data-nombre="' + n + '">-1</button>' +
      '<button class="inventario__btn" data-accion="borrar" data-nombre="' + n + '">Quitar</button>' +
      '</div>';
    lista.appendChild(fila);
  });
}

function iniciarInventario() {
  const form = document.getElementById('formInventario');
  if (!form) return;
  cargarInventario();
  pintarInventario();

  form.addEventListener('submit', e => {
    e.preventDefault();
    const n = document.getElementById('invNombre').value.trim();
    const s = document.getElementById('invStock').value;
    const p = document.getElementById('invPrecio').value;
    const img = document.getElementById('invImg').value.trim();
    if (!n) return;
    fijarProducto(n, s, p, img);
    pintarInventario();
    pintarStockEnTarjetas();
    form.reset();
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('.inventario__btn');
    if (!btn) return;
    const acc = btn.dataset.accion;
    const n = btn.dataset.nombre;
    if (acc === 'mas') aumentarStock(n, 1);
    if (acc === 'menos') disminuirStock(n, 1);
    if (acc === 'borrar') { cargarInventario(); delete inventario[k(n)]; guardarInventario(); }
    pintarInventario();
    pintarStockEnTarjetas();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await incluirPartes();
  ajustarOffset();
  inicializarInventarioDesdeDom();
  iniciarCantidadYCarrito();
  iniciarPagar();
  iniciarCarrusel();
  pintarStockEnTarjetas();
  iniciarInventario();
});

// reporte
function mostrarReporte(tipo, boton) {

    // Quitar estado activo a todos los botones
    const botones = document.querySelectorAll(".btn-reporte");
    botones.forEach(btn => btn.classList.remove("activo"));

    // Activar botón seleccionado
    boton.classList.add("activo");

    const contenido = document.getElementById("reportes-contenido");

    if (tipo === "ventas") {
        contenido.innerHTML = `
            <table>
                <tr>
                    <th>Fecha</th>
                    <th>N° Venta</th>
                    <th>Cliente</th>
                    <th>Método Pago</th>
                    <th>Total (S/)</th>
                    <th>Estado</th>
                </tr>
                <tr>
                    <td>01/02/2026</td>
                    <td>V001</td>
                    <td>Juan Pérez</td>
                    <td>Tarjeta</td>
                    <td>1500</td>
                    <td>Completada</td>
                </tr>
                <tr>
                    <td>02/02/2026</td>
                    <td>V002</td>
                    <td>María López</td>
                    <td>Yape</td>
                    <td>2100</td>
                    <td>Completada</td>
                </tr>
                <tr>
                    <td>03/02/2026</td>
                    <td>V003</td>
                    <td>Carlos Ruiz</td>
                    <td>Efectivo</td>
                    <td>890</td>
                    <td>Pendiente</td>
                </tr>
            </table>
        `;
    }

    if (tipo === "inventario") {
        contenido.innerHTML = `
            <table>
                <tr>
                    <th>ID</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Precio (S/)</th>
                    <th>Estado</th>
                </tr>
                <tr>
                    <td>P001</td>
                    <td>Laptop</td>
                    <td>Tecnología</td>
                    <td>12</td>
                    <td>3200</td>
                    <td>Disponible</td>
                </tr>
                <tr>
                    <td>P002</td>
                    <td>Mouse</td>
                    <td>Accesorios</td>
                    <td>40</td>
                    <td>45</td>
                    <td>Disponible</td>
                </tr>
                <tr>
                    <td>P003</td>
                    <td>Teclado</td>
                    <td>Accesorios</td>
                    <td>0</td>
                    <td>120</td>
                    <td>Agotado</td>
                </tr>
            </table>
        `;
    }

    if (tipo === "clientes") {
        contenido.innerHTML = `
            <table>
                <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Compras</th>
                    <th>Total Gastado (S/)</th>
                </tr>
                <tr>
                    <td>C001</td>
                    <td>Juan Pérez</td>
                    <td>juan@mail.com</td>
                    <td>999111222</td>
                    <td>5</td>
                    <td>4500</td>
                </tr>
                <tr>
                    <td>C002</td>
                    <td>María López</td>
                    <td>maria@mail.com</td>
                    <td>988222333</td>
                    <td>3</td>
                    <td>2100</td>
                </tr>
                <tr>
                    <td>C003</td>
                    <td>Carlos Ruiz</td>
                    <td>carlos@mail.com</td>
                    <td>977333444</td>
                    <td>2</td>
                    <td>890</td>
                </tr>
            </table>
        `;
    }
}
