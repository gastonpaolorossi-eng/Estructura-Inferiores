import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const ruta = 'src/components/FisicoSection.jsx'
const actual = readFileSync(ruta, 'utf8').replaceAll('\r', '')
const anterior = execFileSync('git', ['show', `1046c72ea5052967611c2732018ac220660f899c:${ruta}`], { encoding: 'utf8' }).replaceAll('\r', '')
test('Físico Premium conserva lógica, permisos, estados, consultas, guardados y navegación contextual', () => {
  const logica = s => s.slice(s.indexOf('function normalizarNombre'), s.indexOf('\n  return (\n    <div className='))
  assert.ok(logica(actual).length > 5000)
  assert.equal(logica(actual), logica(anterior))
  const contenido = s => s.slice(s.indexOf('        {/* Contenido de cada módulo'))
  assert.equal(contenido(actual), contenido(anterior))
})
test('Físico Premium conserva seis accesos directos con agrupaciones solamente visuales y CSS aislado', () => {
  assert.match(actual, /titulo="Preparación física"/)
  for (const key of ['wellness', 'rpe', 'carga', 'cmj', 'semaforo', 'ciclo']) assert.ok(actual.includes(`key: '${key}'`))
  assert.match(actual, /onClick=\{\(\) => setTab\(t.key\)\}/)
  const css = readFileSync('src/components/fisicoPremium.css', 'utf8')
  assert.match(css, /max-width: 1600px/)
  assert.match(css, /max-width: 600px/)
  assert.match(css, /prefers-reduced-motion/)
  assert.match(css, /focus-visible/)
})
