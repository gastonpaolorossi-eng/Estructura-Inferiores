import test from 'node:test'
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {crearClienteIndividual} from './helpers/clienteIndividual.mjs'
const {JSDOM}=await import(pathToFileURL(join(tmpdir(),'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)
test('Conexión individual: carga diferida, comparador, video, actualización, RLS y cierre de sesión con respuesta tardía',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid'}),previos=new Map(),f=crearClienteIndividual()
 const poner=(n,v)=>{previos.set(n,Object.getOwnPropertyDescriptor(globalThis,n));Object.defineProperty(globalThis,n,{value:v,configurable:true,writable:true})}
 for(const n of ['window','document','HTMLElement','Event','MouseEvent'])poner(n,dom.window[n])
 poner('IS_REACT_ACT_ENVIRONMENT',true);poner('__clienteIndividual',f.cliente)
 const {act,createElement:h}=await import('react'),{createRoot}=await import('react-dom/client'),{crearServidorVitePrueba}=await import('./helpers/servidorVite.mjs')
 const vite=await crearServidorVitePrueba({server:{middlewareMode:true,hmr:false},appType:'custom',plugins:[{name:'individual-sin-servicios',enforce:'pre',resolveId(s){if(s.endsWith('/supabaseClient'))return '\0individual-cliente'},load(id){if(id==='\0individual-cliente')return 'export const supabase=globalThis.__clienteIndividual'}}]})
 const root=createRoot(document.getElementById('root')),pausa=()=>new Promise(r=>setTimeout(r,20))
 try{
 const C=(await vite.ssrLoadModule('/src/components/perfil/RendimientoIndividualConDatos.jsx')).default
 const props={jugador:f.principal,perfil:f.estado.perfil,temporadas:[{anio:'2026',partidos:1,minutos:80,goles:0,asistencias:0}],historico:h('p',null,'Histórico oficial'),onDetalle(){}}
 const montar=activo=>act(async()=>{root.render(h(C,{...props,activo}));await pausa()})
 await montar(false);assert.equal(f.llamadas.length,0,'No consulta datos al montar una pestaña oculta')
 await montar(true);await act(pausa);assert.equal(document.querySelectorAll('.ri-mapa').length,1)
 assert.match(document.body.textContent,/Partidos deportivos con análisis accesible/)
 const select=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Segunda jugadora')).querySelector('select')
 await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value').set.call(select,'k');select.dispatchEvent(new window.Event('change',{bubbles:true}));await pausa()});await act(pausa)
 assert.equal(document.querySelectorAll('.ri-mapa').length,2)
 const boton=texto=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes(texto))
 await act(()=>document.querySelector('.ri-mapa [role="button"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true})))
 const enlace=document.querySelector('.ri-enlace-video');assert.ok(enlace);assert.match(enlace.href,/v=abc123def45&t=0s/)
 f.estado.errores.analisis_eventos={code:'42501'}
 await act(async()=>{boton('Actualizar datos').click();await pausa()});await act(pausa)
 assert.match(document.body.textContent,/Acceso denegado a las acciones/);assert.equal(document.querySelectorAll('.ri-mapa').length,0)
 delete f.estado.errores.analisis_eventos
 await act(async()=>{boton('Actualizar datos').click();await pausa()});await act(pausa)
 assert.equal(document.querySelectorAll('.ri-mapa').length,2,'Conserva la comparación válida al actualizar')
 let liberar;f.estado.demora=tabla=>tabla==='analisis_eventos'?new Promise(r=>{liberar=r}):Promise.resolve()
 await act(async()=>{boton('Actualizar datos').click();await pausa()});assert.ok(liberar)
 f.estado.usuario=null
 await act(()=>f.emitir('SIGNED_OUT'));assert.equal(document.querySelectorAll('.ri-mapa').length,0);assert.match(document.body.textContent,/Iniciá sesión/)
 await act(async()=>{liberar();await pausa()});assert.equal(document.querySelectorAll('.ri-mapa').length,0,'La respuesta anterior no restaura datos tras cerrar sesión')
 }finally{await act(()=>root.unmount());await vite.close();dom.window.close();for(const [n,d]of previos){if(d)Object.defineProperty(globalThis,n,d);else delete globalThis[n]}}
})
