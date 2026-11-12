import { useSyncExternalStore } from 'react'

// Tiempo del reproductor fuera del estado de Análisis: al avanzar el video
// solo se vuelve a dibujar lo que lo muestra, no la sección completa.
export function crearRelojVideo() {
  let segundos = 0
  const oyentes = new Set()
  return {
    leer: () => segundos,
    fijar(valor) {
      const nuevo = Math.max(0, Math.floor(Number(valor) || 0))
      if (nuevo === segundos) return
      segundos = nuevo
      oyentes.forEach((avisar) => avisar())
    },
    suscribir(avisar) {
      oyentes.add(avisar)
      return () => oyentes.delete(avisar)
    },
  }
}

export function useTiempoVideo(reloj) {
  return useSyncExternalStore(reloj.suscribir, reloj.leer, reloj.leer)
}
