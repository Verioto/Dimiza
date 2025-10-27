async function incluirPartes(){
  const nodos=document.querySelectorAll('[data-include]');
  for(const n of nodos){
    const url=n.getAttribute('data-include');
    const res=await fetch(url);
    const html=await res.text();
    n.outerHTML=html;
  }
}
document.addEventListener('DOMContentLoaded',async()=>{
  await incluirPartes();
  document.dispatchEvent(new Event('partes-listas'));
});

document.addEventListener('DOMContentLoaded', () => {
  const marco = document.querySelector('.fav__marco');
  const tira = document.querySelector('.fav__tira');
  const track = document.querySelector('.fav__track');
  const progress = document.querySelector('.fav__progress');
  const thumb = document.querySelector('.fav__thumb');
  if (!marco || !tira || !track || !thumb || !progress) return;

  const lim = () => Math.max(0, marco.scrollWidth - marco.clientWidth);
  const pct = () => (lim() === 0 ? 0 : (marco.scrollLeft / lim()) * 100);

  const pintar = p => {
    const cl = Math.max(0, Math.min(100, p));
    const w = track.clientWidth;
    const x = (cl / 100) * w;
    progress.style.width = cl + '%';
    thumb.style.left = Math.max(0, Math.min(w - thumb.offsetWidth, x - thumb.offsetWidth / 2)) + 'px';
    track.setAttribute('aria-valuenow', Math.round(cl));
  };

  const scrollAPorcentaje = (p, suave = true) => {
    const pos = (Math.max(0, Math.min(100, p)) / 100) * lim();
    if (suave) {
      marco.scrollTo({ left: pos, behavior: 'smooth' });
    } else {
      marco.scrollLeft = pos;
    }
  };

  const actualizar = () => pintar(pct());
  actualizar();
  marco.addEventListener('scroll', actualizar, { passive: true });
  window.addEventListener('resize', actualizar);

  let arrastrando = false;
  let rafId = null;

  const posAProgreso = clientX => {
    const r = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    return (x / r.width) * 100;
  };

  track.addEventListener('pointerdown', e => {
    if (e.target === thumb) return;
    scrollAPorcentaje(posAProgreso(e.clientX), true);
  });

  const onMove = e => {
    if (!arrastrando) return;
    const p = posAProgreso(e.clientX);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => scrollAPorcentaje(p, false));
  };

  thumb.addEventListener('pointerdown', e => {
    e.preventDefault();
    arrastrando = true;
    thumb.setPointerCapture(e.pointerId);
    marco.classList.add('is-dragging');
    onMove(e);
  });

  thumb.addEventListener('pointermove', onMove);

  thumb.addEventListener('pointerup', e => {
    arrastrando = false;
    marco.classList.remove('is-dragging');
    thumb.releasePointerCapture(e.pointerId);
  });

  thumb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') scrollAPorcentaje(pct() + 10, true);
    if (e.key === 'ArrowLeft')  scrollAPorcentaje(pct() - 10, true);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const fav = document.querySelector('.favoritos');
  const track = document.querySelector('.fav__track');
  if (!fav || !track) return;

  const io = new IntersectionObserver(([entry]) => {
    track.classList.toggle('is-hidden', !entry.isIntersecting);
  }, { root: null, threshold: 0, rootMargin: '0px 0px -10% 0px' });

  io.observe(fav);
});

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');
  const fondo = document.querySelector('.hero__fondo');
  const centro = document.querySelector('.hero__centro');
  const titulo = document.querySelector('.hero__titulo');
  const boton = document.querySelector('.hero__boton');

  if (titulo) titulo.textContent = 'LA DELICADEZA EN TU MESA';
  if (boton) boton.textContent = 'COMPRAR AHORA';

  if (!hero || !fondo || !centro) return;

  let ticking = false;

  const actualizar = () => {
    const rect = hero.getBoundingClientRect();
    const alto = hero.offsetHeight;
    const avance = Math.min(alto, Math.max(0, -rect.top));
    const yImagen = avance * 0.45;
    const yCentro = avance * 0.22;
    fondo.style.transform = `translateY(${yImagen}px)`;
    centro.style.transform = `translateY(${yCentro}px)`;
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(actualizar);
    }
  };

  actualizar();
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', actualizar);
});

