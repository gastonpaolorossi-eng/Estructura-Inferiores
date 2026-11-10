import { PARTIDOS as P } from '../appearance/partidos'
import { useEffect, useState } from 'react'
import { obtenerEstadisticasCategoria } from '../utils/exportarEstadisticas'
import EncabezadoSeccion from './ui/EncabezadoSeccion'
import EstadoVacio from './ui/EstadoVacio'

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

function ComparativaJugadoras({ categoriaId, categoriaNombre, onVolver }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ordenPor, setOrdenPor] = useState('goles')
  const [ordenDesc, setOrdenDesc] = useState(true)

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

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onVolver}
          className="text-sm mb-6 flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: P.secundario }}
        >
          ← Volver
        </button>

        <div className="mb-6">
          <EncabezadoSeccion eyebrow={categoriaNombre} eyebrowResaltado="Tocá una columna para ordenar" titulo="Compara" resaltado="tiva" />
        </div>

        {cargando && <EstadoVacio cargando mensaje="Cargando estadísticas…" />}

        {!cargando && filas.length === 0 && <EstadoVacio mensaje="Sin estadísticas en esta categoría." />}

        {!cargando && filas.length > 0 && (
          <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--ui-compartido-borde)" }}>
            <table className="min-w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: P.superficie }}>
                  {COLUMNAS.map((c) => (
                    <th
                      key={c.clave}
                      onClick={() => cambiarOrden(c.clave)}
                      className="text-left p-2.5 whitespace-nowrap cursor-pointer select-none hover:opacity-80"
                      style={{ color: ordenPor === c.clave ? P.exito : P.secundario }}
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
                    <td className="p-2.5 whitespace-nowrap font-bold" style={{ color: P.exito }}>{f.goles}</td>
                    <td className="p-2.5 whitespace-nowrap" style={{ color: P.secundario }}>{f.asistencias}</td>
                    <td className="p-2.5 whitespace-nowrap" style={{ color: P.aviso }}>{f.amarillas}</td>
                    <td className="p-2.5 whitespace-nowrap" style={{ color: P.peligro }}>{f.rojas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ComparativaJugadoras
