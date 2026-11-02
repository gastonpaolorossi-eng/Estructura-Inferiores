import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const base = '9701a2c2c551a433d757547b61584a6c9fcec88a'
const leer = p => readFileSync(p, 'utf8').replaceAll('\r', '')
test('Etapa 3 preserva estado, consultas, permisos, offline y handlers de ambas pantallas', () => {
  for (const nombre of ['AsistenciaSection', 'PlanificacionSection']) {
    const ruta = `src/components/${nombre}.jsx`
    const actual = leer(ruta)
    const previo = execFileSync('git', ['show', `${base}:${ruta}`], { encoding: 'utf8' }).replaceAll('\r', '')
    const inicio = nombre === 'AsistenciaSection' ? 'const ESTADOS' : 'const fechaTexto'
    const final = nombre === 'AsistenciaSection' ? '\n  return (\n    <div className=' : '\n  return <div className="planificacion'
    const logica = s => s.slice(s.indexOf(inicio), s.indexOf(final))
    assert.ok(actual.indexOf(final) > actual.indexOf(inicio))
    assert.ok(logica(actual).length > 1000)
    assert.equal(logica(actual), logica(previo))
    assert.match(actual, /EncabezadoSeccion/)
  }
})
test('Asistencia ofrece estados seleccionables accesibles y listado adaptable', () => {
  assert.match(leer('src/components/AsistenciaSection.jsx'), /aria-pressed=\{activo\}/)
  const css = leer('src/components/asistenciaPremium.css')
  assert.match(css, /max-width: 900px/)
  assert.match(css, /focus-visible/)
  assert.match(css, /prefers-reduced-motion/)
})
test('Semana conserva siete días sin anchura mínima que fuerce desplazamiento horizontal', () => {
  assert.match(leer('src/components/PlanificacionSection.jsx'), /length: 7/)
  const css = leer('src/components/planificacion.css')
  assert.match(css, /repeat\(7,minmax\(0,1fr\)\)/)
  for (const ancho of [1200, 900, 600]) assert.ok(css.includes(`max-width: ${ancho}px`))
  assert.doesNotMatch(css, /overflow-x: auto/)
})
