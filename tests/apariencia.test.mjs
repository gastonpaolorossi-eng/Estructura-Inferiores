import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COLORES } from '../src/theme.js'
import { crearGestorApariencia, claveApariencia } from '../src/appearance/gestorApariencia.js'

function preparar(sistemaOscuro = false) {
  const valores = new Map()
  const almacen = { getItem: (k) => valores.get(k) ?? null, setItem: (k, v) => valores.set(k, v) }
  const crear = () => crearGestorApariencia({ obtenerAlmacen: () => almacen, sistemaOscuro, memoria: new Map() })
  return { valores, almacen, crear }
}

test('sin preferencia guardada mantiene oscuro incluso con dispositivo claro', () => {
  const { crear } = preparar(false)
  const gestor = crear()
  assert.deepEqual(gestor.getSnapshot(), { usuarioId: null, preferencia: 'oscuro', temaEfectivo: 'oscuro' })
  gestor.cambiarUsuario('a')
  assert.equal(gestor.getSnapshot().temaEfectivo, 'oscuro')
})

test('sistema conserva la preferencia y reacciona a cambios del dispositivo', () => {
  const { crear, valores } = preparar()
  const gestor = crear()
  gestor.cambiarUsuario('a')
  gestor.cambiarPreferencia('sistema')
  assert.equal(gestor.getSnapshot().temaEfectivo, 'claro')
  gestor.cambiarSistema(true)
  assert.deepEqual(gestor.getSnapshot(), { usuarioId: 'a', preferencia: 'sistema', temaEfectivo: 'oscuro' })
  assert.equal(valores.get(claveApariencia('a')), 'sistema')
})

test('preferencia explicita ignora cambios de dispositivo y evita notificaciones innecesarias', () => {
  const gestor = preparar().crear()
  gestor.cambiarPreferencia('claro')
  const previo = gestor.getSnapshot()
  let cambios = 0
  const cancelar = gestor.subscribe(() => cambios++)
  gestor.cambiarSistema(true)
  assert.equal(gestor.getSnapshot(), previo)
  assert.equal(cambios, 0)
  cancelar()
})

test('persiste por usuario y se recupera en otra instancia', () => {
  const { crear } = preparar()
  const gestor = crear()
  gestor.cambiarUsuario('a')
  gestor.cambiarPreferencia('claro')
  const nuevaSesion = crear()
  nuevaSesion.cambiarUsuario('a')
  assert.equal(nuevaSesion.getSnapshot().preferencia, 'claro')
})

test('cambiar cuenta y cerrar sesion no transmite preferencias a otro usuario o visitante', () => {
  const gestor = preparar().crear()
  gestor.cambiarUsuario('a')
  gestor.cambiarPreferencia('claro')
  gestor.cambiarUsuario(null)
  assert.equal(gestor.getSnapshot().preferencia, 'oscuro')
  gestor.cambiarUsuario('b')
  assert.equal(gestor.getSnapshot().preferencia, 'oscuro')
  gestor.cambiarPreferencia('sistema')
  gestor.cambiarUsuario('a')
  assert.equal(gestor.getSnapshot().preferencia, 'claro')
})

test('almacenamiento ausente o con acceso denegado no interrumpe la sesion', () => {
  for (const obtenerAlmacen of [() => null, () => { throw new Error('SecurityError') }]) {
    const gestor = crearGestorApariencia({ obtenerAlmacen, memoria: new Map() })
    gestor.cambiarUsuario('a')
    gestor.cambiarPreferencia('sistema')
    gestor.cambiarUsuario('b')
    gestor.cambiarUsuario('a')
    assert.equal(gestor.getSnapshot().preferencia, 'sistema')
  }
})

test('fallo de escritura no permite que un valor antiguo reemplace la preferencia en memoria', () => {
  const gestor = crearGestorApariencia({ memoria: new Map(), obtenerAlmacen: () => ({
    getItem: () => 'oscuro', setItem: () => { throw new Error('QuotaExceededError') },
  }) })
  gestor.cambiarUsuario('a')
  gestor.cambiarPreferencia('claro')
  gestor.cambiarUsuario(null)
  gestor.cambiarUsuario('a')
  assert.equal(gestor.getSnapshot().preferencia, 'claro')
})

test('valor almacenado invalido cae en oscuro; cambios invalidos son rechazados', () => {
  const { crear, valores } = preparar()
  valores.set(claveApariencia('a'), 'inventado')
  const gestor = crear()
  gestor.cambiarUsuario('a')
  assert.equal(gestor.getSnapshot().preferencia, 'oscuro')
  assert.throws(() => gestor.cambiarPreferencia('inventado'))
})

test('paleta oscura de la guía y theme.js solo lee los tokens de apariencia.css', () => {
  const css = readFileSync(new URL('../src/appearance/apariencia.css', import.meta.url), 'utf8')
  const base = css.slice(0, css.indexOf('@media screen'))
  const variables = Object.fromEntries([...base.matchAll(/(--[\w-]+):\s*(#[\da-fA-F]+);/g)].map((m) => [m[1], m[2]]))
  const esperados = {
    fondoPagina: '#0b0b0a', fondoSidebar: '#0b0b0a', fondoTarjeta: '#141412', fondoSecundario: '#1c1c19',
    borde: '#2a2a25', texto: '#f3f1e8', textoSecundario: '#9a978a', textoMuted: '#5f5d54',
    acento: '#f4c400', textoSobreAcento: '#141200', exito: '#3ecf6e', alerta: '#e8b84a',
    peligro: '#ef4a4a', neutro: '#9a978a',
  }
  assert.deepEqual(Object.keys(COLORES), Object.keys(esperados))
  for (const [nombre, color] of Object.entries(esperados)) {
    const referencia = /^var\((--[\w-]+)\)$/.exec(COLORES[nombre])
    assert.ok(referencia, nombre)
    assert.equal(variables[referencia[1]], color, nombre)
  }
  assert.equal(variables['--marca-amarillo'], '#f4c400')
  assert.equal(variables['--marca-negro'], '#0b0b0a')
  assert.ok(css.includes("@media screen {\n  :root[data-apariencia='claro']"))
  assert.ok(!css.includes('@media print'))
})
