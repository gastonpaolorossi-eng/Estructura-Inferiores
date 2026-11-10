import { PARTIDOS as P } from '../appearance/partidos'
import { useEffect, useState } from 'react'
import { obtenerEstadisticasCategoria } from '../utils/exportarEstadisticas'
import EncabezadoSeccion from './ui/EncabezadoSeccion'
import EstadoVacio from './ui/EstadoVacio'
import './comparativaJugadoras.css'

const COLUMNAS = [
  { clave: 'apellido', label: 'Jugadora', numerica: false },
  { clave: 'partidos', label: 'PJ' },
  { clave: 'titularidades', label: 'Titular' },
  { clave: 'minutos', label: 'Min' },
  { clave: 'goles', label: 'Goles' },
  { clave: 'asistencias', label: 'Asist.' },
  { clave: 'amarillas', label: 'Amar.' },
  { clave: 'rojas', label: 'Rojas' },
]

// Métricas que ya calcula obtenerEstadisticasCategoria; en todas, más es mejor.
const METRICAS = [
  { clave: 'partidos', label: 'Partidos' },
  { clave: 'titularidades', label: 'Titularidades' },
  { clave: 'minutos', label: 'Minutos' },
  { clave: 'goles', label: 'Goles' },
  { clave: 'asistencias', label: 'Asistencias' },
]

// Percentil de presentación dentro del plantel: 100 es la mejor y 0 la peor en esa métrica.
function percentil(filas, clave, valor) {
  if (filas.length < 2) return valor > 0 ? 100 : 0
  return Math.round(100 * filas.filter(f => (f[clave] || 0) < (valor || 0)).length / (filas.length - 1))
}

const RADIO = 110
const angulo = i => -Math.PI / 2 + i * 2 * Math.PI / METRICAS.length
const punto = (i, v) => [Math.cos(angulo(i)) * RADIO * v / 100, Math.sin(angulo(i)) * RADIO * v / 100]
const puntos = valores => valores.map((v, i) => punto(i, v).map(n => n.toFixed(1)).join(',')).join(' ')
const nombreCorto = f => f.apellido || f.nombre || 'Jugadora'

function Radar({ seleccion }) {
  return <svg className="cmp-radar-svg" viewBox="-185 -140 370 280" role="img"
    aria-label={'Radar de percentiles: ' + seleccion.map(s => `${nombreCorto(s.fila)} ${s.pct.join(', ')}`).join(' frente a ')}>
    {[25, 50, 75, 100].map(r => <polygon key={r} className="cmp-radar-red" points={puntos(METRICAS.map(() => r))} />)}
    {METRICAS.map((m, i) => {
      const [x, y] = punto(i, 100), [lx, ly] = punto(i, 122)
      return <g key={m.clave}>
        <line className="cmp-radar-red" x1="0" y1="0" x2={x} y2={y} />
        <text className="cmp-radar-etiqueta" x={lx} y={ly} textAnchor={Math.abs(lx) < 5 ? 'middle' : lx > 0 ? 'start' : 'end'} dominantBaseline="middle">{m.label.toUpperCase()}</text>
      </g>
    })}
    {[...seleccion].reverse().map((s, j) => <polygon key={s.fila.id + '-' + j} className={'cmp-radar-poligono ' + (j === seleccion.length - 1 ? 'a' : 'b')} points={puntos(s.pct)} />)}
    {seleccion[0] && seleccion[0].pct.map((v, i) => { const [x, y] = punto(i, v); return <circle key={i} className="cmp-radar-punto" cx={x} cy={y} r="3.5" /> })}
  </svg>
}

