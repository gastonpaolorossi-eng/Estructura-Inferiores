import test from 'node:test'
import assert from 'node:assert/strict'
import {crearClienteIndividual} from './helpers/clienteIndividual.mjs'
import {leerRendimientoIndividual,presentarLecturaIndividual,enlaceVideoIndividual,temporadasLecturaIndividual} from '../src/utils/rendimiento/lecturaIndividual.js'
const leer=f=>leerRendimientoIndividual(f.cliente,{principalId:'j',usuarioId:'u'})
test('Lector individual: 1201 eventos paginados, alcance por IDs, mapa sin coordenadas falsas y motor compartido',async()=>{
 const f=crearClienteIndividual({cantidad:1201})
 f.tablas.analisis_partidos.push({id:'ajeno',categoria_id:'c',partido_calendario_id:'sin-registro',fecha:'2026-02-01'})
 const datos=await leer(f),r=presentarLecturaIndividual(datos,2026)
 assert.equal(datos.analisis.length,1,'No consulta análisis de terceros de toda la categoría')
 datos.analisis[0].fecha='2027-01-01';assert.deepEqual(temporadasLecturaIndividual(datos),['2026'],'No inventa una temporada a partir de la fecha del análisis cuando existe vínculo deportivo')
 assert.equal(datos.eventos.length,1201);assert.equal(f.llamadas.filter(c=>c.tabla==='analisis_eventos').length,3)
 assert.ok(f.llamadas.filter(c=>c.tabla==='analisis_eventos').every(c=>c.filtros.some(([col,ids])=>col==='jugador_id' && ids.length===1 && ids[0]==='j')))
 assert.equal(r.contrato.jugadoras[0].acciones.resumen.total,1201);assert.equal(r.contrato.jugadoras[0].muestra.partidosConAnalisisEnAlcance,1)
 assert.equal(r.contrato.jugadoras[0].oficiales.participacionValidada.minutos,80);assert.equal(r.analisis[0].partido_deportivo.id,'p')
 assert.equal(r.contrato.jugadoras[0].acciones.resumen.efectividad.porcentaje,null)
 assert.equal(presentarLecturaIndividual(datos,2025).contrato.jugadoras[0].acciones.resumen,null)
})
test('Lector individual: segunda jugadora y Reserva se limitan a filas visibles; ausencia no implica acceso denegado',async()=>{
 const f=crearClienteIndividual({cantidad:0}),datos=await leerRendimientoIndividual(f.cliente,{principalId:'j',segundaId:'k',usuarioId:'u'})
 assert.deepEqual(datos.seleccion,['j','k']);assert.equal(presentarLecturaIndividual(datos,2026).contrato.jugadoras[0].acciones.estado,'sin_registros_accesibles')
 assert.ok(datos.jugadoras.some(j=>j.tambien_reserva && j.categoria_id!==datos.perfil.categoria_id))
 const otro=await leerRendimientoIndividual(f.cliente,{principalId:'j',segundaId:'ajena',usuarioId:'u'})
 assert.deepEqual(otro.seleccion,['j']);assert.ok(f.llamadas.filter(c=>c.tabla==='analisis_eventos').every(c=>!c.filtros.some(([,ids])=>ids.includes('ajena'))))
 f.estado.visibles=[];const vacio=await leer(f);assert.equal(vacio.estado,'no_disponible');assert.notEqual(vacio.estado,'denegado')
})
test('Lector individual: errores, RLS y minutos inaccesibles no se convierten en cero',async()=>{
 const f=crearClienteIndividual();f.estado.errores.analisis_eventos={code:'42501'}
 let d=await leer(f);assert.equal(d.estado,'denegado');assert.equal(d.eventos,null);assert.equal(presentarLecturaIndividual(d,2026).contrato.jugadoras[0].acciones.resumen,null)
 delete f.estado.errores.analisis_eventos;f.estado.errores.estadisticas_jugador={code:'42501'}
 d=await leer(f);assert.equal(d.estado,'parcial');const j=presentarLecturaIndividual(d,2026).contrato.jugadoras[0];assert.equal(j.acciones.resumen.total,3);assert.equal(j.oficiales.participacionValidada.minutos,null);assert.equal(j.muestra.por90,null)
})
test('Lector individual: sesiones diferentes o cerradas y cancelación no entregan datos residuales',async()=>{
 const f=crearClienteIndividual({cantidad:1001})
 await assert.rejects(leerRendimientoIndividual(f.cliente,{principalId:'j',usuarioId:'otra'}),e=>e.status===401);assert.equal(f.llamadas.length,0)
 let vigente=true;f.estado.demora=async tabla=>{if(tabla==='analisis_eventos')vigente=false}
 await assert.rejects(leerRendimientoIndividual(f.cliente,{principalId:'j',usuarioId:'u',vigente:()=>vigente}),e=>e.name==='AbortError')
 assert.equal(f.llamadas.filter(c=>c.tabla==='analisis_eventos').length,1)
 f.estado.demora=null;f.cliente.auth.getUser=async()=>({data:{user:null}});await assert.rejects(leer(f),e=>e.status===401)
})
test('Lector individual: pérdida de categoría durante la consulta descarta la respuesta',async()=>{
 const f=crearClienteIndividual();f.estado.demora=async tabla=>{if(tabla==='partidos')f.estado.perfil.categoria_id='nueva'}
 await assert.rejects(leer(f),e=>e.status===403)
})
test('Video individual: solo análisis exacto, HTTPS/YouTube válido y segundo registrado no negativo',()=>{
 const e={partido_id:'a',segundo:61.8},a={id:'a',video_url:'https://youtu.be/abc123def45'}
 assert.equal(enlaceVideoIndividual(e,a),'https://www.youtube.com/watch?v=abc123def45&t=61s')
 for(const url of ['javascript:alert(1)','https://youtube.com.malicioso.test/watch?v=abc123def45','http://youtu.be/abc123def45','https://youtu.be/no'])assert.equal(enlaceVideoIndividual(e,{...a,video_url:url}),null)
 assert.equal(enlaceVideoIndividual({...e,segundo:null},a),null);assert.equal(enlaceVideoIndividual(e,{...a,id:'b'}),null)
})
