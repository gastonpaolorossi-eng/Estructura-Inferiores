import { jsPDF } from 'jspdf'
import { supabase } from '../supabaseClient'
import { FORMACIONES } from '../data/formaciones'

const AZUL = [37, 99, 235]
const AZUL_CLARO = [99, 143, 246]
const NAVY = [26, 35, 50]
const VERDE_CANCHA = [19, 66, 48]
const GRIS = [107, 114, 128]
const GRIS_CLARO = [243, 244, 246]
const GRIS_PLACEHOLDER = [156, 163, 175]
const BLANCO = [255, 255, 255]
const NEGRO = [23, 28, 38]

const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']

function formatearFecha(fechaStr) {
  if (!fechaStr) return { diaSemana: '', fechaCorta: '' }
  const [anio, mes, dia] = fechaStr.split('-')
  const d = new Date(Number(anio), Number(mes) - 1, Number(dia))
  const diaSemana = DIAS[d.getDay()] || ''
  return { diaSemana, fechaCorta: `${dia}/${mes}` }
}

async function cargarImagenDataURL(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function formatoDeDataUrl(dataUrl) {
  const match = /^data:image\/(\w+);/.exec(dataUrl || '')
  return match ? match[1].toUpperCase() : 'PNG'
}

// Escudo cuadrado con esquinas redondeadas y una letra/sigla centrada.
function dibujarEscudo(doc, cx, cy, size, colorFondo, letra, colorTexto) {
  doc.setFillColor(...colorFondo)
  doc.roundedRect(cx - size / 2, cy - size / 2, size, size, 8, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size * 0.32)
  doc.setTextColor(...colorTexto)
  doc.text(letra, cx, cy + size * 0.11, { align: 'center' })
}

// Ficha cuadrada de un jugador: foto real si hay, si no un cuadrado de
// color con su inicial/dorsal. Siempre con un borde de color alrededor.
function dibujarFichaJugador(doc, cx, cy, size, dataUrl, colorBorde, textoFallback) {
  const half = size / 2
  let dibujoOk = false
  if (dataUrl) {
    try {
      const formato = formatoDeDataUrl(dataUrl)
      doc.addImage(dataUrl, formato, cx - half, cy - half, size, size)
      dibujoOk = true
    } catch {
      dibujoOk = false
    }
  }
  if (!dibujoOk) {
    doc.setFillColor(...colorBorde)
    doc.roundedRect(cx - half, cy - half, size, size, 4, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size * 0.38)
    doc.setTextColor(...BLANCO)
    doc.text(textoFallback, cx, cy + size * 0.13, { align: 'center' })
  }
  doc.setDrawColor(...colorBorde)
  doc.setLineWidth(1.1)
  doc.roundedRect(cx - half, cy - half, size, size, 4, 4, 'S')
}

// Etiqueta con dorsal + apellido sobre fondo de color, como la ficha de
// referencia (mini cartel debajo o al lado de la foto).
function dibujarEtiquetaJugador(doc, cxOCentro, y, ancho, dorsal, apellido, align = 'center') {
  const texto = `${dorsal ?? '–'}-${(apellido || '–').toUpperCase()}`
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  const anchoTexto = Math.min(doc.getTextWidth(texto) + 10, ancho)
  const x = align === 'center' ? cxOCentro - anchoTexto / 2 : cxOCentro
  doc.setFillColor(...AZUL)
  doc.roundedRect(x, y, anchoTexto, 12, 3, 3, 'F')
  doc.setTextColor(...BLANCO)
  doc.text(texto.slice(0, 20), x + anchoTexto / 2, y + 8.5, { align: 'center', maxWidth: anchoTexto - 4 })
  return anchoTexto
}

export async function generarCitacionPDF(partidoId) {
  const { data: partido } = await supabase
    .from('partidos')
    .select('*, categorias(nombre)')
    .eq('id', partidoId)
    .single()

  const { data: citaciones } = await supabase
    .from('citaciones')
    .select('*, jugadores(nombre, apellido, foto_url)')
    .eq('partido_id', partidoId)

  if (!partido || !citaciones || citaciones.length === 0) {
    alert('Todavía no hay convocatoria cargada para este partido.')
    return
  }

  const escudoRivalDataUrl = partido.escudo_url ? await cargarImagenDataURL(partido.escudo_url) : null

  // Traemos todas las fotos de los convocados de una sola vez.
  const fotosPorJugador = {}
  await Promise.all(
    citaciones.map(async (c) => {
      if (c.jugadores?.foto_url) {
        fotosPorJugador[c.jugador_id] = await cargarImagenDataURL(c.jugadores.foto_url)
      }
    })
  )

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40

  const categoriaNombre = partido.categorias?.nombre || ''
  const nombreLocalVisitante = partido.local_visitante === 'visitante' ? 'de visitante' : 'de local'

  // ===== Encabezado azul =====
  const headerH = 108
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, pageWidth, headerH, 'F')

  const iconoSize = 46
  const iconoCX = margin + iconoSize / 2
  const iconoCY = 40
  doc.setFillColor(...AZUL_CLARO)
  doc.roundedRect(iconoCX - iconoSize / 2, iconoCY - iconoSize / 2, iconoSize, iconoSize, 10, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...BLANCO)
  doc.text('CIT', iconoCX, iconoCY + 4, { align: 'center' })

  const tituloX = margin + iconoSize + 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.setTextColor(...BLANCO)
  doc.text('CITACIÓN', tituloX, iconoCY - 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(214, 224, 250)
  const subtituloHeader = categoriaNombre
    ? `Partido ${nombreLocalVisitante} · Categoría ${categoriaNombre}`
    : `Partido ${nombreLocalVisitante}`
  doc.text(subtituloHeader, tituloX, iconoCY + 16)

  if (partido.resultado) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const wTxt = doc.getTextWidth(partido.resultado)
    const wPill = wTxt + 26
    const pillH = 26
    doc.setFillColor(...BLANCO)
    doc.roundedRect(pageWidth - margin - wPill, iconoCY - pillH / 2, wPill, pillH, 13, 13, 'F')
    doc.setTextColor(...AZUL)
    doc.text(partido.resultado, pageWidth - margin - wPill / 2, iconoCY + 4, { align: 'center' })
  } else if (categoriaNombre || partido.formacion) {
    const etiqueta = [categoriaNombre.toUpperCase(), partido.formacion].filter(Boolean).join(' · ')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    const wTxt = doc.getTextWidth(etiqueta)
    const wPill = wTxt + 26
    const pillH = 26
    doc.setFillColor(...AZUL_CLARO)
    doc.roundedRect(pageWidth - margin - wPill, iconoCY - pillH / 2, wPill, pillH, 13, 13, 'F')
    doc.setTextColor(...BLANCO)
    doc.text(etiqueta, pageWidth - margin - wPill / 2, iconoCY + 4, { align: 'center' })
  }

  // ===== Fila de equipos: escudo propio · VS · escudo rival =====
  const filaEquiposY = headerH + 48
  const shieldSize = 40

  const propioShieldCX = margin + shieldSize / 2
  dibujarEscudo(doc, propioShieldCX, filaEquiposY, shieldSize, NAVY, 'EI', BLANCO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NEGRO)
  const nombrePropio = categoriaNombre
    ? `Estructura Inferiores ${categoriaNombre} División`
    : 'Estructura Inferiores'
  doc.text(nombrePropio, propioShieldCX + shieldSize / 2 + 12, filaEquiposY + 4, {
    maxWidth: 210,
  })

  const rivalShieldCX = pageWidth - margin - shieldSize / 2
  if (escudoRivalDataUrl) {
    try {
      const formato = formatoDeDataUrl(escudoRivalDataUrl)
      doc.addImage(
        escudoRivalDataUrl,
        formato,
        rivalShieldCX - shieldSize / 2,
        filaEquiposY - shieldSize / 2,
        shieldSize,
        shieldSize
      )
    } catch {
      dibujarEscudo(doc, rivalShieldCX, filaEquiposY, shieldSize, GRIS_PLACEHOLDER, (partido.rival?.[0] || '?').toUpperCase(), BLANCO)
    }
  } else {
    dibujarEscudo(doc, rivalShieldCX, filaEquiposY, shieldSize, GRIS_PLACEHOLDER, (partido.rival?.[0] || '?').toUpperCase(), BLANCO)
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...NEGRO)
  doc.text(partido.rival || 'Rival', rivalShieldCX - shieldSize / 2 - 12, filaEquiposY + 4, {
    align: 'right',
    maxWidth: 210,
  })

  const vsCX = pageWidth / 2
  doc.setFillColor(...NEGRO)
  doc.circle(vsCX, filaEquiposY, 18, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...BLANCO)
  doc.text('VS', vsCX, filaEquiposY + 4, { align: 'center' })

  // ===== Ficha del partido: división, fecha, hora, lugar, sistema, resultado =====
  const { diaSemana, fechaCorta } = formatearFecha(partido.fecha)
  const franjaY = filaEquiposY + 42
  const franjaH = 44
  const filaGapMeta = 8
  const gap = 12
  const franjaW = (pageWidth - margin * 2 - gap * 2) / 3
  const filaMetadatos = [
    [
      { label: 'DIVISIÓN', valor: categoriaNombre || '—' },
      { label: 'FECHA', valor: fechaCorta ? `${diaSemana.slice(0, 1)}${diaSemana.slice(1).toLowerCase()} ${fechaCorta}` : '—' },
      { label: 'HORA', valor: partido.hora ? `${partido.hora} hs` : '—' },
    ],
    [
      { label: 'LUGAR', valor: `${partido.lugar || '—'} · ${nombreLocalVisitante}` },
      { label: 'SISTEMA', valor: partido.formacion || '—' },
      { label: 'RESULTADO', valor: partido.resultado || 'A jugarse' },
    ],
  ]
  filaMetadatos.forEach((fila, filaIdx) => {
    const y = franjaY + filaIdx * (franjaH + filaGapMeta)
    fila.forEach((d, i) => {
      const bx = margin + i * (franjaW + gap)
      const esResultado = d.label === 'RESULTADO' && partido.resultado
      doc.setFillColor(...(esResultado ? AZUL : GRIS_CLARO))
      doc.roundedRect(bx, y, franjaW, franjaH, 8, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...(esResultado ? BLANCO : AZUL))
      doc.text(d.label, bx + 12, y + 16)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...(esResultado ? BLANCO : NEGRO))
      doc.text(String(d.valor), bx + 12, y + 33, { maxWidth: franjaW - 22 })
    })
  })

  // ===== Dos columnas: cancha (izq) + titulares (der) =====
  const ordenados = [...citaciones].sort((a, b) => (a.dorsal || 99) - (b.dorsal || 99))
  const suplentes = ordenados.filter((c) => !c.titular)
  const slots = FORMACIONES[partido.formacion] || []

  const contenidoY = franjaY + (franjaH + filaGapMeta) * 2 + 22
  const canchaX = margin
  const canchaW = 190
  const titularesX = canchaX + canchaW + 24
  const titularesW = pageWidth - margin - titularesX

  const filaAltura = 32
  const filaGap = 5
  const canchaH = canchaW * 1.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...AZUL)
  doc.text('TITULARES', titularesX, contenidoY)

  // --- Cancha ---
  doc.setFillColor(...VERDE_CANCHA)
  doc.roundedRect(canchaX, contenidoY + 6, canchaW, canchaH, 10, 10, 'F')
  doc.setDrawColor(...BLANCO)
  doc.setLineWidth(0.7)
  doc.roundedRect(canchaX + 8, contenidoY + 14, canchaW - 16, canchaH - 16, 4, 4)
  doc.line(canchaX + 8, contenidoY + 6 + canchaH / 2, canchaX + canchaW - 8, contenidoY + 6 + canchaH / 2)
  doc.circle(canchaX + canchaW / 2, contenidoY + 6 + canchaH / 2, canchaW * 0.14)
  doc.setFillColor(...BLANCO)
  doc.circle(canchaX + canchaW / 2, contenidoY + 6 + canchaH / 2, 1.4, 'F')

  const fotoCanchaSize = 24
  slots.forEach((slot) => {
    const citacion = citaciones.find(
      (c) => String(c.posicion_cancha) === String(slot.codigo) && c.titular
    )
    const px = canchaX + (slot.x / 100) * canchaW
    const py = contenidoY + 6 + (slot.y / 100) * canchaH

    const dorsalTxt = citacion?.dorsal ? String(citacion.dorsal) : '–'
    dibujarFichaJugador(
      doc,
      px,
      py,
      fotoCanchaSize,
      citacion ? fotosPorJugador[citacion.jugador_id] : null,
      AZUL,
      dorsalTxt
    )

    const apellido = citacion?.jugadores?.apellido || ''
    dibujarEtiquetaJugador(doc, px, py + fotoCanchaSize / 2 + 3, 70, citacion?.dorsal, apellido)
  })

  // --- Lista de titulares ---
  const fotoListaSize = 22
  let yFila = contenidoY + 36
  slots.forEach((slot) => {
    const citacion = citaciones.find(
      (c) => String(c.posicion_cancha) === String(slot.codigo) && c.titular
    )

    doc.setFillColor(...GRIS_CLARO)
    doc.roundedRect(titularesX, yFila - filaAltura + 8, titularesW, filaAltura, 8, 8, 'F')

    const badgeCX = titularesX + 18
    const badgeCY = yFila - filaAltura / 2 + 8
    dibujarFichaJugador(
      doc,
      badgeCX,
      badgeCY,
      fotoListaSize,
      citacion ? fotosPorJugador[citacion.jugador_id] : null,
      AZUL,
      citacion?.dorsal ? String(citacion.dorsal) : '–'
    )

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(...NEGRO)
    const nombreJugador = citacion
      ? `${citacion.jugadores?.apellido || ''}, ${citacion.jugadores?.nombre || ''}`
      : '–'
    doc.text(nombreJugador, badgeCX + 22, badgeCY + 4, { maxWidth: titularesW * 0.5 })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    doc.text(slot.label.toUpperCase(), titularesX + titularesW - 12, badgeCY + 3, { align: 'right' })

    yFila += filaAltura + filaGap
  })

  // ===== Suplentes =====
  const suplentesY = Math.max(contenidoY + 6 + canchaH, yFila - filaGap) + 34
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...AZUL)
  doc.text('SUPLENTES', margin, suplentesY)

  if (suplentes.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text('Sin suplentes cargados', margin, suplentesY + 20)
  } else {
    const columnas = 4
    const supGap = 12
    const supW = (pageWidth - margin * 2 - supGap * (columnas - 1)) / columnas
    const supFotoSize = 30
    const supCardH = supFotoSize + 26

    suplentes.forEach((c, i) => {
      const col = i % columnas
      const fila = Math.floor(i / columnas)
      const bx = margin + col * (supW + supGap)
      const by = suplentesY + 14 + fila * (supCardH + 10)
      const cx = bx + supW / 2

      dibujarFichaJugador(
        doc,
        cx,
        by + supFotoSize / 2,
        supFotoSize,
        fotosPorJugador[c.jugador_id],
        AZUL_CLARO,
        c.dorsal ? String(c.dorsal) : '–'
      )
      dibujarEtiquetaJugador(doc, cx, by + supFotoSize + 5, supW, c.dorsal, c.jugadores?.apellido)
    })
  }

  doc.save(`Citacion_vs_${partido.rival.replace(/\s+/g, '_')}.pdf`)
}
