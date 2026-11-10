// Último dorsal con el que fue citada cada jugadora, según la convocatoria más reciente que tenga dorsal.
// Una sola consulta para todas las ids; si falla, devuelve un mapa vacío y la interfaz usa el puesto.
export async function ultimosDorsales(supabase, jugadorIds) {
  const ids = [...new Set((jugadorIds || []).filter(Boolean))]
  if (!ids.length) return {}
  const { data, error } = await supabase
    .from('citaciones')
    .select('jugador_id, dorsal, partidos(fecha, hora)')
    .in('jugador_id', ids)
    .not('dorsal', 'is', null)
  if (error) return {}
  const ultimo = {}
  for (const c of data || []) {
    const clave = `${c.partidos?.fecha || ''}T${c.partidos?.hora || ''}`
    if (!ultimo[c.jugador_id] || clave > ultimo[c.jugador_id].clave) ultimo[c.jugador_id] = { clave, dorsal: c.dorsal }
  }
  return Object.fromEntries(Object.entries(ultimo).map(([id, { dorsal }]) => [id, dorsal]))
}
