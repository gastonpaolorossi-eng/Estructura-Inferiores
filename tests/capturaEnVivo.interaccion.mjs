// Captura en vivo en la ventana principal: con jugadora, sin jugadora y en un toque. YouTube y Supabase simulados; nunca usa producción.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { CATALOGO_BASE } from '../src/utils/analisis/catalogoAcciones.js'
const { JSDOM } = await import(pathToFileURL(process.env.PIZARRA_DOM_PATH || join(tmpdir(), 'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)

async function montar({ tipos, eventos = [] } = {}) {
  const dom = new JSDOM('<!doctype html><html><head><style>body{color:black}</style></head><body><div id="root"></div></body></html>', { url: 'https://comunicaciones.test' })
  const previos = new Map(), players = [], timers = new Map(), writes = [], borrados = [], actualizaciones = [], lecturas = {}
  function global(nombre, valor) { previos.set(nombre, Object.getOwnPropertyDescriptor(globalThis,nombre)); Object.defineProperty(globalThis,nombre,{value:valor,configurable:true,writable:true}) }
  for (const n of ['window','document','HTMLElement','Event','MouseEvent','KeyboardEvent']) global(n,dom.window[n])
  global('IS_REACT_ACT_ENVIRONMENT',true)
  const { act,createElement } = await import('react'), { createRoot } = await import('react-dom/client'), { crearServidorVitePrueba: createServer } = await import('./helpers/servidorVite.mjs')
  const authUser={id:'f7562d52-a16a-48b5-95a0-efbcc70080d3',email:'simulado@test.invalid'}
  const ana={id:'j',nombre:'Ana',apellido:'Prueba',categoria_id:'cat'}, bea={id:'j2',nombre:'Bea',apellido:'Ensayo',categoria_id:'cat'}
  const partidos=[{id:'p1',rival:'Rival A',fecha:'2026-10-29',categoria_id:'cat',direccion_primer_tiempo:'derecha',partido_calendario_id:'c1',video_url:'https://www.youtube.com/watch?v=abc123def45'}]
  const estado={resolverInsert:null}
  const datos={perfiles:{email:authUser.email,nombre:'Kevin Garay',rol:'coordinacion'},partidos:[],analisis_partidos:partidos,analisis_eventos:structuredClone(eventos),analisis_pases_detalle:[],analisis_tipos_accion:tipos,jugadores:[ana,bea],
    citaciones:[{id:'c',jugador_id:'j',dorsal:10,titular:true},{id:'c2',jugador_id:'j2',dorsal:7,titular:false}]}
  global('__analisisSupabase', { rpc:async nombre=>{assert.equal(nombre,'puede_administrar_analisis');return {data:true}}, auth:{getUser:async()=>({data:{user:authUser}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from(tabla){
    let registro, borrar=false, cambios=null
    const filtro={}
    const q={select(){return q},eq(c,v){filtro[c]=v;return q},in(){return q},order(){return q},range(){return q},limit(){return q},maybeSingle(){return Promise.resolve({data:datos[tabla]})},
      insert(d){assert.equal(tabla,'analisis_eventos');registro=d;return q},
      delete(){assert.equal(tabla,'analisis_eventos');borrar=true;return q},
      update(d){assert.equal(tabla,'analisis_eventos');cambios=d;return q},
      single(){
        if(cambios){actualizaciones.push({id:filtro.id,...cambios});const fila={...datos.analisis_eventos.find(e=>e.id===filtro.id),...cambios};datos.analisis_eventos=datos.analisis_eventos.map(e=>e.id===fila.id?fila:e);return Promise.resolve({data:fila,error:null})}
        writes.push(registro);return new Promise(resolve=>{estado.resolverInsert=()=>{datos.analisis_eventos.push(registro);resolve({data:registro})}})},
      then(resolve,reject){
        if(borrar){borrados.push(filtro.id);datos.analisis_eventos=datos.analisis_eventos.filter(e=>e.id!==filtro.id);return Promise.resolve({error:null}).then(resolve,reject)}
        lecturas[tabla]=(lecturas[tabla]||0)+1;return Promise.resolve({data:structuredClone(datos[tabla] || [])}).then(resolve,reject)}}
    return q
  } })
  class Player {
    constructor(iframe, opciones){this.iframe=iframe;this.events=opciones.events;this.time=0;this.state=2;this.rate=1;this.alive=true;players.push(this);queueMicrotask(()=>this.events.onReady({target:this}))}
    getCurrentTime(){return this.time} getPlayerState(){return this.state} getPlaybackRate(){return this.rate} getAvailablePlaybackRates(){return [.5,1,2]}
    emitir(){this.events.onStateChange({target:this,data:this.state})}
    playVideo(){this.state=1;this.emitir()} pauseVideo(){this.state=2;this.emitir()}
    seekTo(t){this.pending=t} confirmarSalto(){this.time=this.pending;this.pending=undefined;this.emitir()}
    setPlaybackRate(v){this.rate=v;this.events.onPlaybackRateChange({target:this,data:v})}
    destroy(){this.alive=false;this.iframe.remove()}
  }
  dom.window.YT={Player,PlayerState:{PLAYING:1}}
  dom.window.setInterval=fn=>{const id=Symbol();timers.set(id,fn);return id};dom.window.clearInterval=id=>timers.delete(id)
  const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'captura-backend-simulado',enforce:'pre',resolveId(s){if(s.endsWith('/supabaseClient'))return '\0captura-mock'},load(id){if(id==='\0captura-mock')return 'export const supabase=globalThis.__analisisSupabase;'}}]})
  const root=createRoot(document.getElementById('root'))
  const boton=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t))
  const presionar=async(b,t)=>{assert.ok(b,t);assert.equal(b.disabled,false,t);await act(()=>b.click())}
  const h={
    act, dom, datos, writes, borrados, actualizaciones, lecturas, boton,
    resolver:async()=>act(async()=>estado.resolverInsert()),
    click:async t=>presionar(boton(t),t),
    // Botón de una acción de la botonera rápida.
    tipo:t=>document.querySelector(`[data-tipo-rapido="${t}"]`),
    marcar:async t=>presionar(h.tipo(t),t),
    // Botón de la lista de etiquetado rápido (lleva "＋"); el de Suplentes solo selecciona.
    convocada:t=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t)&&b.textContent.includes('＋')),
    etiquetar:async t=>presionar(h.convocada(t),t),
    tick:async()=>act(()=>{[...timers.values()].forEach(fn=>fn())}),
    activo:()=>players.filter(p=>p.alive).at(-1),
    cambio:async(el,value)=>act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new el.ownerDocument.defaultView.Event('change',{bubbles:true}))}),
    registradas:n=>assert.match(document.body.textContent,new RegExp(`Acciones registradas \\(${n}\\)`)),
    iniciar:async()=>{
      const {default:Analisis}=await server.ssrLoadModule('/src/components/AnalisisSection.jsx')
      await act(async()=>{root.render(createElement(Analisis));await Promise.resolve()})
      assert.equal(players.filter(p=>p.alive).length,1)
    },
    cerrar:async()=>{
      await act(()=>root.unmount());await server.close();dom.window.close()
      for(const[n,p]of previos){if(p)Object.defineProperty(globalThis,n,p);else delete globalThis[n]}
    },
  }
  return h
}

