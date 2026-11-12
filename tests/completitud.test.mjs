import test from 'node:test'
import assert from 'node:assert/strict'
import { faltantesAccion, resultadoImplicito, resultadoParaGuardar } from '../src/utils/analisis/completitud.js'
import { CATALOGO_BASE, CATALOGO_POR_DEFECTO as base, crearCatalogo } from '../src/utils/analisis/catalogoAcciones.js'

const conPunto = { id: 'e', jugador_id: 'j', coordenada_x: 40, coordenada_y: 55 }

test('Pases: el resultado sale del tipo y pisa cualquier otro', () => {
  assert.equal(resultadoImplicito('Pase correcto', base), 'Exitoso')
  assert.equal(resultadoImplicito('Pase incorrecto', base), 'Fallido')
  assert.equal(resultadoImplicito('Remate', base), null)
  assert.equal(resultadoParaGuardar('Pase correcto', '', base), 'Exitoso')
  assert.equal(resultadoParaGuardar('Pase incorrecto', 'Bloqueado', base), 'Fallido')
})

test('Resultado a guardar: el elegido si el tipo lleva resultado; vacío si no lleva', () => {
  assert.equal(resultadoParaGuardar('Remate', 'Gol', base), 'Gol')
  assert.equal(resultadoParaGuardar('Remate', '', base), null)
  // Un valor anterior que ya no está entre las opciones no se cambia sin aviso.
  assert.equal(resultadoParaGuardar('Remate', 'Exitoso', base), 'Exitoso')
  assert.equal(resultadoParaGuardar('Pérdida', 'Fallido', base), null)
  assert.equal(resultadoParaGuardar('Recuperación', 'Exitoso', base), null)
  assert.equal(resultadoParaGuardar('Atajada', 'Exitoso', base), null)
})

test('Acción sin jugadora ni ubicación', () => {
  assert.deepEqual(faltantesAccion({ id: 'e', tipo: 'Pérdida', jugador_id: null }, null, base), ['jugadora', 'ubicacion'])
  assert.deepEqual(faltantesAccion({ ...conPunto, tipo: 'Pérdida' }, null, base), [])
  // Una sola coordenada o fuera de rango no cuenta como ubicación.
  assert.deepEqual(faltantesAccion({ ...conPunto, tipo: 'Recuperación', coordenada_y: null }, null, base), ['ubicacion'])
  assert.deepEqual(faltantesAccion({ ...conPunto, tipo: 'Recuperación', coordenada_x: 140 }, null, base), ['ubicacion'])
  // La zona histórica sin punto exacto no alcanza.
  assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo: 'Intercepción', zona: 'Medio centro' }, null, base), ['ubicacion'])
})

test('Faltas exigen ubicación; Gol, Atajada y Salida de arquera no', () => {
  for (const tipo of ['Falta cometida', 'Falta recibida']) assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo }, null, base), ['ubicacion'])
  for (const tipo of ['Gol', 'Atajada', 'Salida de arquera']) assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo }, null, base), [])
})

test('Resultado solo en los tipos que lo llevan', () => {
  assert.deepEqual(faltantesAccion({ ...conPunto, tipo: 'Remate', resultado: null }, null, base), ['resultado'])
  assert.deepEqual(faltantesAccion({ ...conPunto, tipo: 'Remate', resultado: 'Fuera' }, null, base), [])
  assert.deepEqual(faltantesAccion({ ...conPunto, tipo: 'Despeje', resultado: '' }, null, base), ['resultado'])
  assert.deepEqual(faltantesAccion({ ...conPunto, tipo: 'Recuperación', resultado: null }, null, base), [])
})

test('Pases: receptora y destino; el resultado nunca falta', () => {
  const pase = { ...conPunto, tipo: 'Pase correcto', resultado: null }
  assert.deepEqual(faltantesAccion(pase, null, base), ['receptora', 'destino'])
  assert.deepEqual(faltantesAccion(pase, { destinataria_estado: 'pendiente', destino_x: null, destino_y: null }, base), ['receptora', 'destino'])
  assert.deepEqual(faltantesAccion(pase, { destinataria_estado: 'identificada', destinataria_id: 'k', destino_x: 70, destino_y: 20 }, base), [])
  assert.deepEqual(faltantesAccion(pase, { destinataria_estado: 'desconocida', destino_x: 70, destino_y: 20 }, base), [])
  assert.deepEqual(faltantesAccion({ id: 'e', tipo: 'Pase incorrecto' }, { destinataria_estado: 'no_observable' }, base), ['jugadora', 'ubicacion', 'destino'])
})

test('Las reglas salen de la tabla: un tipo nuevo y un tipo editado', () => {
  const catalogo = crearCatalogo([
    ...CATALOGO_BASE.map(t => t.codigo === 'Pérdida' ? { ...t, ubicacion: 'opcional', resultados: ['Exitoso', 'Fallido'] } : t),
    { codigo: 'control_de_arquera', etiqueta: 'Control de arquera', etiqueta_boton: 'Control', color: 'info', ubicacion: 'opcional',
      resultados: [], resultado_implicito: null, es_pase: false, grupo: 'arquera', orden: 17, visible: true, atajo: null },
  ])
  assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo: 'control_de_arquera' }, null, catalogo), [])
  assert.deepEqual(faltantesAccion({ id: 'e', tipo: 'control_de_arquera' }, null, catalogo), ['jugadora'])
  assert.equal(resultadoParaGuardar('control_de_arquera', 'Exitoso', catalogo), null)
  // Pérdida editada: ubicación opcional y con resultado.
  assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo: 'Pérdida' }, null, catalogo), ['resultado'])
  assert.equal(resultadoParaGuardar('Pérdida', 'Fallido', catalogo), 'Fallido')
})
