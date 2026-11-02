import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import {accionesDeContrato, distribucionIndividual, evolucionIndividual, filtrarEventosIndividual, FILTROS_INDIVIDUALES, puntoEventoIndividual} from '../src/utils/rendimiento/presentacionIndividual.js'
const e=(id,tipo,resultado,partido_id='a')=>({id,tipo,resultado,partido_id,jugador_id:'j',segundo:65,periodo:1,zona:'alta',coordenada_x:25,coordenada_y:40})
test('Individual: no lectura ni ceros para fuente pendiente, denegada o temporada distinta',()=>{
 assert.equal(accionesDeContrato(null,'j',2026),null)
 const contrato={estado:'disponible',anio:2026,fuentes:Object.fromEntries(['eventos','analisis','partidos'].map(k=>[k,{estado:'disponible'}])),jugadoras:[{jugadorId:'j',acciones:{estado:'sin_registros_accesibles'}}]}
 assert.deepEqual(accionesDeContrato({contrato},'j',2026),[])
 assert.equal(accionesDeContrato({estado:'denegado',contrato},'j',2026),null)
 assert.equal(accionesDeContrato({estado:'error',contrato},'j',2026),null)
 assert.equal(accionesDeContrato({contrato},'j',2025),null)
 contrato.fuentes.eventos.estado='denegado'; assert.equal(accionesDeContrato({contrato},'j',2026),null)
})
test('Individual: coordenadas exactas y filtros compartidos sin ubicar zonas aproximadas',()=>{
 for(const v of [null,undefined,'',false,-1,101,'no']) assert.equal(puntoEventoIndividual({coordenada_x:v,coordenada_y:20}),null)
 assert.deepEqual(puntoEventoIndividual({coordenada_x:0,coordenada_y:100}),{x:0,y:100})
 const eventos=[e('1','Pase correcto','Exitoso'),e('2','Despeje',null,'b')]
 assert.deepEqual(filtrarEventosIndividual(eventos,{...FILTROS_INDIVIDUALES,partido:'a',tipo:'Pase correcto',periodo:'1',zona:'alta',minutoDesde:'1',minutoHasta:'1'}).map(e=>e.id),['1'])
 assert.deepEqual(filtrarEventosIndividual(eventos,{...FILTROS_INDIVIDUALES,resultado:'__pendiente'}).map(e=>e.id),['2'])
 assert.equal(filtrarEventosIndividual([{...eventos[0],segundo:null}],{...FILTROS_INDIVIDUALES,minutoDesde:'1'}).length,0)
})
test('Individual: efectividad reutiliza motor, neutros/pendientes excluidos y porcentajes N/D',()=>{
 const eventos=['Exitoso','Fallido','Neutro',null].map((r,i)=>e(String(i),'Despeje',r))
 const d=distribucionIndividual(eventos)[0]
 assert.equal(d.efectividad.porcentaje,50);assert.equal(d.efectividad.evaluadas,2);assert.equal(d.resultados.neutros,1);assert.equal(d.resultados.pendientes,1)
 assert.equal(distribucionIndividual([e('1','Despeje','Neutro')])[0].efectividad.porcentaje,null)
})
test('Individual: evolución agrupa análisis del mismo partido por ID y no inventa continuidad ni vínculos',()=>{
 const partido={id:'p',fecha:'2026-02-03',rival:'Ficticio'}
 const analisis=[{id:'a',partido_calendario_id:'p',partido_deportivo:partido},{id:'b',partido_calendario_id:'p',partido_deportivo:partido},{id:'c',fecha:'2026-02-04'}]
 const filas=evolucionIndividual([e('1','Despeje',null),e('2','Despeje',null,'b'),e('3','Despeje',null,'c')],analisis)
 assert.equal(filas.length,1);assert.equal(filas[0].resumen.total,2);assert.equal(filas[0].id,'p')
 assert.deepEqual(evolucionIndividual([],analisis),[])
})
test('Individual: integración preserva consultas y seis pestañas; CSS aislado y responsive sin tocar PDF',()=>{
 const perfil=readFileSync('src/components/PerfilJugador.jsx','utf8'),antes=execFileSync('git',['show','HEAD:src/components/PerfilJugador.jsx'],{encoding:'utf8'})
 for(const regex of [/\.from\('([^']+)'\)/g,/\.select\('([^']+)'\)/g]) assert.deepEqual([...perfil.matchAll(regex)].map(m=>m[1]),[...antes.matchAll(regex)].map(m=>m[1]))
 assert.equal((perfil.match(/id: '(resumen|rendimiento|evaluaciones|seguimiento|datos|documentos)'/g)||[]).length,6)
 const componente=readFileSync('src/components/perfil/RendimientoIndividual.jsx','utf8')
 assert.doesNotMatch(componente,/supabase|fetch\(|localStorage|validarAlcanceIndividual/)
 const css=readFileSync('src/components/perfil/rendimientoIndividual.css','utf8')
 assert.match(css,/max-width:1050px/);assert.match(css,/max-width:600px/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);assert.match(css,/min-height:44px/)
 assert.doesNotMatch(css,/!important|@media print/)
})
