import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const { JSDOM } = await import(pathToFileURL(process.env.PIZARRA_DOM_PATH || join(tmpdir(), 'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)

test('Autorización UI: sesión, rol, rechazo, respuestas tardías y revocación sin remontar al refrescar', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://comunicaciones.test' })
  const previos = new Map()
  const poner = (n, v) => { previos.set(n, Object.getOwnPropertyDescriptor(globalThis, n)); Object.defineProperty(globalThis, n, { value: v, configurable: true, writable: true }) }
  for (const n of ['window', 'document', 'HTMLElement', 'Event']) poner(n, dom.window[n])
  poner('IS_REACT_ACT_ENVIRONMENT', true)
  const { act, createElement: h } = await import('react'), { createRoot } = await import('react-dom/client')
  const { crearServidorVitePrueba } = await import('./helpers/servidorVite.mjs')
  const id = 'b2c65c50-8772-45a4-b2e0-c0e53c66253b'
  let permitido = true, demorar = false, resolver, peticiones = 0
  poner('__autorizacionAnalisisPrueba', { auth: { getUser: async () => ({ data: { user: { id } } }) }, rpc: async () => { peticiones++; return demorar ? new Promise(r => { resolver = r }) : { data: permitido } } })
  const servidor = await crearServidorVitePrueba({ server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [{ name: 'acceso-analisis-simulado', enforce: 'pre', resolveId(s) { if (s.endsWith('/supabaseClient')) return '\0acceso-mock' }, load(id) { if (id === '\0acceso-mock') return 'export const supabase=globalThis.__autorizacionAnalisisPrueba' } }] })
  const root = createRoot(document.getElementById('root'))
  try {
    const { default: useAcceso } = await servidor.ssrLoadModule('/src/hooks/useAdministracionAnalisis.js')
    function Editor({ escribir }) { return h('div', null, h('input', { defaultValue: 'borrador' }), h('video'), h('button', { disabled: !escribir }, 'administrar')) }
    function Ejemplo({ sesion, rol }) { const acceso = useAcceso(sesion, rol); return acceso.puedeMontar ? h(Editor, { escribir: acceso.puedeEscribir }) : h('span', null, 'bloqueado') }
    const sesion = { user: { id }, access_token: 'simulado-no-real' }
    const montar = async (s, rol) => act(async () => { root.render(h(Ejemplo, { sesion: s, rol })); await Promise.resolve() })
    await montar(undefined, undefined); assert.equal(document.body.textContent, 'bloqueado')
    await montar(sesion, 'coordinacion'); assert.equal(document.body.textContent, 'administrar')
    const campo = document.querySelector('input'), video = document.querySelector('video')
    campo.value = 'formulario sin guardar'; video.currentTime = 42
    demorar = true
    await montar({ ...sesion, access_token: 'renovado' }, 'coordinacion')
    assert.equal(document.querySelector('input'), campo)
    assert.equal(document.querySelector('video'), video)
    assert.equal(document.querySelector('button').disabled, true)
    await act(async () => { resolver({ data: true }); await Promise.resolve() })
    assert.equal(campo.value, 'formulario sin guardar'); assert.equal(video.currentTime, 42)
    assert.equal(document.querySelector('button').disabled, false)
    await act(async () => { window.dispatchEvent(new window.Event('focus')); await Promise.resolve() })
    await act(async () => { resolver({ error: { message: 'sin conexión' } }); await Promise.resolve() })
    assert.equal(document.querySelector('input'), campo)
    assert.equal(document.querySelector('button').disabled, true)
    demorar = false
    permitido = false
    await act(async () => { window.dispatchEvent(new window.Event('focus')); await Promise.resolve() })
    assert.equal(document.body.textContent, 'bloqueado')
    await montar(null, 'coordinacion'); assert.equal(document.body.textContent, 'bloqueado')
    demorar = true
    await montar(sesion, 'coordinacion')
    const antes = peticiones
    await act(() => { window.dispatchEvent(new window.Event('focus')); window.dispatchEvent(new window.Event('focus')) })
    assert.equal(peticiones, antes, 'No duplica la consulta pendiente')
    await montar(null, 'coordinacion')
    await act(async () => { resolver({ data: true }); await Promise.resolve() })
    assert.equal(document.body.textContent, 'bloqueado', 'No restaura acceso desde una sesión anterior')
    await montar(sesion, 'tecnico'); assert.equal(document.body.textContent, 'bloqueado')
  } finally {
    await act(() => root.unmount()); await servidor.close(); dom.window.close()
    for (const [n, d] of previos) { if (d) Object.defineProperty(globalThis, n, d); else delete globalThis[n] }
  }
})