document.addEventListener('DOMContentLoaded', () => {
  const enlace = document.getElementById('eligeDireccion');
  const modal = document.getElementById('mapaModal');
  const frame = document.getElementById('mapaFrame');
  const cerrar = document.getElementById('mapaCerrar');
  if (!enlace || !modal || !frame || !cerrar) return;

  const abrirMapa = (lat, lng) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
    frame.src = url;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  enlace.addEventListener('click', e => {
    e.preventDefault();
    if (!('geolocation' in navigator)) {
      window.open('https://www.google.com/maps', '_blank');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => abrirMapa(pos.coords.latitude, pos.coords.longitude),
      () => window.open('https://www.google.com/maps', '_blank'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });

  cerrar.addEventListener('click', () => {
    modal.hidden = true;
    frame.src = '';
    document.body.style.overflow = '';
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) cerrar.click();
  });
});

const storiesRail=document.querySelector('.stories__rail');
const sPrev=document.querySelector('.stories__btn--prev');
const sNext=document.querySelector('.stories__btn--next');
if(storiesRail){
  sPrev.addEventListener('click',()=>storiesRail.scrollBy({left:-300,behavior:'smooth'}));
  sNext.addEventListener('click',()=>storiesRail.scrollBy({left:300,behavior:'smooth'}));
  let isDown=false,startX,scrollLeft;
  storiesRail.addEventListener('mousedown',e=>{isDown=true;startX=e.pageX-storiesRail.offsetLeft;scrollLeft=storiesRail.scrollLeft;});
  storiesRail.addEventListener('mouseleave',()=>isDown=false);
  storiesRail.addEventListener('mouseup',()=>isDown=false);
  storiesRail.addEventListener('mousemove',e=>{if(!isDown)return;e.preventDefault();const x=e.pageX-storiesRail.offsetLeft;const walk=(x-startX)*1.4;storiesRail.scrollLeft=scrollLeft-walk;});
}

const tira=document.querySelector('.navidad__tira');
const nPrev=document.querySelector('.navidad__btn--prev');
const nNext=document.querySelector('.navidad__btn--next');
if(tira){
  const step=()=>tira.querySelector('.nav__card').offsetWidth+24;
  nPrev.addEventListener('click',()=>{tira.scrollBy({left:-step(),behavior:'smooth'});});
  nNext.addEventListener('click',()=>{tira.scrollBy({left:step(),behavior:'smooth'});});
  let down=false,sx,sl;
  tira.addEventListener('mousedown',e=>{down=true;sx=e.pageX-tira.offsetLeft;sl=tira.scrollLeft;});
  tira.addEventListener('mouseleave',()=>down=false);
  tira.addEventListener('mouseup',()=>down=false);
  tira.addEventListener('mousemove',e=>{if(!down)return;e.preventDefault();const x=e.pageX-tira.offsetLeft;const w=(x-sx)*1.4;tira.scrollLeft=sl-w;});
}

function ajustarOffset(){
  const h=document.querySelector('.cabecera');
  if(!h)return;
  document.body.style.paddingTop=h.offsetHeight+'px';
}

document.addEventListener('partes-listas',ajustarOffset);
window.addEventListener('resize',ajustarOffset);

let totalCarrito=0
let items={}

function cargarItems(){
  try{ items=JSON.parse(localStorage.getItem('carrito_items')||'{}') }catch(e){ items={} }
}

function guardarItems(){
  localStorage.setItem('carrito_items',JSON.stringify(items))
}

function totalDesdeItems(){
  return Object.values(items).reduce((a,b)=>a+Number(b||0),0)
}

function claveDe(tarjeta){
  const n=tarjeta.querySelector('.fav__nombre')
  return (n?n.textContent.trim().toLowerCase():'item')
}

function pintarBadge(){
  const b=document.querySelector('.carrito__num')
  if(b)b.textContent=String(totalCarrito).padStart(2,'0')
}

function initCantidadYCarrito(){
  cargarItems()
  totalCarrito=totalDesdeItems()
  pintarBadge()

  document.addEventListener('click',e=>{
    const menos=e.target.closest('.cantidad__btn--menos')
    const mas=e.target.closest('.cantidad__btn--mas')
    const agregar=e.target.closest('.fav__cta')
    if(!menos && !mas && !agregar)return

    const tarjeta=e.target.closest('.fav__item')
    if(!tarjeta)return

    const caja=tarjeta.querySelector('.cantidad')
    const num=tarjeta.querySelector('.cantidad__num')
    if(!caja||!num)return

    let cant=Number(caja.dataset.cant||num.textContent||'1')

    if(menos){
      cant=Math.max(1,cant-1)
      caja.dataset.cant=String(cant)
      num.textContent=caja.dataset.cant
      caja.classList.toggle('is-max',cant===5)
      return
    }

    if(mas){
      cant=Math.min(5,cant+1)
      caja.dataset.cant=String(cant)
      num.textContent=caja.dataset.cant
      caja.classList.toggle('is-max',cant===5)
      return
    }

    if(agregar){
      const key=claveDe(tarjeta)
      const actual=Number(items[key]||0)
      const max=5
      const pedido=cant
      const nuevo=Math.min(max,actual+pedido)
      const agregado=nuevo-actual
      if(agregado<=0){
        caja.classList.add('is-max')
        num.textContent='5'
        return
      }
      items[key]=nuevo
      guardarItems()
      totalCarrito=totalDesdeItems()
      pintarBadge()
      caja.dataset.cant='1'
      num.textContent='1'
      caja.classList.toggle('is-max',nuevo===5)
      return
    }
  })
}

function initPagar(){
  const totalEl=document.querySelector('[data-total]')
  const pagar=document.getElementById('btnPagar')
  if(totalEl){
    const t=totalDesdeItems()
    totalEl.textContent=String(t)
  }
  if(pagar){
    pagar.addEventListener('click',()=>{
      localStorage.removeItem('carrito_items')
      localStorage.removeItem('carrito_total')
      window.location.href='index.html'
    })
  }
}

document.addEventListener('partes-listas',()=>{
  initCantidadYCarrito()
  initPagar()
})
