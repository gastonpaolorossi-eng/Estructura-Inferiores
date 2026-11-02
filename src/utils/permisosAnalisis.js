export const ADMINISTRADORES_ANALISIS = Object.freeze([
  'f7562d52-a16a-48b5-95a0-efbcc70080d3',
  'b2c65c50-8772-45a4-b2e0-c0e53c66253b',
])

// Filtro de interfaz, nunca sustituye la autorización de RLS/RPC.
export const esCuentaAdministradoraAnalisis = id => ADMINISTRADORES_ANALISIS.includes(id)

// Solo clasifica el fallo de la RPC consultada; nunca lo convierte en autorización.
export const faltaRpcAdministracionAnalisis = error => ['PGRST202', '42883'].includes(error?.code)

export async function consultarAdministracionAnalisis(cliente) {
  const respuesta = await cliente.auth.getUser()
  if (respuesta.error) throw respuesta.error
  if (!esCuentaAdministradoraAnalisis(respuesta.data?.user?.id)) return false
  const { data, error } = await cliente.rpc('puede_administrar_analisis')
  if (error) throw error
  if (typeof data !== 'boolean') throw new Error('No se pudo verificar la autorización de Análisis.')
  return data
}

export async function eliminarPartidoSeguro(cliente, partidoId) {
  const { data, error } = await cliente.rpc('eliminar_partido_deportivo_seguro', { p_partido_id: partidoId })
  if (error) throw error
  if (data !== partidoId) throw new Error('No se pudo confirmar la eliminación. Actualizá el listado antes de reintentar.')
  return data
}
