import test from 'node:test'
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
const {JSDOM}=await import(pathToFileURL(join(tmpdir(),'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)
test('Individual Premium: bloqueo seguro, filtros, dos jugadoras, mapas, explorador y temporada sin red',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid'}),previos=new Map()
 for(const n of ['window','document','HTMLElement','Event','MouseEvent','KeyboardEvent','IS_REACT_ACT_ENVIRONMENT']) {previos.set(n,Object.getOwnPropertyDescriptor(globalThis,n));Object.defineProperty(globalThis,n,{configurable:true,writable:true,value:n==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[n]})}
 const {act,createElement:h}=await import('react'),{createRoot}=await import('react-dom/client'),{crearServidorVitePrueba}=await import('./helpers/servidorVite.mjs')
 const vite=await crearServidorVitePrueba({server:{middlewareMode:true,hmr:false},appType:'custom'}),root=createRoot(document.getElementById('root'))
 try{
 const Componente=(await vite.ssrLoadModule('/src/components/perfil/RendimientoIndividual.jsx')).default
 const principal={id:'j',nombre:'Principal',apellido:'Ficticia',posicion:'Defensora'},segunda={id:'k',nombre:'Segunda',apellido:'Ficticia',posicion:'Delantera'}
 const evento=(id,jugador_id,tipo,x)=>({id,jugador_id,tipo,partido_id:'a',resultado:'Exitoso',segundo:61,periodo:1,zona:'alta',coordenada_x:x,coordenada_y:20})
 const filas=[evento('e1','j','Pase correcto',20),evento('e2','j','Despeje',null),evento('e3','k','Pase correcto',70)]
 const contrato={estado:'disponible',anio:2026,fuentes:Object.fromEntries(['eventos','analisis','partidos'].map(k=>[k,{estado:'disponible'}])),jugadoras:[principal,segunda].map(j=>({jugadorId:j.id,acciones:{estado:'con_registros',vinculadas:filas.filter(e=>e.jugador_id===j.id),sinVinculo:[]}}))}
 const base={jugador:principal,temporadas:[{anio:'2026',partidos:1,minutos:80,goles:0,asistencias:0},{anio:'2025',partidos:1,minutos:70,goles:0,asistencias:0}],historico:h('p',null,'Histórico existente'),onDetalle(){}}
 const render=props=>act(()=>root.render(h(Componente,{...base,...props})))
 const cambiar=async(el,v)=>act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype,'value').set.call(el,v);el.dispatchEvent(new window.Event('change',{bubbles:true}))})
 const select=nombre=>[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith(nombre))?.querySelector('select')
 await render({});assert.match(document.body.textContent,/pendiente de activación segura/);assert.equal(document.querySelectorAll('.ri-mapa').length,0);assert.equal(select('Segunda jugadora').disabled,true)
 await render({lecturaAcciones:{estado:'error'}});assert.match(document.querySelector('[role="alert"]').textContent,/No se pudieron/)
 await render({lecturaAcciones:{contrato,analisis:[{id:'a',rival:'Rival ficticio',fecha:'2026-01-02',partido_calendario_id:'p',partido_deportivo:{id:'p',fecha:'2026-01-02',rival:'Rival ficticio'}}]},jugadorasAutorizadas:[principal,segunda]})
 assert.equal(document.querySelectorAll('.ri-mapa').length,1);assert.match(document.body.textContent,/1 acciones sin ubicación exacta/)
 await cambiar(select('Segunda jugadora'),'k');assert.equal(document.querySelectorAll('.ri-mapa').length,2)
 const punto=document.querySelector('.ri-mapa [role="button"]')
 await act(()=>punto.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})))
 assert.match(document.querySelector('aside').textContent,/Acción seleccionada/);assert.match(document.querySelector('aside').textContent,/Sin vínculo de video/)
 await cambiar(select('Tipo de acción'),'Despeje');assert.equal(document.querySelectorAll('.ri-mapa [role="button"]').length,0);assert.match(document.querySelector('.ri-tabla-scroll:last-child')?.textContent || document.body.textContent,/Despeje/)
 await cambiar(select('Temporada'),'2025');assert.match(document.body.textContent,/pendiente de activación segura/);assert.equal(document.querySelectorAll('.ri-mapa').length,0)
 }finally{await act(()=>root.unmount());await vite.close();dom.window.close();for(const [n,d]of previos){if(d)Object.defineProperty(globalThis,n,d);else delete globalThis[n]}}
})
