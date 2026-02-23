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
let accesoInventarioPermitido = false;

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
    if (!e.target.closest) return;
    const menos = e.target.closest('.cantidad__btn--menos');
    const mas = e.target.closest('.cantidad__btn--mas');
    const agregar = e.target.closest('.fav__cta');
    if (!menos && !mas && !agregar) return;

    const tarjeta = e.target.closest('.fav__item');
    if (!tarjeta) return;

    const caja = tarjeta.querySelector('.cantidad');
    const num = tarjeta.querySelector('.cantidad__num');
    if (!caja || !num) return;

    let cant = Number(caja.dataset.cant || num.textContent || '1');
    const key = claveDe(tarjeta);
    const stockActual = stockDe(key);

    if (menos) {
      cant = Math.max(1, cant - 1);
      caja.dataset.cant = String(cant);
      num.textContent = cant;
      caja.classList.toggle('is-max', cant >= stockActual);
      return;
    }

    if (mas) {
      cant = Math.min(stockActual, cant + 1);
      caja.dataset.cant = String(cant);
      num.textContent = cant;
      caja.classList.toggle('is-max', cant >= stockActual);
      return;
    }

    if (agregar) {
      const cantSel = Math.max(1, Math.min(stockActual, Number(caja.dataset.cant || num.textContent || '1')));
      if (stockActual <= 0 || cantSel > stockActual) return;

      const actual = Number(items[key]?.q || 0);
      const nuevo = actual + cantSel;
      
      const precioTxt = tarjeta.querySelector('.fav__precio')?.textContent || '0';
      const match = precioTxt.match(/[\d.]+/);
      const precio = match ? parseFloat(match[0]) : 0;
      
      const img = tarjeta.querySelector('img')?.src || '';
      items[key] = { q: nuevo, p: precio, img: img };
      guardarItems();
      pintarInsignia();

      disminuirStock(key, cantSel);
      pintarStockEnTarjetas();

      caja.dataset.cant = '1';
      num.textContent = '1';
      caja.classList.toggle('is-max', stockDe(key) <= 1);
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
    
    const stockDisponible = stockDe(nombre);
    const maxOpciones = q + stockDisponible;
    const limiteVisual = Math.max(1, maxOpciones);

    let opcionesHtml = '';
    for (let n = 1; n <= limiteVisual; n++) {
      opcionesHtml += '<option' + (n === q ? ' selected' : '') + '>' + n + '</option>';
    }

    const el = document.createElement('div');
    el.className = 'pago__item';
    el.innerHTML =
      '<img class="pago__img" src="' + img + '">' +
      '<div class="pago__info">' +
      '<div class="pago__nom">' + nombre + '</div>' +
      '<div class="pago__acc">' +
      '<select class="pago__sel">' +
      opcionesHtml +
      '</select>' +
      '<button class="pago__del">Quitar</button>' +
      '</div>' +
      '</div>' +
      '<div class="pago__precio">' + s(q * p) + '</div>';
    lista.appendChild(el);

    el.querySelector('.pago__sel').addEventListener('change', ev => {
      let nv = Number(ev.target.value || 1);
      if (nv < 1) nv = 1;
      if (nv > maxOpciones) nv = maxOpciones;
      if (items[nombre]) {
        const diferencia = nv - items[nombre].q;
        items[nombre].q = nv;
        guardarItems();
        if (diferencia > 0) disminuirStock(nombre, diferencia);
        if (diferencia < 0) aumentarStock(nombre, Math.abs(diferencia));
        pintarPagar();
        pintarInsignia();
      }
    });

    el.querySelector('.pago__del').addEventListener('click', () => {
      aumentarStock(nombre, items[nombre].q);
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
    const ventanaPago = document.getElementById('ventana-modal-pago-qr');
    const botonConfirmar = document.getElementById('boton-confirmar-pago-qr');
    const cajaInteriorModal = document.getElementById('contenedor-blanco-modal-pago');

    if (fin && ventanaPago) {
      fin.addEventListener('click', () => {
        ventanaPago.hidden = false;
      });
    }

    if (botonConfirmar) {
      botonConfirmar.addEventListener('click', () => {
        botonConfirmar.textContent = "procesando...";
        botonConfirmar.disabled = true;
        botonConfirmar.style.opacity = "0.7";

        setTimeout(() => {
          cajaInteriorModal.innerHTML = '<h2 class="titulo-agradecimiento-pago">¡Muchas gracias por comprar en Dimiza!</h2><p class="texto-agradecimiento-pago">Tu pedido se ha procesado con éxito.</p>';
          
          setTimeout(() => {
            localStorage.removeItem('carrito_items');
            localStorage.removeItem('carrito_total');
            window.location.href = 'index.html';
          }, 2000);

        }, 10000); 
      });
    }
  }
}

window.addEventListener('resize', ajustarOffset);

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

document.addEventListener('click', e => {
  if (!e.target.closest) return;
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

let inventario = {};

function cargarInventario() {
  try { 
    inventario = JSON.parse(localStorage.getItem('inventario_dimiza') || '{}'); 
    Object.keys(inventario).forEach(key => {
      if (typeof inventario[key].tipo === 'undefined') inventario[key].tipo = 'mes';
      if (typeof inventario[key].marca === 'undefined') inventario[key].marca = '';
      if (typeof inventario[key].unidad === 'undefined') inventario[key].unidad = '';
    });
  } catch(_) { 
    inventario = {}; 
  }
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
  if (!inventario[clave]) inventario[clave] = { s: 0, p: 0, img: '', marca: '', unidad: '', tipo: 'normal' };
  inventario[clave].s = s;
  guardarInventario();
}

function fijarProductoCompleto(nombre, s, p, img, marca, unidad, tipo) {
  cargarInventario();
  const clave = k(nombre);
  inventario[clave] = { 
    s: Math.max(0, Number(s) || 0), 
    p: Math.max(0, Number(p) || 0), 
    img: img || '',
    marca: marca || '',
    unidad: unidad || '1 und',
    tipo: tipo || 'normal'
  };
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

function pintarInventarioAdmin() {
  const listaMes = document.getElementById('lista-inventario-mes');
  const listaTodos = document.getElementById('lista-inventario-todos');
  if (!listaMes && !listaTodos) return;
  
  cargarInventario();
  if (listaMes) listaMes.innerHTML = '';
  if (listaTodos) listaTodos.innerHTML = '';
  
  Object.keys(inventario).sort().forEach(n => {
    const obj = inventario[n];
    const fila = document.createElement('div');
    fila.className = 'inventario__fila';
    fila.innerHTML =
      '<div class="inventario__col">' + (obj.marca || '-') + '</div>' +
      '<div class="inventario__col" style="font-weight:bold;">' + obj.s + '</div>' +
      '<div class="inventario__col" title="' + n + '" style="text-transform:capitalize;">' + n + '</div>' +
      '<div class="inventario__col">' + (obj.unidad || '-') + '</div>' +
      '<div class="inventario__col" style="color:#b67e45; font-weight:bold;">S/ ' + Number(obj.p).toFixed(2) + '</div>' +
      '<div class="inventario__col">' + (obj.img ? '<img src="'+obj.img+'" style="height:34px; width:100%; object-fit:contain; border-radius:4px;">' : '-') + '</div>' +
      '<div class="inventario__col inventario__acciones">' +
      '<button type="button" class="inventario__btn" data-accion="mas" data-nombre="' + n + '" title="Sumar Stock">+1</button>' +
      '<button type="button" class="inventario__btn" data-accion="menos" data-nombre="' + n + '" title="Restar Stock">-1</button>' +
      '<button type="button" class="inventario__btn inventario__btn--icono" data-accion="editar" data-nombre="' + n + '" title="Editar"><span class="material-symbols-outlined">edit</span></button>' +
      '<button type="button" class="inventario__btn inventario__btn--icono" data-accion="borrar" data-nombre="' + n + '" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>' +
      '</div>';
      
    if (obj.tipo === 'mes' && listaMes) {
      listaMes.appendChild(fila);
    } else if (listaTodos) {
      listaTodos.appendChild(fila);
    }
  });
}

function iniciarInventarioAdmin() {
  const form = document.getElementById('formInventario');
  if (!form) return;
  
  cargarInventario();
  pintarInventarioAdmin();

  form.addEventListener('submit', e => {
    e.preventDefault();
    
    const inpOriginal = document.getElementById('invNombreOriginal');
    const inpMarca = document.getElementById('invMarca');
    const inpUnidad = document.getElementById('invUnidad');
    const inpNombre = document.getElementById('invNombre');
    const inpStock = document.getElementById('invStock');
    const inpPrecio = document.getElementById('invPrecio');
    const inpImg = document.getElementById('invImg');
    const inpTipo = document.getElementById('invTipo');

    const nombreOriginal = inpOriginal ? inpOriginal.value.trim() : '';
    const m = inpMarca ? inpMarca.value.trim() : '';
    const u = inpUnidad ? inpUnidad.value.trim() : '';
    const n = inpNombre ? inpNombre.value.trim() : '';
    const s = inpStock ? inpStock.value : '0';
    const p = inpPrecio ? inpPrecio.value : '0';
    const img = inpImg ? inpImg.value.trim() : '';
    const t = inpTipo ? inpTipo.value : 'normal';
    
    if (!n) return;

    if (nombreOriginal && k(nombreOriginal) !== k(n)) {
      delete inventario[k(nombreOriginal)];
    }

    fijarProductoCompleto(n, s, p, img, m, u, t);
    
    if (inpOriginal) inpOriginal.value = '';
    pintarInventarioAdmin();
    form.reset();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest) return;
    const btn = e.target.closest('.inventario__btn');
    if (!btn) return;
    
    e.preventDefault();
    
    const acc = btn.dataset.accion;
    const n = btn.dataset.nombre;
    
    if (acc === 'mas') {
      aumentarStock(n, 1);
      pintarInventarioAdmin();
    }
    if (acc === 'menos') {
      disminuirStock(n, 1);
      pintarInventarioAdmin();
    }
    if (acc === 'borrar') { 
      cargarInventario(); 
      delete inventario[k(n)]; 
      guardarInventario(); 
      pintarInventarioAdmin();
    }
    if (acc === 'editar') {
      cargarInventario();
      const obj = inventario[k(n)];
      if (obj) {
        if(document.getElementById('invNombreOriginal')) document.getElementById('invNombreOriginal').value = n;
        if(document.getElementById('invMarca')) document.getElementById('invMarca').value = obj.marca || '';
        if(document.getElementById('invNombre')) document.getElementById('invNombre').value = n;
        if(document.getElementById('invUnidad')) document.getElementById('invUnidad').value = obj.unidad || '';
        if(document.getElementById('invStock')) document.getElementById('invStock').value = obj.s;
        if(document.getElementById('invPrecio')) document.getElementById('invPrecio').value = obj.p;
        if(document.getElementById('invImg')) document.getElementById('invImg').value = obj.img || '';
        if(document.getElementById('invTipo')) document.getElementById('invTipo').value = obj.tipo || 'normal';
        
        const formEl = document.getElementById('formInventario');
        if (formEl) formEl.scrollIntoView({behavior: 'smooth', block: 'start'});
      }
    }
  });
}

function verificarAccesoInventario() {
  const cajaLogin = document.getElementById('contenedor-login-inventario');
  const cajaInventario = document.getElementById('contenedor-principal-inventario');
  if (!cajaLogin || !cajaInventario) return;

  if (accesoInventarioPermitido) {
    cajaLogin.hidden = true;
    cajaInventario.hidden = false;
  } else {
    cajaLogin.hidden = false;
    cajaInventario.hidden = true;
  }

  const formLogin = document.getElementById('formulario-acceso-inventario');
  if (formLogin) {
    formLogin.addEventListener('submit', e => {
      e.preventDefault();
      const usuInput = document.getElementById('campo-texto-usuario');
      const pasInput = document.getElementById('campo-texto-clave');
      
      const usu = usuInput ? usuInput.value.trim() : '';
      const pas = pasInput ? pasInput.value.trim() : '';
      
      if (usu === 'admin' && pas === '0000') {
        accesoInventarioPermitido = true;
        cajaLogin.hidden = true;
        cajaInventario.hidden = false;
        if (usuInput) usuInput.value = '';
        if (pasInput) pasInput.value = '';
      } else {
        alert('Acceso denegado. Revisa tus datos.');
      }
    });
  }
}

function generarHtmlTarjetaSupermercado(nombre, prod) {
  const esMes = prod.tipo === 'mes';
  const divisor = esMes ? 0.80 : 0.85;
  const precioViejo = (prod.p / divisor).toFixed(2);
  const textoDescto = esMes ? '-20%' : '-15% ONLINE';
  const marcaTexto = prod.marca || 'SIN MARCA';
  const unidadTexto = prod.unidad || '1 und';

  return `
    <article class="tarjeta-super-producto fav__item" data-stock="${prod.s}">
      <div class="tarjeta-super-imagen-caja">
        <span class="tarjeta-super-etiqueta-flotante">${textoDescto}</span>
        <img src="${prod.img || ''}" alt="${nombre}">
      </div>
      <div class="tarjeta-super-info-caja">
        <p class="tarjeta-super-marca">${marcaTexto}</p>
        <h4 class="tarjeta-super-nombre fav__nombre">${nombre}</h4>
        <p class="tarjeta-super-unidad">${unidadTexto}</p>
        
        <div class="tarjeta-super-precios-fila">
          <div class="tarjeta-super-precios-col">
            <span class="tarjeta-super-precio-viejo">S/ ${precioViejo}</span>
            <span class="tarjeta-super-precio-nuevo fav__precio">S/ ${Number(prod.p).toFixed(2)}</span>
          </div>
          <span class="tarjeta-super-etiqueta-chica">${textoDescto}</span>
        </div>

        <div class="cantidad" data-cant="1">
          <button type="button" class="cantidad__btn cantidad__btn--menos">‹</button>
          <span class="cantidad__num">1</span>
          <button type="button" class="cantidad__btn cantidad__btn--mas">›</button>
          <span class="cantidad__max">max</span>
        </div>
        
        <button class="tarjeta-super-boton-agregar fav__cta">
          <span class="material-symbols-outlined icono-carrito-btn">shopping_cart</span>
          AGREGAR
        </button>
      </div>
    </article>
  `;
}

function pintarCarruselInicio() {
  const tira = document.getElementById('carrusel-inicio-dinamico');
  if (!tira) return;
  cargarInventario();
  tira.innerHTML = '';
  Object.keys(inventario).forEach(nombre => {
    const prod = inventario[nombre];
    if (prod.tipo === 'mes') {
      tira.insertAdjacentHTML('beforeend', generarHtmlTarjetaSupermercado(nombre, prod));
    }
  });
}

function pintarPaginaProductos() {
  const contenedorMes = document.getElementById('contenedor-productos-mes');
  const contenedorDemas = document.getElementById('contenedor-demas-productos');
  if (!contenedorMes || !contenedorDemas) return;

  cargarInventario();
  contenedorMes.innerHTML = '';
  contenedorDemas.innerHTML = '';

  Object.keys(inventario).forEach(nombre => {
    const prod = inventario[nombre];
    if (prod.tipo === 'mes') {
      contenedorMes.insertAdjacentHTML('beforeend', generarHtmlTarjetaSupermercado(nombre, prod));
    } else {
      contenedorDemas.insertAdjacentHTML('beforeend', generarHtmlTarjetaSupermercado(nombre, prod));
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await incluirPartes();
  ajustarOffset();
  verificarAccesoInventario();
  pintarCarruselInicio();
  pintarPaginaProductos();
  iniciarCantidadYCarrito();
  iniciarPagar();
  iniciarCarrusel();
  pintarStockEnTarjetas();
  iniciarInventarioAdmin();
});

window.mostrarReporte = function(tipo, boton) {
    const botones = document.querySelectorAll(".btn-reporte");
    botones.forEach(btn => btn.classList.remove("activo"));

    boton.classList.add("activo");

    const contenido = document.getElementById("reportes-contenido");
    
    if (!contenido) return;

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