import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import ListaPartidos from './ListaPartidos'
import ConvocarPartido from './ConvocarPartido'
import AgregarPartido from './AgregarPartido'

function PartidosSection() {
  const [categorias, setCategorias] = useState([])
  const [categoriaId, setCategoriaId] = useState('')
  const [partidoId, setPartidoId] = useState(null)
  const [vista, setVista] = useState('categorias') // categorias | lista | agregar | convocar | aviso
  const [refrescar, setRefrescar] = useState(0)

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase.from('categorias').select('*').order('orden')
      setCategorias(data || [])
    }
    cargar()
  }, [])

  function elegirCategoria(id) {
    setCategoriaId(id)
    setVista('lista')
  }

  if (vista === 'agregar') {
    return (
      <AgregarPartido
        categoriaId={categoriaId}
        onVolver={() => setVista('lista')}
        onGuardado={() => {
          setRefrescar((r) => r + 1)
          setVista('lista')
        }}
      />
    )
  }

  if (vista === 'aviso') {
    return (
      <div className="p-6 md:p-10">
        <div className="max-w-xl mx-auto text-center py-20">
          <p className="text-3xl mb-3">✅</p>
          <h1
            className="text-xl mb-2"
            style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
          >
            Convocatoria guardada
          </h1>
          <p className="text-sm mb-6" style={{ color: '#5B6B85' }}>
            La pantalla para armar la formación en la cancha está en construcción.
          </p>
          <button
            onClick={() => {
              setPartidoId(null)
              setVista('lista')
            }}
            className="text-sm font-medium px-4 py-2.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#4ADE80', color: '#0F1419' }}
          >
            Volver a partidos
          </button>
        </div>
      </div>
    )
  }

  if (vista === 'convocar') {
    return (
      <ConvocarPartido
        partidoId={partidoId}
        categoriaId={categoriaId}
        onVolver={() => setVista('lista')}
        onSiguiente={() => setVista('aviso')}
      />
    )
  }

  if (vista === 'lista') {
    return (
      <ListaPartidos
        categoriaId={categoriaId}
        refrescar={refrescar}
        onVolver={() => setVista('categorias')}
        onElegirPartido={(id) => {
          setPartidoId(id)
          setVista('convocar')
        }}
        onNuevoPartido={() => setVista('agregar')}
      />
    )
  }

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <h1
          className="text-3xl md:text-4xl mb-6"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          Partidos
        </h1>
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: '#5B6B85' }}>
          Elegí una categoría
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => elegirCategoria(c.id)}
              className="p-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548', color: '#F0F2F5' }}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PartidosSection