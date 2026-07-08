// Cola de guardados pendientes para cuando no hay conexión.
// No es una PWA instalable: es un respaldo simple en localStorage para que
// Asistencia y Físico no se pierdan si se cargan en una cancha sin señal.
// Al volver la conexión, se sincroniza automáticamente con Supabase.

const CLAVE = 'cola_offline_v1'

function leerCola() {
  try {
    const raw = localStorage.getItem(CLAVE)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function escribirCola(cola) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(cola))
  } catch {
    // localStorage lleno o no disponible: seguimos sin respaldo local
  }
}

export function agregarPendiente(item) {
  const cola = leerCola()
  cola.push({
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    creado: new Date().toISOString(),
  })
  escribirCola(cola)
  return cola.length
}

export function contarPendientes(tipo) {
  const cola = leerCola()
  return tipo ? cola.filter((c) => c.tipo === tipo).length : cola.length
}

export async function sincronizarPendientes(supabase) {
  const cola = leerCola()
  if (cola.length === 0) return 0

  let sincronizados = 0
  const restantes = []

  for (let i = 0; i < cola.length; i++) {
    const item = cola[i]
    try {
      let ok = true

      if (item.tipo === 'asistencia') {
        if (item.filas?.length > 0) {
          const { error } = await supabase
            .from('asistencias')
            .upsert(item.filas, { onConflict: 'fecha,jugador_id' })
          if (error) ok = false
        }
        if (ok && item.idsSinMarcar?.length > 0) {
          const { error } = await supabase
            .from('asistencias')
            .delete()
            .eq('fecha', item.fecha)
            .in('jugador_id', item.idsSinMarcar)
          if (error) ok = false
        }
      } else if (item.tipo === 'fisico') {
        if (item.filas?.length > 0) {
          const { error } = await supabase
            .from('sesiones_fisicas')
            .upsert(item.filas, { onConflict: 'fecha,jugador_id,tipo' })
          if (error) ok = false
        }
        if (ok && item.idsSinDatos?.length > 0) {
          const { error } = await supabase
            .from('sesiones_fisicas')
            .delete()
            .eq('fecha', item.fecha)
            .eq('tipo', item.subtipo)
            .in('jugador_id', item.idsSinDatos)
          if (error) ok = false
        }
      }

      if (ok) {
        sincronizados++
      } else {
        restantes.push(item)
      }
    } catch {
      // seguimos sin conexión: dejamos este y el resto de la cola tal cual
      restantes.push(item, ...cola.slice(i + 1))
      break
    }
  }

  escribirCola(restantes)
  return sincronizados
}
