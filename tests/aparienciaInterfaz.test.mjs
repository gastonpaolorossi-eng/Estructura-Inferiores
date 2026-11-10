import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PALETA_INICIO, textoInicio } from '../src/appearance/paletaInicio.js'

const css = readFileSync(new URL('../src/appearance/apariencia.css', import.meta.url), 'utf8')
function variables(fragmento) {
  return Object.fromEntries([...fragmento.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}
const oscuro = variables(css.slice(0, css.indexOf('@media screen')))
const claro = { ...oscuro, ...variables(css.slice(css.indexOf('@media screen'))) }
function contraste(a, b) {
  const luminancia = (hex) => {
    const canales = hex.slice(1).match(/../g).map((c) => parseInt(c, 16) / 255)
      .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    return canales[0] * 0.2126 + canales[1] * 0.7152 + canales[2] * 0.0722
  }
  const valores = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (valores[0] + 0.05) / (valores[1] + 0.05)
}

// Los tokens de Inicio son alias de --ui-*: se resuelven dentro del tema indicado.
function resolver(valor, paleta) {
  const alias = /^var\((--[\w-]+)\)$/.exec(valor ?? '')
  return alias ? resolver(paleta[alias[1]], paleta) : valor
}

test('Inicio lee la paleta oscura de la guía desde los tokens, sin hex de respaldo', () => {
  const esperados = { fondo: '#0b0b0a', tarjeta: '#141412', tarjetaHover: '#1c1c19', borde: '#2a2a25',
    amarillo: '#f4c400', blanco: '#f3f1e8', gris: '#9a978a', tenue: '#5f5d54', verde: '#3ecf6e', rojo: '#ef4a4a' }
  for (const [key, color] of Object.entries(esperados)) {
    assert.match(PALETA_INICIO[key], /^var\(--[\w-]+\)$/, key)
    assert.equal(resolver(PALETA_INICIO[key], oscuro), color, key)
  }
  assert.match(PALETA_INICIO.amarilloSuave, /^var\(--[\w-]+\)$/)
  assert.equal(textoInicio(PALETA_INICIO.amarillo), 'var(--inicio-texto-acento)')
  assert.equal(textoInicio('#123456'), '#123456')
})

test('modo claro conserva amarillo institucional y contraste de textos principales y activos', () => {
  assert.equal(claro['--ui-acento'], '#f4c400')
  for (const [texto, fondo] of [
    ['--ui-nav-activo-texto', '--ui-superficie'],
    ['--ui-texto', '--ui-fondo-sidebar'], ['--ui-texto-acento', '--ui-fondo-sidebar'],
    ['--inicio-texto', '--inicio-tarjeta'], ['--inicio-secundario', '--inicio-tarjeta'],
    ['--inicio-tenue', '--inicio-tarjeta'], ['--inicio-texto-acento', '--inicio-tarjeta'],
    ['--inicio-texto-exito', '--inicio-tarjeta'], ['--inicio-texto-peligro', '--inicio-tarjeta'],
  ]) assert.ok(contraste(resolver(claro[texto], claro), resolver(claro[fondo], claro)) >= 4.5, `${texto} / ${fondo}`)
  assert.ok(Number(claro['--escudo-fondo-opacidad']) > Number(oscuro['--escudo-fondo-opacidad']))
})

test('El escudo decorativo vive en Layout para todas las secciones y no remonta por tema', () => {
  const layout = readFileSync(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
  assert.match(layout, /src=\{ESCUDO_URL\} alt="" aria-hidden="true" className="club-escudo-fondo"/)
  const estilosLayout = readFileSync(new URL('../src/components/layout.css', import.meta.url), 'utf8')
  assert.match(estilosLayout, /\.club-escudo-fondo \{[^}]*pointer-events: none/)
  assert.match(estilosLayout, /--escudo-fondo-opacidad/)
  const inicio = readFileSync(new URL('../src/components/InicioSection.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(inicio, /className="inicio-marca"/)
  assert.doesNotMatch(inicio, /key=\{(?:tema|preferencia|apariencia)/)
  assert.ok(!css.includes('@media print'))
})

test('selector usa el contexto existente, ofrece tres preferencias y variante compacta accesible', async () => {
  const { crearServidorVitePrueba: createServer } = await import('./helpers/servidorVite.mjs')
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  // Vite usa su puerto HMR por defecto cuando recibe 0; buscar uno libre evita
  // colisiones con la prueba SVG existente, que se ejecuta en otro worker.
  const { createServer: crearSocket } = await import('node:net')
  const socket = crearSocket()
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve) })
  const puerto = socket.address().port
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()))
  const server = await createServer({server:{middlewareMode:true,hmr:{port:puerto}},appType:'custom'})
  try {
    const { default: Selector } = await server.ssrLoadModule('/src/appearance/SelectorApariencia.jsx')
    const { ContextoApariencia } = await server.ssrLoadModule('/src/appearance/contextoApariencia.js')
    for (const preferencia of ['claro', 'oscuro', 'sistema']) {
      const html = renderToStaticMarkup(createElement(ContextoApariencia.Provider,
        {value:{preferencia,establecerPreferencia:()=>{}}},createElement(Selector)))
      assert.match(html, new RegExp(`value="${preferencia}" selected=""`))
      assert.equal((html.match(/<option /g)||[]).length, 3)
      assert.match(html, /Automático \(según el dispositivo\)/)
      assert.match(html, /<label for="/)
    }
    const compacto = renderToStaticMarkup(createElement(ContextoApariencia.Provider,
      {value:{preferencia:'oscuro',establecerPreferencia:()=>{}}},createElement(Selector,{compacto:true})))
    assert.match(compacto, /<summary aria-label="Configurar apariencia"/)
    assert.match(compacto, /left-full/)
    assert.match(compacto, /md:hidden/)
  } finally { await server.close() }
})