test('Análisis: Pase +/− en vivo guarda una vez, con el segundo y el período del video, sin recargar', async () => {
  const h = await montar()
  const { writes, lecturas } = h
  try {
    await h.iniciar()
    const lecturasIniciales=lecturas.analisis_eventos
    assert.ok(lecturasIniciales>=1)

    // El reloj en pantalla sigue al video.
    await h.marcar('Pase correcto')
    h.activo().time=300.7;await h.tick()
    assert.match(document.body.textContent,/Tiempo: 05:00/)
    h.activo().time=301.2;await h.tick()
    assert.match(document.body.textContent,/Tiempo: 05:01/)

    // Doble toque rápido: un solo registro, con el segundo leído del reproductor.
    await h.act(()=>{const b=h.convocada('Ana Prueba');b.click();b.click()})
    assert.equal(writes.length,1)
    assert.deepEqual([writes[0].tipo,writes[0].jugador_id,writes[0].segundo,writes[0].periodo,writes[0].partido_id,writes[0].resultado],['Pase correcto','j',301,1,'p1','Exitoso'])
    await h.resolver();h.registradas(1)

    // La acción elegida se conserva para la siguiente jugadora.
    h.activo().time=318.9
    await h.etiquetar('Bea Ensayo')
    assert.equal(writes.length,2)
    assert.deepEqual([writes[1].tipo,writes[1].jugador_id,writes[1].segundo,writes[1].resultado],['Pase correcto','j2',318,'Exitoso'])
    await h.resolver();h.registradas(2)

    await h.marcar('Pase incorrecto')
    h.activo().time=322.4
    await h.etiquetar('Ana Prueba')
    assert.equal(writes.length,3)
    assert.deepEqual([writes[2].tipo,writes[2].jugador_id,writes[2].segundo,writes[2].resultado],['Pase incorrecto','j',322,'Fallido'])
    await h.resolver();h.registradas(3)

    // Segundo tiempo: período y dirección de captura cambian, el segundo sigue siendo el del video.
    const periodo=[...document.querySelectorAll('select')].find(s=>s.parentElement.textContent.includes('Tiempo del partido'))
    await h.cambio(periodo,'2')
    h.activo().time=2945.3
    await h.marcar('Pase correcto')
    await h.etiquetar('Bea Ensayo')
    assert.equal(writes.length,4)
    assert.deepEqual([writes[3].tipo,writes[3].segundo,writes[3].periodo,writes[3].direccion_captura],['Pase correcto',2945,2,'izquierda'])
    assert.equal(writes[0].direccion_captura,'derecha')
    await h.resolver();h.registradas(4)

    // Un remate con jugadora no recibe resultado automático.
    await h.marcar('Remate')
    await h.etiquetar('Ana Prueba')
    assert.deepEqual([writes[4].tipo,writes[4].jugador_id,writes[4].resultado],['Remate','j',null])
    await h.resolver();h.registradas(5)

    // Las acciones aparecen sin volver a leer los eventos.
    assert.equal(lecturas.analisis_eventos,lecturasIniciales)
  } finally {
    await h.cerrar()
  }
})

