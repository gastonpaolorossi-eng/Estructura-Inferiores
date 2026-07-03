import { useState } from 'react'
import Layout from './components/Layout'
import PlantelSection from './components/PlantelSection'
import MedicosSection from './components/MedicosSection'
import VideoSection from './components/VideoSection'
import PartidosSection from './components/PartidosSection'

function App() {
  const [seccion, setSeccion] = useState('plantel')
  const [jugadorParaMedicos, setJugadorParaMedicos] = useState(null)
  const [jugadorParaVideo, setJugadorParaVideo] = useState(null)

  function irAMedicosDesdePerfil(jugadorId) {
    setJugadorParaMedicos(jugadorId)
    setSeccion('medicos')
  }

  function irAVideoDesdePerfil(jugadorId) {
    setJugadorParaVideo(jugadorId)
    setSeccion('video')
  }

  return (
    <Layout seccionActiva={seccion} onCambiarSeccion={setSeccion}>
      {seccion === 'plantel' && (
        <PlantelSection
          onVerFichaMedica={irAMedicosDesdePerfil}
          onVerVideos={irAVideoDesdePerfil}
        />
      )}
      {seccion === 'medicos' && (
        <MedicosSection
          jugadorInicialId={jugadorParaMedicos}
          onConsumirJugadorInicial={() => setJugadorParaMedicos(null)}
        />
      )}
      {seccion === 'video' && (
        <VideoSection
          jugadorInicialId={jugadorParaVideo}
          onConsumirJugadorInicial={() => setJugadorParaVideo(null)}
        />
      )}
      {seccion === 'partidos' && <PartidosSection />}
    </Layout>
  )
}

export default App