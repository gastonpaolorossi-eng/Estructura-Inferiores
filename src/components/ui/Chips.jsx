import './panelDeportivo.css'

/**
 * Filtros tipo chip. El seleccionado se muestra invertido (claro sobre oscuro).
 * opciones: [{ valor, etiqueta }]. El padre decide qué filtrar con onCambiar.
 */
export default function Chips({ opciones = [], valor, onCambiar, etiqueta }) {
  return <div className="dp-chips" role="group" aria-label={etiqueta}>
    {etiqueta && <span className="dp-chips-etiqueta" aria-hidden="true">{etiqueta}</span>}
    {opciones.map(opcion => <button key={String(opcion.valor)} type="button" className="dp-chip"
      aria-pressed={opcion.valor === valor} onClick={() => onCambiar?.(opcion.valor)}>
      {opcion.etiqueta}
    </button>)}
  </div>
}
