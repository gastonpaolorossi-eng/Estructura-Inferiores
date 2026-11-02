import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {crearClienteIndividual} from './helpers/clienteIndividual.mjs'
import {leerRendimientoIndividual,presentarLecturaIndividual} from '../src/utils/rendimiento/lecturaIndividual.js'
const {JSDOM}=await import(pathToFileURL(join(tmpdir(),'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)
const {createElement:h}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{crearServidorVitePrueba}=await import('./helpers/servidorVite.mjs')

test('Visual Premium: cabecera con foto/categoría, oficiales separados y comparador preservan valores reales',async()=>{
 const vite=await crearServidorVitePrueba({server:{middlewareMode:true,hmr:false},appType:'custom'})
 try{
 const C=(await vite.ssrLoadModule('/src/components/perfil/RendimientoIndividual.jsx')).default
 const f=crearClienteIndividual(),datos=await leerRendimientoIndividual(f.cliente,{principalId:'j',segundaId:'k',usuarioId:'u'})
 const lectura=presentarLecturaIndividual(datos,2026)
 const oficiales={partidos:12,titularidades:9,minutos:810,goles:2,asistencias:3,amarillas:1,rojas:0}
 const html=renderToStaticMarkup(h(C,{jugador:{...f.principal,foto_url:'/foto-fixture.jpg',categorias:{nombre:'Categoría sintética'}},temporadas:[{anio:'2026',partidos:12,minutos:810,goles:2,asistencias:3}],indicadoresOficiales:oficiales,lecturaAcciones:lectura,jugadorasAutorizadas:datos.jugadoras,segundaSeleccionada:'k',onDetalle(){},historico:h('p',null,'Histórico conservado')}))
 const dom=new JSDOM(html),d=dom.window.document
 assert.equal(d.querySelector('.ri-foto-portada img').getAttribute('src'),'/foto-fixture.jpg');assert.match(d.querySelector('.ri-cabecera').textContent,/Categoría sintética/)
 assert.deepEqual([...d.querySelectorAll('.ri-accesos-oficiales strong')].map(n=>n.textContent),['12','9','810','2','3','1','0'])
 assert.match(d.querySelector('.ri-oficiales').textContent,/Histórico · todos los períodos/)
 assert.equal(d.querySelector('.ri-oficiales details').open,false);assert.match(d.querySelector('.ri-oficiales details').textContent,/Histórico conservado/)
 assert.equal(d.querySelectorAll('.ri-jugadora-resumen').length,2);assert.equal(d.querySelectorAll('.ri-mapa').length,2)
 assert.ok(d.querySelector('.ri-analitica.ri-comparando'));assert.equal(d.querySelectorAll('.ri-explorador tbody tr').length,4)
 assert.equal(lectura.contrato.jugadoras[0].acciones.resumen.total,3,'El render no cambia el resumen de acciones')
 dom.window.close()
 }finally{await vite.close()}
})

test('Visual Premium: evolución comparte escala y posiciones temporales sin conectar ausencias',async()=>{
 const vite=await crearServidorVitePrueba({server:{middlewareMode:true,hmr:false},appType:'custom'})
 try{
 const C=(await vite.ssrLoadModule('/src/components/perfil/GraficosAccionesIndividual.jsx')).default
 const eventos=(n,id)=>Array.from({length:n},(_,i)=>({id:id+i,partido_id:'a',tipo:'Despeje',resultado:i%2?'Fallido':'Exitoso'}))
 const series=[{id:'j',nombre:'Principal ficticia',color:'#F2C230',eventos:eventos(10,'j')},{id:'k',nombre:'Segunda ficticia',color:'#64B5F6',eventos:eventos(2,'k')}]
 const analisis=[{id:'a',partido_calendario_id:'p',partido_deportivo:{id:'p',fecha:'2026-01-20',rival:'Rival sintético'}}]
 const d=new JSDOM(renderToStaticMarkup(h(C,{series,analisis,onTipo(){}})))
 const puntos=[...d.window.document.querySelectorAll('.ri-evolucion circle')]
 assert.deepEqual(puntos.map(n=>Number(n.getAttribute('cy'))),[50,174],'10 y 2 eventos usan el mismo máximo de 10')
 assert.equal(d.window.document.querySelectorAll('.ri-evolucion polyline').length,0)
 assert.ok(d.window.document.querySelector('.ri-evolucion').textContent.includes('20/01'));assert.match(d.window.document.body.textContent,/Rival sintético/)
 assert.match(d.window.document.body.textContent,/50%/);assert.ok(d.window.document.body.textContent.includes('5/10 acciones evaluadas'))
 d.window.close()
 const iguales=new JSDOM(renderToStaticMarkup(h(C,{series:series.map(s=>({...s,eventos:eventos(2,s.id)})),analisis,onTipo(){}})))
 assert.equal(new Set([...iguales.window.document.querySelectorAll('.ri-valor-punto')].map(n=>n.getAttribute('y'))).size,2,'Etiquetas de valores iguales se separan verticalmente')
 iguales.window.close()
 }finally{await vite.close()}
})

test('Visual Premium: cancha conserva coordenadas, resultados y exclusión de ubicaciones desconocidas',async()=>{
 const vite=await crearServidorVitePrueba({server:{middlewareMode:true,hmr:false},appType:'custom'})
 try{
 const C=(await vite.ssrLoadModule('/src/components/perfil/MapaAccionesIndividual.jsx')).default
 const eventos=[{id:'e',tipo:'Despeje',resultado:'Fallido',coordenada_x:25,coordenada_y:50,periodo:1},{id:'sin',tipo:'Despeje',coordenada_x:null,coordenada_y:20}]
 const d=new JSDOM(renderToStaticMarkup(h(C,{eventos,nombre:'Ficticia',seleccion:'e',onSeleccionar(){}})))
 const punto=d.window.document.querySelector('[role="button"] circle:last-child')
 assert.equal(punto.getAttribute('cx'),'25');assert.equal(punto.getAttribute('cy'),'32');assert.equal(punto.getAttribute('stroke'),'#FF7777')
 assert.equal(d.window.document.querySelectorAll('[role="button"]').length,1)
 assert.match(d.window.document.body.textContent,/1 acciones sin ubicación exacta/);assert.match(d.window.document.body.textContent,/no se invierte/)
 d.window.close()
 }finally{await vite.close()}
})

test('Visual Premium: estilos acotados, columnas adaptables, tema claro y movimiento reducido',()=>{
 const css=readFileSync('src/components/perfil/rendimientoIndividual.css','utf8')
 for(const selector of ['.ri-analitica','.ri-comparando .ri-mapas','.ri-foto-portada','.ri-efectividad-lista','.ri-timeline-scroll'])assert.ok(css.includes(selector))
 assert.match(css,/max-width:1050px/);assert.match(css,/max-width:600px/);assert.ok(css.includes('grid-template-columns:minmax(0,1fr)'))
 assert.match(css,/data-apariencia=claro/);assert.ok(css.includes('var(--ui-texto)'));assert.match(css,/prefers-reduced-motion/)
 assert.doesNotMatch(css,/!important|@media print/);assert.ok(!css.includes('body{'))
})
