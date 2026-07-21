import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { FORMACIONES } from '../data/formaciones'

const UMBRAL_ARRASTRE = 4

function FormacionPartido({ partidoId, onVolver, onGuardado }) {
  const [partido, setPartido] = useState(null)
  const [citaciones, setCitaciones] = useState([])
  const [formacion, setFormacion] = useState('4-4-2')
  const [asignaciones, setAsignaciones] = useState({})
  const [posicionesCustom, setPosicionesCustom] = useState({})
  const [historial, setHistorial] = useState([])
  const [slotActivo, setSlotActivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const canchaRef = useRef(null)
  const arrastreRef = useRef({ codigo: null, moved: false, startX: 0, startY: 0 })

  useEffect(() => {
    async function cargarDatos() {
      const { data: partidoData } = await supabase
        .from('partidos')
        .select('*')
        .eq('id', partidoId)
        .single()
      setPartido(partidoData)
      if (partidoData?.formacion) setFormacion(partidoData.formacion)

      const { data: citacionesData } = await supabase
        .from('citaciones')
        .select('*, jugadores(nombre, apellido)')
        .eq('partido_id', partidoId)
      setCitaciones(citacionesData || [])

      const asign = {}
      const posCustom = {}
      ;(citacionesData || []).forEach((c) => {
        if (c.titular && c.posicion_cancha) {
          asign[c.posicion_cancha] = c.jugador_id
          if (c.pos_x !== null && c.pos_x !== undefined && c.pos_y !== null && c.pos_y !== undefined) {
            posCustom[c.posicion_cancha] = { x: c.pos_x, y: c.pos_y }
          }
        }
      })
      setAsignaciones(asign)
      setPosicionesCustom(posCustom)
      setHistorial([])
    }
    cargarDatos()
  }, [partidoId])

  useEffect(() => {
    function moverPuntero(e) {
      const info = arrastreRef.current
      if (!info.codigo || !canchaRef.current) return
      const dx = Math.abs(e.clientX - info.startX)
      const dy = Math.abs(e.clientY - info.startY)
      if (dx > UMBRAL_ARRASTRE || dy > UMBRAL_ARRASTRE) info.moved = true
      if (!info.moved) return

      const rect = canchaRef.current.getBoundingClientRect()
      let x = ((e.clientX - rect.left) / rect.width) * 100
      let y = ((e.clientY - rect.top) / rect.height) * 100
      x = Math.min(96, Math.max(4, x))
      y = Math.min(96, Math.max(4, y))
      setPosicionesCustom((prev) => ({ ...prev, [info.codigo]: { x, y } }))
    }

    function soltarPuntero() {
      const info = arrastreRef.current
      if (info.codigo && !info.moved) {
        setSlotActivo(info.codigo)
      }
      if (info.codigo && info.moved) {
        setHistorial((h) => [...h, info.snapshot])
      }
      arrastreRef.current = { codigo: null, moved: false, startX: 0, startY: 0 }
    }

    window.addEventListener('pointermove', moverPuntero)
    window.addEventListener('pointerup', soltarPuntero)
    return () => {
      window.removeEventListener('pointermove', moverPuntero)
      window.removeEventListener('pointerup', soltarPuntero)
    }
  }, [])

  function deshacer() {
    setHistorial((prev) => {
      if (prev.length === 0) return prev
      const copia = [...prev]
      const anterior = copia.pop()
      setPosicionesCustom(anterior)
      return copia
    })
  }

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        deshacer()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function iniciarArrastre(e, codigo) {
    e.preventDefault()
    arrastreRef.current = { codigo, moved: false, startX: e.clientX, startY: e.clientY, snapshot: posicionesCustom }
  }

  function cambiarFormacion(nueva) {
    setFormacion(nueva)
    setAsignaciones({})
    setPosicionesCustom({})
    setHistorial([])
    setSlotActivo(null)
  }

  function restablecerPosiciones() {
    setHistorial((h) => [...h, posicionesCustom])
    setPosicionesCustom({})
  }

  function asignarJugador(codigo, jugadorId) {
    setAsignaciones((prev) => {
      const copia = { ...prev }
      Object.keys(copia).forEach((c) => {
        if (copia[c] === jugadorId) delete copia[c]
      })
      copia[codigo] = jugadorId
      return copia
    })
    setSlotActivo(null)
  }

  function quitarDeSlot(codigo) {
    setAsignaciones((prev) => {
      const copia = { ...prev }
      delete copia[codigo]
      return copia
    })
  }

  async function handleGuardar() {
    setGuardando(true)

    await supabase.from('partidos').update({ formacion }).eq('id', partidoId)

    for (const c of citaciones) {
      const codigoAsignado = Object.keys(asignaciones).find(
        (cod) => asignaciones[cod] === c.jugador_id
      )
      const slotPorDefecto = slots.find((s) => s.codigo === codigoAsignado)
      const pos = codigoAsignado ? posicionesCustom[codigoAsignado] || slotPorDefecto : null
      await supabase
        .from('citaciones')
        .update({
          titular: !!codigoAsignado,
          posicion_cancha: codigoAsignado || null,
          pos_x: pos?.x ?? null,
          pos_y: pos?.y ?? null,
        })
        .eq('id', c.id)
    }

    setGuardando(false)
    setGuardado(true)
    setTimeout(() => {
      setGuardado(false)
      onGuardado()
    }, 1200)
  }

  if (!partido) {
    return (
      <div className="p-6 md:p-10">
        <p style={{ color: '#5B6B85' }}>Cargando...</p>
      </div>
    )
  }

  const slots = FORMACIONES[formacion] || []
  const idsAsignados = Object.values(asignaciones)
  const convocadosOrdenados = [...citaciones].sort((a, b) => (a.dorsal || 99) - (b.dorsal || 99))

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onVolver}
          className="text-sm mb-6 flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: '#8A9BB8' }}
        >
          ← Volver
        </button>

        <h1
          className="text-2xl md:text-3xl mb-1 flex items-center gap-2.5"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: '#F0F2F5' }}
        >
          {partido.escudo_url ? (
            <img
              src={partido.escudo_url}
              alt={partido.rival}
              className="w-8 h-8 rounded object-contain shrink-0"
              style={{ backgroundColor: '#0F1419' }}
            />
          ) : (
            <span
              className="w-8 h-8 rounded flex items-center justify-center text-sm shrink-0"
              style={{ backgroundColor: '#0F1419', color: '#5B6B85' }}
            >
              🛡️
            </span>
          )}
          Formación — vs {partido.rival}
        </h1>
        <p className="text-sm mb-6" style={{ color: '#8A9BB8' }}>
          {partido.fecha} {partido.hora && `· ${partido.hora}`}
        </p>

        <div className="mb-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs uppercase tracking-wide block mb-1.5" style={{ color: '#5B6B85' }}>
              Formación
            </label>
            <select
              value={formacion}
              onChange={(e) => cambiarFormacion(e.target.value)}
              className="p-2.5 rounded-xl outline-none text-sm"
              style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548', color: '#F0F2F5' }}
            >
              {Object.keys(FORMACIONES).map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={deshacer}
            disabled={historial.length === 0}
            title="Deshacer (Ctrl/Cmd+Z)"
            className="text-xs px-3 py-2.5 rounded-xl hover:opacity-80 disabled:opacity-30"
            style={{ backgroundColor: '#1A2332', color: '#8A9BB8', border: '1px solid #2A3548' }}
          >
            ↶ Deshacer
          </button>
          {Object.keys(posicionesCustom).length > 0 && (
            <button
              type="button"
              onClick={restablecerPosiciones}
              className="text-xs px-3 py-2.5 rounded-xl hover:opacity-80"
              style={{ backgroundColor: '#1A2332', color: '#8A9BB8', border: '1px solid #2A3548' }}
            >
              ↺ Restablecer posiciones
            </button>
          )}
        </div>
        <p className="text-xs mb-4" style={{ color: '#5B6B85' }}>
          Arrastrá las fichas en la cancha para ubicarlas donde quieras. Ctrl/Cmd+Z para deshacer.
        </p>

        <div className="grid md:grid-cols-[1fr_260px] gap-6 mb-6">
          {/* Cancha */}
          <div
            ref={canchaRef}
            className="relative mx-auto w-full rounded-2xl overflow-hidden"
            style={{
              maxWidth: 380,
              aspectRatio: '68 / 100',
              backgroundColor: '#183A2A',
              border: '1px solid #2A3548',
              touchAction: 'none',
            }}
          >
            <div
              className="absolute left-0 right-0"
              style={{ top: '50%', borderTop: '1px solid rgba(240,242,245,0.15)' }}
            />
            <div
              className="absolute rounded-full"
              style={{
                width: '22%',
                aspectRatio: '1 / 1',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                border: '1px solid rgba(240,242,245,0.15)',
              }}
            />
            <div
              className="absolute"
              style={{
                width: '44%',
                height: '9%',
                bottom: 0,
                left: '28%',
                border: '1px solid rgba(240,242,245,0.15)',
                borderBottom: 'none',
              }}
            />

            {slots.map((slot) => {
              const jugadorId = asignaciones[slot.codigo]
              const citacion = citaciones.find((c) => c.jugador_id === jugadorId)
              const pos = posicionesCustom[slot.codigo] || slot

              return (
                <div
                  key={slot.codigo}
                  onPointerDown={(e) => iniciarArrastre(e, slot.codigo)}
                  className="absolute flex flex-col items-center select-none"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    touchAction: 'none',
                    cursor: 'grab',
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      width: 34,
                      height: 34,
                      backgroundColor: citacion ? '#4ADE80' : '#0F1419',
                      color: citacion ? '#0F1419' : '#5B6B85',
                      border: `2px solid ${citacion ? '#4ADE80' : '#2A3548'}`,
                      fontFamily: "'Archivo Black', sans-serif",
                    }}
                  >
                    {citacion?.dorsal ?? '·'}
                  </div>
                  <p
                    className="text-[9px] mt-1 px-1 rounded text-center whitespace-nowrap"
                    style={{ backgroundColor: 'rgba(15,20,25,0.7)', color: '#F0F2F5', maxWidth: 76 }}
                  >
                    {citacion ? citacion.jugadores?.apellido : slot.label}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Listado de convocados */}
          <div>
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#5B6B85' }}>
              Convocados ({citaciones.length})
            </p>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {convocadosOrdenados.map((c, i) => {
                const enCancha = idsAsignados.includes(c.jugador_id)
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 p-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: '#1A2332',
                      border: `1px solid ${enCancha ? '#4ADE80' : '#2A3548'}`,
                    }}
                  >
                    <span
                      className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: enCancha ? '#4ADE80' : '#0F1419',
                        color: enCancha ? '#0F1419' : '#8A9BB8',
                      }}
                    >
                      {c.dorsal ?? i + 1}
                    </span>
                    <span style={{ color: '#F0F2F5' }} className="truncate">
                      {c.jugadores?.apellido}, {c.jugadores?.nombre}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Selector de jugador para el slot activo */}
        {slotActivo !== null && (
          <div
            className="p-4 rounded-xl mb-6"
            style={{ backgroundColor: '#1A2332', border: '1px solid #2A3548' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium" style={{ color: '#F0F2F5' }}>
                Elegí jugador para: {slots.find((s) => s.codigo === slotActivo)?.label}
              </p>
              <button
                onClick={() => setSlotActivo(null)}
                className="text-xs"
                style={{ color: '#8A9BB8' }}
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {asignaciones[slotActivo] && (
                <button
                  onClick={() => quitarDeSlot(slotActivo)}
                  className="w-full text-left p-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0F1419', color: '#F87171' }}
                >
                  Quitar del puesto
                </button>
              )}
              {citaciones.map((c) => (
                <button
                  key={c.id}
                  onClick={() => asignarJugador(slotActivo, c.jugador_id)}
                  className="w-full text-left p-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: idsAsignados.includes(c.jugador_id) ? '#0F1419' : '#1A2332',
                    color: idsAsignados.includes(c.jugador_id) ? '#5B6B85' : '#F0F2F5',
                  }}
                >
                  {c.jugadores?.apellido}, {c.jugadores?.nombre}
                  {c.dorsal ? ` (#${c.dorsal})` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="w-full p-3 rounded-xl font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: '#4ADE80', color: '#0F1419' }}
        >
          {guardando ? 'Guardando...' : guardado ? '✅ Guardado' : 'Guardar formación'}
        </button>
      </div>
    </div>
  )
}

export default FormacionPartido