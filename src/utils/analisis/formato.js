// Formatos compartidos por las pestañas de Análisis.

export function youtubeEmbed(url) {
  if (!url) return ''

  try {
    const parsed = new URL(url)
    let id = ''

    if (parsed.hostname.includes('youtu.be')) {
      id = parsed.pathname.split('/').filter(Boolean)[0] || ''
    } else if (
      parsed.hostname.includes('youtube.com') ||
      parsed.hostname.includes('youtube-nocookie.com')
    ) {
      if (parsed.pathname === '/watch') {
        id = parsed.searchParams.get('v') || ''
      } else {
        const parts = parsed.pathname.split('/').filter(Boolean)
        if (['embed', 'shorts', 'live'].includes(parts[0])) {
          id = parts[1] || ''
        }
      }
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return ''

    const origen = typeof window !== 'undefined'
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : ''

    return `https://www.youtube.com/embed/${id}?enablejsapi=1${origen}`
  } catch {
    return ''
  }
}

export function formatearTiempo(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function fechaLegible(fecha) {
  if (!fecha) return 'Fecha sin definir'
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

export function datosEncuentro(partido) {
  if (!partido) return ''
  const calendario = partido.partido_calendario || null

  return [
    fechaLegible(calendario?.fecha || partido.fecha),
    calendario?.local_visitante
      ? calendario.local_visitante.charAt(0).toUpperCase() +
        calendario.local_visitante.slice(1)
      : '',
    calendario?.numero_fecha || '',
  ].filter(Boolean).join(' · ')
}

export function videoCalendario(partido) {
  if (!partido) return ''

  return partido.video_partido_completo ||
    partido.video_analisis_propio ||
    partido.video_resumen ||
    partido.video_analisis_rival ||
    partido.link ||
    ''
}

export function nombreJugadora(jugadora) {
  if (!jugadora) return 'Sin jugadora asignada'
  return `${jugadora.nombre || ''} ${jugadora.apellido || ''}`.trim() || 'Sin nombre'
}
