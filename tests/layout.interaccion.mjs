import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const { JSDOM } = await import(pathToFileURL(process.env.PIZARRA_DOM_PATH || join(tmpdir(), 'comunicaciones-pizarra-dom/node_modules/jsdom/lib/api.js')).href)

test('Layout: SVG, foco móvil, Escape, resize, temas y módulos sin remontaje ni escrituras', { timeout: 15000 }, async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://comunicaciones.test/' })
  const anteriores = new Map()
  const poner = (nombre, valor) => {
    anteriores.set(nombre, Object.getOwnPropertyDescriptor(globalThis, nombre))
    Object.defineProperty(globalThis, nombre, { value: valor, configurable: true, writable: true })
  }
  for (const n of ['window', 'document', 'HTMLElement', 'Event', 'MouseEvent']) poner(n, dom.window[n])
  poner('IS_REACT_ACT_ENVIRONMENT', true)
  let ancho = 1440, oscuro = false
  const consultas = []
  window.matchMedia = query => {
    const oyentes = new Set()
    const media = { media: query, get matches() { return query.includes('min-width') ? ancho >= 768 : oscuro },
      addEventListener(_, fn) { oyentes.add(fn) }, removeEventListener(_, fn) { oyentes.delete(fn) } }
    consultas.push({ media, oyentes })
    return media
  }
  // JSDOM no calcula geometría. Se modela únicamente visibilidad para el foco,
  // no se afirma verificar diseño, contraste ni medidas reales de pantalla.
  dom.window.HTMLElement.prototype.getClientRects = function () {
    if (!this.isConnected || this.closest('[inert]')) return []
    for (let el = this; el; el = el.parentElement) {
      if (el.hasAttribute('data-solo-escritorio') && ancho < 768) return []
      if (el.classList.contains('md:hidden') && ancho >= 768) return []
      if (el.classList.contains('hidden') && (ancho < 768 || ![...el.classList].some(c => c === 'md:flex' || c === 'md:block'))) return []
    }
    if (this.closest('details:not([open])') && !this.closest('summary')) return []
    return [{ x: 0, y: 0, width: 44, height: 44 }]
  }
  const { act, createElement: h, useEffect, useState } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { crearServidorVitePrueba: createServer } = await import('./helpers/servidorVite.mjs')
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', plugins: [{
    name: 'layout-sin-servidores', enforce: 'pre',
    resolveId(s) { if (s.endsWith('/supabaseClient')) return '\0layout-db' },
    load(id) { if (id === '\0layout-db') return 'export const supabase={from(){throw Error("No se permiten consultas")},auth:{signOut(){throw Error("No se permite cerrar la sesión real")}}}' },
  }] })
  const root = createRoot(document.getElementById('root'))
  let montajes = 0, desmontajes = 0
  function Modulo() {
    const [valor, setValor] = useState('Borrador sin guardar')
    useEffect(() => { montajes++; return () => { desmontajes++ } }, [])
    return h('section', null, h('input', { 'aria-label': 'Formulario abierto', value: valor, onChange: e => setValor(e.target.value) }), h('video', { 'aria-label': 'Reproductor abierto' }))
  }
  const click = async el => { assert.ok(el); await act(() => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))) }
  const key = async (tecla, shiftKey = false) => act(() => document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: tecla, shiftKey, bubbles: true, cancelable: true })))
  const seleccionar = async (el, valor) => act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value').set.call(el, valor)
    el.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  })
  const viewport = async valor => act(() => {
    ancho = valor
    for (const { media, oyentes } of consultas) if (media.media.includes('min-width')) for (const fn of oyentes) fn({ matches: media.matches })
  })
  try {
    const { default: Layout } = await server.ssrLoadModule('/src/components/Layout.jsx')
    const { default: Proveedor } = await server.ssrLoadModule('/src/appearance/ProveedorApariencia.jsx')
    function Aplicacion() {
      const [seccion, setSeccion] = useState('inicio')
      return h(Proveedor, null, h(Layout, { perfil: { rol: 'coordinacion', nombre: 'Prueba' }, puedeAdministrarAnalisis: true, seccionActiva: seccion, onCambiarSeccion: setSeccion }, h(Modulo)))
    }
    await act(async () => { root.render(h(Aplicacion)); await Promise.resolve() })
    const buscar = label => document.querySelector('button[aria-label="' + label + '"]')
    const video = document.querySelector('video'), input = document.querySelector('[aria-label="Formulario abierto"]')
    video.currentTime = 37
    assert.equal(montajes, 1)
    for (const b of document.querySelectorAll('nav button')) {
      assert.ok(b.querySelector('svg[aria-hidden="true"]'))
      assert.equal(b.querySelector('svg').getAttribute('stroke'), 'currentColor')
    }
    assert.equal(buscar('Inicio').getAttribute('aria-current'), 'page')
    const menu = document.querySelector('[role="dialog"]')
    const opener = buscar('Abrir secciones')
    assert.equal(menu.hasAttribute('inert'), true)
    assert.equal(opener.getAttribute('aria-expanded'), 'false')
    for (const grupo of ['Equipo', 'Partidos', 'Rendimiento', 'Planificación', 'Gestión']) {
      assert.ok([...menu.querySelectorAll('h2')].some(t => t.textContent === grupo), grupo)
    }
    await act(() => opener.focus())
    document.body.style.overflow = 'auto'
    await click(opener)
    assert.equal(menu.hasAttribute('inert'), false)
    assert.equal(menu.getAttribute('aria-modal'), 'true')
    assert.equal(opener.getAttribute('aria-expanded'), 'true')
    assert.equal(document.querySelector('.club-contenido').hasAttribute('inert'), true)
    assert.equal(document.querySelector('.club-barra').hasAttribute('inert'), true)
    assert.ok(document.activeElement === buscar('Cerrar menú'))
    assert.equal(document.body.style.overflow, 'hidden')
    await key('Tab', true)
    assert.ok(document.activeElement === [...menu.querySelectorAll('nav button')].at(-1))
    await key('Tab')
    assert.ok(document.activeElement === buscar('Cerrar menú'))
    await key('Escape')
    assert.ok(document.activeElement === opener)
    assert.equal(menu.hasAttribute('inert'), true)
    assert.equal(document.body.style.overflow, 'auto')
    assert.equal(document.querySelector('.club-contenido').hasAttribute('inert'), false)
    await click(opener)
    await click(buscar('Calendario'))
    assert.equal(buscar('Calendario').getAttribute('aria-current'), 'page')
    assert.equal(buscar('Inicio').hasAttribute('aria-current'), false)
    assert.equal(document.querySelector('.club-ubicacion b').textContent, 'Calendario')
    assert.ok(document.activeElement === opener)
    await click(opener)
    await click(buscar('Cerrar menú'))
    assert.ok(document.activeElement === opener)
    await click(opener)
    await click(buscar('Análisis'))
    assert.equal(document.querySelector('video'), video)
    assert.equal(video.currentTime, 37)
    assert.equal(document.querySelector('[aria-label="Formulario abierto"]'), input)
    assert.equal(input.value, 'Borrador sin guardar')
    assert.equal(montajes, 1)
    assert.equal(desmontajes, 0)

    await click(buscar('Usuario y apariencia'))
    assert.ok(buscar('Cerrar sesión'))
    const selector = document.querySelector('select')
    for (const tema of ['claro', 'oscuro']) {
      await seleccionar(selector, tema)
      assert.equal(document.documentElement.dataset.apariencia, tema)
    }
    await seleccionar(selector, 'sistema')
    assert.equal(document.documentElement.dataset.apariencia, 'claro')
    await act(() => {
      oscuro = true
      for (const { media, oyentes } of consultas) if (media.media.includes('prefers-color-scheme')) for (const fn of oyentes) fn({ matches: true })
    })
    assert.equal(document.documentElement.dataset.apariencia, 'oscuro')
    assert.equal(document.querySelector('video'), video)

    await key('Escape')
    assert.equal(buscar('Cerrar sesión'), null)

    // En el celular el menú funciona igual.
    await viewport(390)
    await click(opener)
    assert.equal(menu.getAttribute('aria-modal'), 'true')
    assert.ok(document.activeElement === buscar('Cerrar menú'))
    await click(buscar('Calendario'))
    assert.equal(menu.hasAttribute('inert'), true)
    assert.ok(document.activeElement === opener)
    assert.equal(document.body.style.overflow, 'auto')
    assert.equal(montajes, 1)
    assert.equal(desmontajes, 0)
  } finally {
    await act(() => root.unmount())
    await server.close()
    dom.window.close()
    for (const [nombre, descriptor] of anteriores) {
      if (descriptor) Object.defineProperty(globalThis, nombre, descriptor)
      else delete globalThis[nombre]
    }
  }
})
