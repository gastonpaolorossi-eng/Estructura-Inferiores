import './panelDeportivo.css'

/**
 * Mensaje corto con una acción sugerida opcional. Reemplaza los "Sin datos", "Cargando…" y
 * los ceros que en realidad indican ausencia de registros. No consulta datos ni decide permisos.
 * accion: { etiqueta, onClick } (solo si el padre ya la autorizó).
 */
export default function EstadoVacio({ mensaje = 'Todavía no hay registros.', detalle, accion, cargando = false }) {
  return <div className="dp-vacio" data-cargando={cargando || undefined}>
    <div role="status" aria-live="polite" aria-busy={cargando || undefined}>
      {cargando && <span className="dp-vacio-barra" aria-hidden="true"><i /></span>}
      <p className="dp-vacio-mensaje">{cargando && mensaje === 'Todavía no hay registros.' ? 'Cargando…' : mensaje}</p>
      {detalle && <p className="dp-vacio-detalle">{detalle}</p>}
    </div>
    {accion && !cargando && <button type="button" className="dp-btn dp-btn-secundario" onClick={accion.onClick}>{accion.etiqueta}</button>}
  </div>
}