function ComparativaJugadoras({ categoriaId, categoriaNombre, onVolver }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ordenPor, setOrdenPor] = useState('goles')
  const [ordenDesc, setOrdenDesc] = useState(true)
  const [elegidas, setElegidas] = useState([])

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      const data = await obtenerEstadisticasCategoria(categoriaId)
      setFilas(data)
      setCargando(false)
    }
    if (categoriaId) cargar()
  }, [categoriaId])

  function cambiarOrden(clave) {
    if (ordenPor === clave) {
      setOrdenDesc((v) => !v)
    } else {
      setOrdenPor(clave)
      setOrdenDesc(true)
    }
  }

  const filasOrdenadas = [...filas].sort((a, b) => {
    if (ordenPor === 'apellido') {
      const comp = `${a.apellido}, ${a.nombre}`.localeCompare(`${b.apellido}, ${b.nombre}`)
      return ordenDesc ? comp : -comp
    }
    const comp = (a[ordenPor] || 0) - (b[ordenPor] || 0)
    return ordenDesc ? -comp : comp
  })

  // Sin elección todavía: las dos con más minutos. El primer clic marca en amarillo; la anterior pasa a blanco.
  const porMinutos = [...filas].sort((a, b) => (b.minutos || 0) - (a.minutos || 0))
  const ids = elegidas.filter(id => filas.some(f => f.id === id))
  const idsVisibles = ids.length ? ids : porMinutos.slice(0, 2).map(f => f.id)
  const seleccion = idsVisibles.map(id => filas.find(f => f.id === id)).filter(Boolean)
    .map(fila => ({ fila, pct: METRICAS.map(m => percentil(filas, m.clave, fila[m.clave])) }))
  const elegir = id => setElegidas(() => idsVisibles[0] === id ? idsVisibles : [id, idsVisibles[0]].filter(Boolean))

  return (
    <div className="p-6 md:p-10">
      <div className="club-ancho">
        <button
          onClick={onVolver}
          className="text-sm mb-6 flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: P.secundario }}
        >
          ← Volver
        </button>

        <div className="mb-6">
          <EncabezadoSeccion eyebrow={categoriaNombre ? categoriaNombre + ' · Percentil dentro del plantel' : 'Percentil dentro del plantel'}
            eyebrowResaltado="Totales acumulados" titulo="Compara" resaltado="tiva" />
        </div>

        {cargando && <EstadoVacio cargando mensaje="Cargando estadísticas…" />}

        {!cargando && filas.length === 0 && <EstadoVacio mensaje="Sin estadísticas en esta categoría." />}

        {!cargando && filas.length > 0 && <>
          <div className="cmp">
            <section className="cmp-panel cmp-elegir" aria-labelledby="cmp-elegir-titulo">
              <h2 id="cmp-elegir-titulo">Elegí dos jugadoras</h2>
              <ul>{[...filas].sort((a, b) => `${a.apellido}`.localeCompare(`${b.apellido}`)).map(f => {
                const marca = f.id === idsVisibles[0] ? 'a' : f.id === idsVisibles[1] ? 'b' : undefined
                return <li key={f.id}><button type="button" data-marca={marca} aria-pressed={Boolean(marca)} onClick={() => elegir(f.id)}>
                  <span className="cmp-nombre">{f.apellido}</span><small>{f.nombre}</small>
                </button></li>
              })}</ul>
              <p className="cmp-nota">El primer clic marca en amarillo; la anterior pasa a blanco.</p>
            </section>

            <section className="cmp-panel cmp-radar" aria-labelledby="cmp-radar-titulo">
              <h2 id="cmp-radar-titulo">Perfil</h2>
              <Radar key={idsVisibles.join('-')} seleccion={seleccion} />
              <p className="cmp-leyenda">{seleccion.map((s, j) => <span key={s.fila.id} data-marca={j ? 'b' : 'a'}><b aria-hidden="true" />{s.fila.nombre} {s.fila.apellido}</span>)}</p>
            </section>

            <section className="cmp-panel cmp-barras" aria-labelledby="cmp-barras-titulo">
              <h2 id="cmp-barras-titulo">{METRICAS.length} métricas</h2>
              {METRICAS.map((m, i) => <div key={m.clave} className="cmp-metrica">
                <p>{m.label}</p>
                {seleccion.map((s, j) => <div key={s.fila.id} className="cmp-fila" data-marca={j ? 'b' : 'a'}>
                  <b>{s.fila[m.clave] || 0}</b>
                  <span className="cmp-pista" aria-hidden="true"><i style={{ width: s.pct[i] + '%' }} /></span>
                  <span className="cmp-percentil" aria-label={`Percentil ${s.pct[i]} de ${nombreCorto(s.fila)}`}>P{s.pct[i]}</span>
                </div>)}
              </div>)}
              <p className="cmp-nota">P = percentil: 100 es la mejor del plantel en esa métrica.</p>
            </section>
          </div>

          <details className="cmp-tabla">
            <summary>Tabla completa · tocá una columna para ordenar</summary>
            <div className="overflow-x-auto" style={{ border: "1px solid var(--ui-compartido-borde)" }}>
              <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: P.superficie }}>
                    {COLUMNAS.map((c) => (
                      <th
                        key={c.clave}
                        onClick={() => cambiarOrden(c.clave)}
                        className="text-left p-2.5 whitespace-nowrap cursor-pointer select-none hover:opacity-80"
                        style={{ color: ordenPor === c.clave ? 'var(--ui-texto-acento)' : P.secundario }}
                      >
                        {c.label} {ordenPor === c.clave ? (ordenDesc ? '↓' : '↑') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filasOrdenadas.map((f, i) => (
                    <tr key={`${f.apellido}-${f.nombre}-${i}`} style={{ backgroundColor: i % 2 === 0 ? 'transparent' : P.fila }}>
                      <td className="p-2.5 font-medium whitespace-nowrap" style={{ color: P.texto }}>
                        {f.apellido}, {f.nombre}
                      </td>
                      <td className="p-2.5 whitespace-nowrap" style={{ color: P.secundario }}>{f.partidos}</td>
                      <td className="p-2.5 whitespace-nowrap" style={{ color: P.secundario }}>{f.titularidades}</td>
                      <td className="p-2.5 whitespace-nowrap" style={{ color: P.secundario }}>{f.minutos}</td>
                      <td className="p-2.5 whitespace-nowrap font-bold" style={{ color: P.texto }}>{f.goles}</td>
                      <td className="p-2.5 whitespace-nowrap" style={{ color: P.secundario }}>{f.asistencias}</td>
                      <td className="p-2.5 whitespace-nowrap" style={{ color: P.aviso }}>{f.amarillas}</td>
                      <td className="p-2.5 whitespace-nowrap" style={{ color: P.peligro }}>{f.rojas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>}
      </div>
    </div>
  )
}

export default ComparativaJugadoras