test('Análisis: un toque sin jugadora, botón "Sin jugadora" y deshacer la última', async () => {
  const h = await montar()
  const { writes, borrados, datos } = h
  try {
    await h.iniciar()

    // Modo un toque: tocar la acción guarda al instante, sin jugadora.
    await h.click('Marcar sin jugadora')
    h.activo().time=600.4
    await h.act(()=>{const b=h.tipo('Remate');b.click();b.click()})
    assert.equal(writes.length,1,'Doble toque guarda una sola acción')
    assert.deepEqual([writes[0].tipo,writes[0].jugador_id,writes[0].segundo,writes[0].periodo,writes[0].direccion_captura,writes[0].resultado],['Remate',null,600,1,'derecha',null])
    await h.resolver();h.registradas(1)
    assert.match(document.body.textContent,/Remate registrada sin jugadora/)
    assert.match(document.body.textContent,/Sin jugadora/)

    h.activo().time=610.2
    await h.marcar('Pase correcto')
    assert.deepEqual([writes[1].tipo,writes[1].jugador_id,writes[1].segundo,writes[1].resultado],['Pase correcto',null,610,'Exitoso'])
    await h.resolver()
    h.activo().time=611.8
    await h.marcar('Pase incorrecto')
    assert.deepEqual([writes[2].tipo,writes[2].jugador_id,writes[2].segundo,writes[2].resultado],['Pase incorrecto',null,611,'Fallido'])
    await h.resolver();h.registradas(3)

    // Deshacer borra solo la última acción marcada y no deja deshacer otra vez.
    const deshacer=h.boton('Deshacer')
    assert.match(deshacer.textContent,/Pase incorrecto · 10:11/)
    await h.click('Deshacer')
    assert.deepEqual(borrados,[writes[2].id])
    assert.equal(datos.analisis_eventos.length,2)
    h.registradas(2)
    assert.equal(h.boton('Deshacer'),undefined)

    // Sin el modo un toque, la acción vuelve a esperar a la jugadora…
    await h.click('Marcar sin jugadora')
    h.activo().time=700.1
    await h.marcar('Pase correcto')
    assert.equal(writes.length,3,'Elegir la acción no guarda')
    // …o se guarda sin ella con el botón de la lista.
    await h.click('Guardar sin jugadora')
    assert.deepEqual([writes[3].tipo,writes[3].jugador_id,writes[3].segundo,writes[3].resultado],['Pase correcto',null,700,'Exitoso'])
    await h.resolver()
    await h.etiquetar('Bea Ensayo')
    assert.deepEqual([writes[4].tipo,writes[4].jugador_id,writes[4].resultado],['Pase correcto','j2','Exitoso'])
    await h.resolver();h.registradas(4)
    assert.equal(borrados.length,1)
  } finally {
    await h.cerrar()
  }
})

