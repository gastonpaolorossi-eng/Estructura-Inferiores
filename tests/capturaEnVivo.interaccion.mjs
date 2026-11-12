// Captura en vivo con "Pase +" / "Pase −" en la ventana principal. YouTube y Supabase simulados; nunca usa producción.
import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const { JSDOM } = await import(pathToFileURL(process.env.PIZARRA_DOM_PATH || join(tmpdir(), 'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)

test('Análisis: Pase +/− en vivo guarda una vez, con el segundo y el período del video, sin recargar', async () => {
  const dom = new JSDOM('<!doctype html><html><head><style>body{color:black}</style></head><body><div id="root"></div></body></html>', { url: 'https://comunicaciones.test' })
  const previos = new Map(), players = [], timers = new Map(), writes = [], lecturas = {}
  function global(nombre, valor) { previos.set(nombre, Object.getOwnPropertyDescriptor(globalThis,nombre)); Object.defineProperty(globalThis,nombre,{value:valor,configurable:true,writable:true}) }
  for (const n of ['window','document','HTMLElement','Event','MouseEvent','KeyboardEvent']) global(n,dom.window[n])
  global('IS_REACT_ACT_ENVIRONMENT',true)
  const { act,createElement } = await import('react'), { createRoot } = await import('react-dom/client'), { crearServidorVitePrueba: createServer } = await import('./helpers/servidorVite.mjs')
  const authUser={id:'f7562d52-a16a-48b5-95a0-efbcc70080d3',email:'simulado@test.invalid'}
  const ana={id:'j',nombre:'Ana',apellido:'Prueba',categoria_id:'cat'}, bea={id:'j2',nombre:'Bea',apellido:'Ensayo',categoria_id:'cat'}
  const partidos=[{id:'p1',rival:'Rival A',fecha:'2026-10-29',categoria_id:'cat',direccion_primer_tiempo:'derecha',partido_calendario_id:'c1',video_url:'https://www.youtube.com/watch?v=abc123def45'}]
  let resolverInsert
  const datos={perfiles:{email:authUser.email,nombre:'Kevin Garay',rol:'coordinacion'},partidos:[],analisis_partidos:partidos,analisis_eventos:[],analisis_pases_detalle:[],jugadores:[ana,bea],
    citaciones:[{id:'c',jugador_id:'j',dorsal:10,titular:true},{id:'c2',jugador_id:'j2',dorsal:7,titular:false}]}
  global('__analisisSupabase', { rpc:async nombre=>{assert.equal(nombre,'puede_administrar_analisis');return {data:true}}, auth:{getUser:async()=>({data:{user:authUser}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from(tabla){
    let registro
    const q={select(){return q},eq(){return q},in(){return q},order(){return q},range(){return q},limit(){return q},maybeSingle(){return Promise.resolve({data:datos[tabla]})},
      insert(d){assert.equal(tabla,'analisis_eventos');registro=d;return q},
      single(){writes.push(registro);return new Promise(resolve=>{resolverInsert=()=>{datos.analisis_eventos.push(registro);resolve({data:registro})}})},
      then(resolve,reject){lecturas[tabla]=(lecturas[tabla]||0)+1;return Promise.resolve({data:structuredClone(datos[tabla] || [])}).then(resolve,reject)}}
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
  const click=async t=>{const b=boton(t);assert.ok(b,t);assert.equal(b.disabled,false,t);await act(()=>b.click())}
  // Botón de la lista de etiquetado rápido (lleva "＋"); el de Suplentes solo selecciona.
  const convocada=t=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(t)&&b.textContent.includes('＋'))
  const etiquetar=async t=>{const b=convocada(t);assert.ok(b,t);assert.equal(b.disabled,false,t);await act(()=>b.click())}
  const tick=async()=>act(()=>{[...timers.values()].forEach(fn=>fn())})
  const activo=()=>players.filter(p=>p.alive).at(-1)
  const cambio=async(el,value)=>act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype,'value').set.call(el,value);el.dispatchEvent(new el.ownerDocument.defaultView.Event('change',{bubbles:true}))})
  const registradas=n=>assert.match(document.body.textContent,new RegExp(`Acciones registradas \\(${n}\\)`))
  try {
    const {default:Analisis}=await server.ssrLoadModule('/src/components/AnalisisSection.jsx')
    await act(async()=>{root.render(createElement(Analisis));await Promise.resolve()})
    assert.equal(players.filter(p=>p.alive).length,1)
    const lecturasIniciales=lecturas.analisis_eventos
    assert.ok(lecturasIniciales>=1)

    // El reloj en pantalla sigue al video.
    await click('Pase +')
    activo().time=300.7;await tick()
    assert.match(document.body.textContent,/Tiempo: 05:00/)
    activo().time=301.2;await tick()
    assert.match(document.body.textContent,/Tiempo: 05:01/)

    // Doble toque rápido: un solo registro, con el segundo leído del reproductor.
    await act(()=>{const b=convocada('Ana Prueba');b.click();b.click()})
    assert.equal(writes.length,1)
    assert.deepEqual([writes[0].tipo,writes[0].jugador_id,writes[0].segundo,writes[0].periodo,writes[0].partido_id],['Pase correcto','j',301,1,'p1'])
    await act(async()=>resolverInsert());registradas(1)

    // La acción elegida se conserva para la siguiente jugadora.
    activo().time=318.9
    await etiquetar('Bea Ensayo')
    assert.equal(writes.length,2)
    assert.deepEqual([writes[1].tipo,writes[1].jugador_id,writes[1].segundo],['Pase correcto','j2',318])
    await act(async()=>resolverInsert());registradas(2)

    await click('Pase −')
    activo().time=322.4
    await etiquetar('Ana Prueba')
    assert.equal(writes.length,3)
    assert.deepEqual([writes[2].tipo,writes[2].jugador_id,writes[2].segundo],['Pase incorrecto','j',322])
    await act(async()=>resolverInsert());registradas(3)

    // Segundo tiempo: período y dirección de captura cambian, el segundo sigue siendo el del video.
    const periodo=[...document.querySelectorAll('select')].find(s=>s.parentElement.textContent.includes('Tiempo del partido'))
    await cambio(periodo,'2')
    activo().time=2945.3
    await click('Pase +')
    await etiquetar('Bea Ensayo')
    assert.equal(writes.length,4)
    assert.deepEqual([writes[3].tipo,writes[3].segundo,writes[3].periodo,writes[3].direccion_captura],['Pase correcto',2945,2,'izquierda'])
    assert.equal(writes[0].direccion_captura,'derecha')
    await act(async()=>resolverInsert());registradas(4)

    // Las acciones aparecen sin volver a leer los eventos.
    assert.equal(lecturas.analisis_eventos,lecturasIniciales)
  } finally {
    await act(()=>root.unmount());await server.close();dom.window.close()
    for(const[n,p]of previos){if(p)Object.defineProperty(globalThis,n,p);else delete globalThis[n]}
  }
})
