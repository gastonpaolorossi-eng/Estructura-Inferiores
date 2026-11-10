import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/appearance/apariencia.css', import.meta.url), 'utf8')
const variables = (texto) => Object.fromEntries([...texto.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
const oscuro = variables(css.slice(0, css.indexOf('@media screen')))
const claro = { ...oscuro, ...variables(css.slice(css.indexOf('@media screen'))) }
// Los tokens de cada módulo son alias de --ui-*: se resuelven dentro del tema indicado.
const resolver = (token, paleta) => {
  const valor = paleta[token]
  const alias = /^var\((--[\w-]+)\)$/.exec(valor ?? '')
  return alias ? resolver(alias[1], paleta) : valor
}

test('paleta clara exacta y consistente entre Layout, carga, Inicio y controles compartidos', () => {
  for (const [valor, tokens] of Object.entries({
    '#f3f1e8': ['--ui-fondo-pagina', '--ui-fondo-sidebar', '--ui-estado-fondo', '--inicio-fondo', '--ui-compartido-fondo'],
    '#ffffff': ['--ui-superficie', '--inicio-tarjeta', '--ui-compartido-superficie'],
    '#141412': ['--ui-texto', '--inicio-texto', '--ui-estado-texto', '--ui-compartido-texto', '--login-control-texto'],
    '#141200': ['--ui-texto-sobre-acento', '--login-boton-texto'],
    '#5c594e': ['--ui-texto-secundario', '--inicio-secundario', '--ui-estado-secundario', '--ui-compartido-secundario'],
    '#66635a': ['--ui-texto-muted', '--inicio-tenue', '--ui-compartido-tenue'],
    '#d6d2c4': ['--ui-borde', '--inicio-borde', '--ui-control-borde', '--ui-compartido-borde'],
    '#f4c400': ['--ui-acento', '--marca-amarillo'],
  })) for (const token of tokens) assert.equal(resolver(token, claro), valor, token)
})

test('Login y componentes compartidos usan la paleta oscura de la guía', () => {
  const esperados = {
    '--login-control-fondo': '#1c1c19', '--login-control-texto': '#f3f1e8', '--login-boton-texto': '#141200',
    '--ui-compartido-fondo': '#0b0b0a', '--ui-compartido-superficie': '#141412',
    '--ui-compartido-texto': '#f3f1e8', '--ui-compartido-secundario': '#9a978a',
    '--ui-compartido-tenue': '#5f5d54', '--ui-compartido-borde': '#2a2a25',
  }
  for (const [token, valor] of Object.entries(esperados)) assert.equal(resolver(token, oscuro), valor, token)
})

test('estilos interactivos estan acotados a controles compartidos y al medio pantalla', () => {
  assert.match(css, /@media screen\s*\{\s*\.ui-control:focus-visible/)
  assert.equal(claro['--ui-foco'], '#6b5600')
  assert.doesNotMatch(css, /!important|@media print/)
})

test('render compartido sin consultas: Login, busqueda, categoria y tabla DataFem', async () => {
  const { crearServidorVitePrueba: createServer } = await import('./helpers/servidorVite.mjs')
  const { createServer: crearSocket } = await import('node:net')
  const { createElement } = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const socket = crearSocket()
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve) })
  const port = socket.address().port
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()))
  const server = await createServer({
    server: { middlewareMode: true, hmr: { port } }, appType: 'custom',
    plugins: [{
      name: 'supabase-sin-conexiones-para-render', enforce: 'pre',
      resolveId(source) { if (source.endsWith('/supabaseClient')) return '\0supabase-render-simulado' },
      load(id) {
        if (id === '\0supabase-render-simulado') return `export const supabase = {
          from() { throw new Error('No se permiten consultas en esta prueba'); },
          storage: { from() { return { getPublicUrl() { return { data: { publicUrl: '/escudo-de-prueba.png' } }; } }; } }
        };`
      },
    }],
  })
  try {
    const { default: Login } = await server.ssrLoadModule('/src/components/Login.jsx')
    const login = renderToStaticMarkup(createElement(Login))
    assert.match(login, /background-color:var\(--login-control-fondo/)
    assert.match(login, /color:var\(--login-boton-texto/)
    assert.match(login, /type="password"/)
    assert.match(login, /autoComplete="current-password"/i)
    const { default: Buscador } = await server.ssrLoadModule('/src/components/BuscadorGlobal.jsx')
    const buscador = renderToStaticMarkup(createElement(Buscador))
    assert.match(buscador, /--ui-compartido-superficie/)
    assert.match(buscador, /ui-control/)
    const { default: Categoria } = await server.ssrLoadModule('/src/components/CategoriaFiltro.jsx')
    const categoria = renderToStaticMarkup(createElement(Categoria, { bloqueada: true, categoriaNombre: 'Reserva', busqueda: 'Ana', onBusquedaChange: () => {} }))
    assert.match(categoria, /Reserva/)
    assert.match(categoria, /value="Ana"/)
    assert.doesNotMatch(categoria, /<select/)
    const libre = renderToStaticMarkup(createElement(Categoria, { categoriaId: '', busqueda: '', onCategoriaChange: () => {}, onBusquedaChange: () => {} }))
    assert.match(libre, /Todas las categorías/)
    const { TablaPosiciones } = await server.ssrLoadModule('/src/components/TablaDataFem.jsx')
    const tabla = renderToStaticMarkup(createElement(TablaPosiciones, { titulo: 'Zona B', destacarComunicaciones: true,
      filas: [{ equipo: 'Comunicaciones', posicion: 1, puntos: 30 }, { equipo: 'Otro equipo', posicion: 2, puntos: 25 }] }))
    assert.match(tabla, /★ /)
    assert.match(tabla, /--inicio-texto-acento/)
    assert.match(tabla, /--inicio-fondo/)
    assert.match(tabla, /Otro equipo/)
    const vacia = renderToStaticMarkup(createElement(TablaPosiciones, { titulo: 'General' }))
    assert.match(vacia, /No hay posiciones disponibles/)
  } finally { await server.close() }
})