// Edición: el selector de resultado sigue las reglas de cada tipo.
const accionesPrevias = [
  { id: 'v1', partido_id: 'p1', jugador_id: 'j', tipo: 'Pérdida', resultado: 'Fallido', segundo: 100, periodo: 1, zona: null, coordenada_x: null, coordenada_y: null, observaciones: null },
  { id: 'v2', partido_id: 'p1', jugador_id: 'j2', tipo: 'Remate', resultado: 'Exitoso', segundo: 200, periodo: 1, zona: null, coordenada_x: null, coordenada_y: null, observaciones: null },
]
const formularioEdicion = () => [...document.querySelectorAll('form')].find(f => f.textContent.includes('Editar acción'))
const selectorResultado = form => [...form.querySelectorAll('select')].find(s => s.parentElement.textContent.startsWith('Resultado'))
async function editar(h, indice) {
  const botones = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Editar')
  await h.act(() => botones[indice].click())
  const form = formularioEdicion(); assert.ok(form, 'formulario de edición')
  return form
}
const guardar = async (h, form) => h.act(async () => { form.dispatchEvent(new h.dom.window.Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve() })

test('Análisis sin tabla de tipos: catálogo por defecto, aviso y resultados según el tipo', async () => {
  const h = await montar({ eventos: accionesPrevias })
  try {
    await h.iniciar()
    assert.match(document.body.textContent, /valores por defecto/)

    // Pérdida no lleva resultado: no hay selector y al guardar queda vacío.
    let form = await editar(h, 0)
    assert.equal(selectorResultado(form), undefined)
    await guardar(h, form)
    assert.deepEqual([h.actualizaciones[0].id, h.actualizaciones[0].resultado], ['v1', null])

    // Remate: sus cuatro opciones y el valor viejo marcado, sin cambiarlo.
    form = await editar(h, 1)
    const sel = selectorResultado(form)
    assert.deepEqual([...sel.options].map(o => o.textContent), ['Pendiente de completar', 'Exitoso (valor anterior)', 'Gol', 'Atajada', 'Fuera', 'Bloqueado'])
    assert.equal(sel.value, 'Exitoso')
    await guardar(h, form)
    assert.deepEqual([h.actualizaciones[1].id, h.actualizaciones[1].resultado], ['v2', 'Exitoso'])
  } finally {
    await h.cerrar()
  }
})

test('Análisis con tabla de tipos: las reglas salen de la base', async () => {
  const tipos = CATALOGO_BASE.map(t => t.codigo === 'Pérdida' ? { ...t, resultados: ['Exitoso', 'Fallido'] } : t)
  const h = await montar({ tipos, eventos: accionesPrevias })
  try {
    await h.iniciar()
    assert.doesNotMatch(document.body.textContent, /valores por defecto|falta aplicar/)
    const form = await editar(h, 0)
    const sel = selectorResultado(form)
    assert.deepEqual([...sel.options].map(o => o.value), ['', 'Exitoso', 'Fallido'])
    assert.equal(sel.value, 'Fallido')
    await guardar(h, form)
    assert.deepEqual([h.actualizaciones[0].id, h.actualizaciones[0].resultado], ['v1', 'Fallido'])
  } finally {
    await h.cerrar()
  }
})
