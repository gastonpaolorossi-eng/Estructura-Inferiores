import test from 'node:test'
import assert from 'node:assert/strict'
import { faltantesAccion, resultadoImplicito, resultadoParaGuardar, TIPOS_CON_RESULTADO, TIPOS_UBICACION_OPCIONAL } from '../src/utils/analisis/completitud.js'

const base = { id: 'e', jugador_id: 'j', coordenada_x: 40, coordenada_y: 55 }

test('Pases: el resultado sale del tipo y pisa cualquier otro', () => {
  assert.equal(resultadoImplicito('Pase correcto'), 'Exitoso')
  assert.equal(resultadoImplicito('Pase incorrecto'), 'Fallido')
  assert.equal(resultadoImplicito('Remate'), null)
  assert.equal(resultadoParaGuardar('Pase correcto', ''), 'Exitoso')
  assert.equal(resultadoParaGuardar('Pase incorrecto', 'Exitoso'), 'Fallido')
  assert.equal(resultadoParaGuardar('Remate', 'Gol'), 'Gol')
  assert.equal(resultadoParaGuardar('Remate', ''), null)
  assert.equal(resultadoParaGuardar('Pérdida', null), null)
})

test('Catálogo de completitud acordado', () => {
  assert.deepEqual([...TIPOS_CON_RESULTADO].sort(), ['Centro', 'Despeje', 'Duelo aéreo', 'Duelo defensivo', 'Duelo ofensivo', 'Remate'])
  assert.deepEqual([...TIPOS_UBICACION_OPCIONAL].sort(), ['Atajada', 'Gol', 'Salida de arquera'])
})

test('Acción sin jugadora ni ubicación', () => {
  assert.deepEqual(faltantesAccion({ id: 'e', tipo: 'Pérdida', jugador_id: null }), ['jugadora', 'ubicacion'])
  assert.deepEqual(faltantesAccion({ ...base, tipo: 'Pérdida' }), [])
  // Una sola coordenada o fuera de rango no cuenta como ubicación.
  assert.deepEqual(faltantesAccion({ ...base, tipo: 'Recuperación', coordenada_y: null }), ['ubicacion'])
  assert.deepEqual(faltantesAccion({ ...base, tipo: 'Recuperación', coordenada_x: 140 }), ['ubicacion'])
  // La zona histórica sin punto exacto no alcanza.
  assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo: 'Intercepción', zona: 'Medio centro' }), ['ubicacion'])
})

test('Faltas exigen ubicación; Gol, Atajada y Salida de arquera no', () => {
  for (const tipo of ['Falta cometida', 'Falta recibida']) assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo }), ['ubicacion'])
  for (const tipo of ['Gol', 'Atajada', 'Salida de arquera']) assert.deepEqual(faltantesAccion({ id: 'e', jugador_id: 'j', tipo }), [])
})

test('Resultado solo en los tipos que lo llevan', () => {
  assert.deepEqual(faltantesAccion({ ...base, tipo: 'Remate', resultado: null }), ['resultado'])
  assert.deepEqual(faltantesAccion({ ...base, tipo: 'Remate', resultado: 'Fuera' }), [])
  assert.deepEqual(faltantesAccion({ ...base, tipo: 'Despeje', resultado: '' }), ['resultado'])
  assert.deepEqual(faltantesAccion({ ...base, tipo: 'Recuperación', resultado: null }), [])
})

test('Pases: receptora y destino; el resultado nunca falta', () => {
  const pase = { ...base, tipo: 'Pase correcto', resultado: null }
  assert.deepEqual(faltantesAccion(pase), ['receptora', 'destino'])
  assert.deepEqual(faltantesAccion(pase, { destinataria_estado: 'pendiente', destino_x: null, destino_y: null }), ['receptora', 'destino'])
  assert.deepEqual(faltantesAccion(pase, { destinataria_estado: 'identificada', destinataria_id: 'k', destino_x: 70, destino_y: 20 }), [])
  assert.deepEqual(faltantesAccion(pase, { destinataria_estado: 'desconocida', destino_x: 70, destino_y: 20 }), [])
  assert.deepEqual(faltantesAccion({ id: 'e', tipo: 'Pase incorrecto' }, { destinataria_estado: 'no_observable' }), ['jugadora', 'ubicacion', 'destino'])
})
