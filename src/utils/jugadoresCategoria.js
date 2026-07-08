// Trae los jugadores de una categoría, agregando automáticamente a los
// jugadores marcados como "también reserva" cuando la categoría consultada
// ES la de Reserva. Así el cuerpo técnico de Reserva ve también a los
// chicos de inferiores que bajaron a jugar con ellos.
export function obtenerJugadoresDeCategoria(supabase, categoriaId, categorias, opciones = {}) {
  const { select = '*', orderBy = 'apellido' } = opciones
  const categoria = categorias?.find((c) => c.id === categoriaId)

  let query = supabase.from('jugadores').select(select)
  if (categoria?.es_reserva) {
    query = query.or(`categoria_id.eq.${categoriaId},tambien_reserva.eq.true`)
  } else {
    query = query.eq('categoria_id', categoriaId)
  }
  if (orderBy) query = query.order(orderBy)
  return query
}
