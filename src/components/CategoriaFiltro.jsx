import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function CategoriaFiltro({ categoriaId, onCategoriaChange, busqueda, onBusquedaChange }) {
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase.from('categorias').select('*').order('orden')
      setCategorias(data || [])
    }
    cargar()
  }, [])

  const inputStyle = {
    backgroundColor: '#1A2332',
    border: '1px solid #2A3548',
    color: '#F0F2F5',
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <select
        value={categoriaId}
        onChange={(e) => onCategoriaChange(e.target.value)}
        className="p-2.5 rounded-xl outline-none text-sm sm:w-48"
        style={inputStyle}
      >
        <option value="">Todas las categorías</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Buscar jugador..."
        value={busqueda}
        onChange={(e) => onBusquedaChange(e.target.value)}
        className="p-2.5 rounded-xl outline-none text-sm flex-1"
        style={inputStyle}
      />
    </div>
  )
}

export default CategoriaFiltro