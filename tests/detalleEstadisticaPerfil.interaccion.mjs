import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { crearServidorVitePrueba } from './helpers/servidorVite.mjs'
const { JSDOM } = await import(pathToFileURL(join(tmpdir(), 'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)

test('Detalle oficial: abrir minutos desde Rendimiento, históricos, otros indicadores y errores sin perder el perfil', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://comunicaciones.test/' })
  const anteriores = new Map()
  for (const n of ['window', 'document', 'HTMLElement', 'Event', 'MouseEvent']) {
    anteriores.set(n, Object.getOwnPropertyDescriptor(globalThis, n))
    Object.defineProperty(globalThis, n, { value: dom.window[n], configurable: true, writable: true })
  }
  anteriores.set('IS_REACT_ACT_ENVIRONMENT', Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'))
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const { act, createElement: h } = await import('react')
  const { createRoot } = await import('react-dom/client')
  let filas = [
    { id: 'uno', minutos_jugados: 90, titular: true, goles: 1, asistencias: 1, tarjetas_amarillas: 1, tarjetas_rojas: 1, partidos: { fecha: '2026-05-01', rival: 'Rival reciente' } },
    { id: 'dos', minutos_jugados: '45', partidos: { fecha: '2025-04-01', rival: 'Rival histórico' } },
    { id: 'tres', minutos_jugados: null, partidos: null },
    { id: 'cero', minutos_jugados: 0, partidos: { fecha: null, rival: 'Sin minutos' } },
  ], error = null
  globalThis.__detallePerfilDB = { from(tabla) {
    const q = { select() { return q }, eq() { return q }, order() { return q }, gte() { return q }, lte() { return q }, not() { return q }, single() { return q },
      then(ok, mal) { return Promise.resolve({ data: tabla === 'jugadores' ? { id: 'j', nombre: 'Sintética', apellido: 'Prueba', categorias: { nombre: 'Primera' } } : tabla === 'estadisticas_jugador' ? filas : [], error: tabla === 'estadisticas_jugador' ? error : null }).then(ok, mal) } }
    return q
  } }
  const vite = await crearServidorVitePrueba({ server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [{ name: 'detalle-perfil-db', enforce: 'pre', resolveId(s) { if (s.endsWith('/supabaseClient')) return '\0detalle-db' }, load(id) { if (id === '\0detalle-db') return 'export const supabase = globalThis.__detallePerfilDB' } }] })
  const erroresRender = []
  const root = createRoot(document.getElementById('root'), { onUncaughtError: e => erroresRender.push(e) })
  const click = async el => { assert.ok(el); await act(async () => el.click()) }
  const boton = texto => [...document.querySelectorAll('button')].find(n => n.textContent.includes(texto))
  let Perfil
  const montar = async key => {
    await act(async () => { root.render(h(Perfil, { key, jugadorId: 'j', perfil: { rol: 'coordinacion' }, onVolver() {}, onEditar() {} })); await new Promise(r => setTimeout(r, 30)) })
    await click([...document.querySelectorAll('[role="tab"]')].find(n => n.textContent === 'Rendimiento'))
  }
  try {
    Perfil = (await vite.ssrLoadModule('/src/components/PerfilJugador.jsx')).default
    await montar('con-minutos')
    await click(document.querySelectorAll('.ri-accesos-oficiales button')[2])
    assert.equal(erroresRender.length, 0, 'El clic en Minutos no debe producir config.filtro de undefined')
    assert.match(document.querySelector('.perfil-detalle-estadistico').textContent, /Minutos jugados/)
    assert.match(document.querySelector('.perfil-detalle-estadistico').textContent, /90'|90 minutos/)
    assert.match(document.querySelector('.perfil-detalle-estadistico').textContent, /Rival histórico/)
    assert.doesNotMatch(document.querySelector('.perfil-detalle-estadistico').textContent, /Sin minutos/)
    await click(boton('Volver al perfil'))
    assert.equal(document.querySelector('.perfil-detalle-estadistico'), null)
    for (const indice of [0, 1, 3, 4, 5, 6]) {
      await click(document.querySelectorAll('.ri-accesos-oficiales button')[indice])
      assert.ok(document.querySelector('.perfil-detalle-estadistico'))
      await click(boton('Volver al perfil'))
    }
    assert.equal(document.querySelectorAll('[role="tab"]').length, 6)
    filas = []
    await montar('sin-minutos')
    await click(document.querySelectorAll('.ri-accesos-oficiales button')[2])
    assert.match(document.querySelector('.perfil-detalle-estadistico').textContent, /No hay partidos registrados/)
    error = { code: '42501' }
    await montar('denegado')
    assert.match(document.body.textContent, /La sesión no tiene acceso a esta fuente/)
    assert.equal(document.querySelector('.ri-accesos-oficiales'), null)
    const Detalle = (await vite.ssrLoadModule('/src/components/perfil/DetalleEstadisticaPerfil.jsx')).default
    await act(() => root.render(h(Detalle, { filtroStat: 'minutos', statConfig: {}, estadisticas: [], jugador: {}, setFiltroStat() {} })))
    assert.match(document.body.textContent, /detalle no está disponible/i)
    await act(() => root.render(h(Detalle, { filtroStat: 'minutos', statConfig: {}, estadisticas: [], jugador: {}, fuente: { error }, setFiltroStat() {} })))
    assert.match(document.body.textContent, /La sesión no tiene acceso a esta fuente/)
    const config = { minutos: { titulo: 'Minutos jugados', filtro: e => e.minutos_jugados > 0, valor: e => `${e.minutos_jugados}'` } }
    await act(() => root.render(h(Detalle, { filtroStat: 'minutos', statConfig: config, estadisticas: [null, { id: 'invalida', minutos_jugados: 12, partidos: { fecha: 2026 } }, { id: 'sin-partido', minutos_jugados: 30, partidos: null }], jugador: {}, setFiltroStat() {} })))
    assert.match(document.body.textContent, /Fecha no disponible/)
    assert.match(document.body.textContent, /12'/)
    let cerrado = false
    const defectuosa = { minutos: { titulo: 'Minutos jugados', filtro() { throw new Error('Fallo de render sintético del detalle') } } }
    await act(() => root.render(h('main', null, h('p', null, 'Resto del perfil preservado'), h(Detalle, { filtroStat: 'minutos', statConfig: defectuosa, estadisticas: [{ id: 'x' }], jugador: {}, setFiltroStat() { cerrado = true } }))))
    assert.match(document.body.textContent, /No se pudo mostrar este detalle/)
    assert.match(document.body.textContent, /Resto del perfil preservado/)
    await click(boton('Volver al perfil'))
    assert.equal(cerrado, true)
    assert.equal(erroresRender.length, 0)
  } finally {
    await act(() => root.unmount()); await vite.close(); dom.window.close()
    delete globalThis.__detallePerfilDB
    for (const [n, d] of anteriores) { if (d) Object.defineProperty(globalThis, n, d); else delete globalThis[n] }
  }
})
