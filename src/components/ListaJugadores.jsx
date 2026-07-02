import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const colorEstado = {
  disponible: 'bg-green-500',
  lesionado: 'bg-yellow-500',
  suspendido: 'bg-red-500',
}

function ListaJugadores() {
  const [jugadores, setJugadores] = useState([])

  useEffect(() => {
    async function cargarJugadores() {
      const { data, error } = await supabase
        .from('jugadores')
        .select('*, categorias(nombre)')
        .order('apellido')

      if (error) {
        console.error(error)
      } else {
        setJugadores(data)
      }
    }
    cargarJugadores()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Plantel</h1>
      <div className="space-y-2">
        {jugadores.map((j) => (
          <div
            key={j.id}
            className="flex items-center gap-3 bg-neutral-900 p-3 rounded-lg"
            title={j.estado_detalle || ''}
          >
            <span className={`w-3 h-3 rounded-full ${colorEstado[j.estado]}`} />
            <span>{j.apellido}, {j.nombre}</span>
            <span className="text-neutral-500 text-sm ml-auto">{j.categorias?.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ListaJugadores