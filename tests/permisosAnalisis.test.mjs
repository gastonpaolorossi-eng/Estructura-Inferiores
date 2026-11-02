import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ADMINISTRADORES_ANALISIS, consultarAdministracionAnalisis, eliminarPartidoSeguro } from '../src/utils/permisosAnalisis.js'
import { guardarDestinataria } from '../src/utils/destinatariasPases.js'
import { guardarDestinoPase } from '../src/utils/trayectoriasPases.js'

test('Administración: dos identidades, rol resuelto por servidor y cierre seguro ante errores', async () => {
  for (const id of ADMINISTRADORES_ANALISIS) {
    for (const valor of [true, false]) {
      const llamadas = []
      const c = { auth: { getUser: async () => ({ data: { user: { id } } }) }, rpc: async n => { llamadas.push(n); return { data: valor } } }
      assert.equal(await consultarAdministracionAnalisis(c), valor)
      assert.deepEqual(llamadas, ['puede_administrar_analisis'])
    }
  }
  for (const id of [null, 'otra-coordinacion', 'tecnico']) assert.equal(await consultarAdministracionAnalisis({ auth: { getUser: async () => ({ data: { user: id ? { id } : null } }) }, rpc() { throw Error('No corresponde consultar'); } }), false)
  await assert.rejects(() => consultarAdministracionAnalisis({ auth: { getUser: async () => ({ data: { user: { id: ADMINISTRADORES_ANALISIS[0] } } }) }, rpc: async () => ({ error: { code: '42883' } }) }), { code: '42883' })
})

test('Gastón usa las mismas RPC y revisiones; una denegación del servidor nunca se reintenta', async () => {
  const llamadas = [], evento = { id: 'e', jugador_id: 'a', tipo: 'Pase correcto' }, detalle = { evento_id: 'e', revision: 4 }
  const c = { auth: { getUser: async () => ({ data: { user: { id: ADMINISTRADORES_ANALISIS[1] } } }) }, rpc: async (nombre, args) => { llamadas.push({ nombre, args }); return { error: { code: '42501' } } } }
  await assert.rejects(() => guardarDestinataria(c, evento, detalle, 'desconocida', null), { code: '42501' })
  await assert.rejects(() => guardarDestinoPase(c, evento, detalle, { x: 10, y: 20 }), { code: '42501' })
  assert.deepEqual(llamadas.map(c => [c.nombre, c.args.p_revision_esperada]), [['guardar_detalle_pase', 4], ['guardar_destino_pase', 4]])
})

test('Eliminación deportiva: una única RPC sin borrados independientes ni falso éxito', async () => {
  let llamadas = 0
  const c = { rpc: async (n, a) => { llamadas++; assert.equal(n, 'eliminar_partido_deportivo_seguro'); assert.deepEqual(a, { p_partido_id: 'p' }); return { data: 'p' } } }
  assert.equal(await eliminarPartidoSeguro(c, 'p'), 'p'); assert.equal(llamadas, 1)
  await assert.rejects(() => eliminarPartidoSeguro({ rpc: async () => ({ error: { code: '42501' } }) }, 'p'), { code: '42501' })
  await assert.rejects(() => eliminarPartidoSeguro({ rpc: async () => ({ data: null }) }, 'p'), /confirmar/)
  const codigo = readFileSync('src/components/ListaPartidos.jsx', 'utf8')
  assert.doesNotMatch(codigo, /\.delete\(|\.update\(/)
})

test('Migración propuesta: identidad y rol, políticas sin ciclo, RPC completas, transacción y respaldo', () => {
  const sql = readFileSync('supabase/migrations/202611010001_permisos_definitivos_analisis.sql', 'utf8')
  assert.match(sql, /^BEGIN;/); assert.match(sql, /COMMIT;\s*$/)
  for (const id of ADMINISTRADORES_ANALISIS) assert.ok(sql.includes(id))
  assert.match(sql, /lower\(p.rol\)='coordinacion'/)
  for (const n of ['guardar_detalle_pase', 'guardar_destino_pase']) {
    const cuerpo = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.' + n))
    assert.match(cuerpo, /IF NOT public.puede_administrar_analisis\(\) THEN/)
    assert.match(cuerpo, /FOR UPDATE/); assert.match(cuerpo, /revision/)
  }
  const politicaEventos = sql.slice(sql.indexOf('CREATE POLICY analisis_eventos_read'), sql.indexOf('CREATE POLICY analisis_partidos_read'))
  assert.match(politicaEventos, /public.jugadores/); assert.doesNotMatch(politicaEventos, /FROM public.analisis_partidos/)
  assert.match(sql, /SECURITY INVOKER/); assert.match(sql, /BEFORE DELETE ON public.partidos/)
  assert.match(sql, /REVOKE ALL ON public.analisis_eventos/)
  const rollback = readFileSync('supabase/rollback/202611010001_permisos_definitivos_analisis.sql', 'utf8')
  assert.match(rollback, /respaldo_permisos_20261101/)
})


test('Protocolo compatible: cabecera global y barrera SQL coinciden sin conceder autorización', async () => {
  const { PROTOCOLO_ESCRITURA } = await import('../src/config/protocoloEscritura.js')
  const sql = readFileSync('supabase/migrations/202611010001_permisos_definitivos_analisis.sql','utf8')
  assert.ok(sql.includes(PROTOCOLO_ESCRITURA))
  const cliente = readFileSync('src/supabaseClient.js','utf8')
  assert.match(cliente, /'x-client-info': PROTOCOLO_ESCRITURA/)
  for (const tabla of ['citaciones','estadisticas_jugador','videos']) assert.ok(sql.includes('ON public.'+tabla))
})
