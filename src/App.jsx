import { useState } from 'react'
import Layout from './components/Layout'
import PlantelSection from './components/PlantelSection'
import MedicosSection from './components/MedicosSection'
import VideoSection from './components/VideoSection'
import PartidosSection from './components/PartidosSection'

function App() {
  const [seccion, setSeccion] = useState('plantel')
  const [jugadorParaMedicos, setJugadorParaMedicos] = useState(null)

  function irAMedicosDesdePerfil(jugadorId) {
    setJugadorParaMedicos(jugadorId)
    setSeccion('medicos')
  }

  return (
    <Layout seccionActiva={seccion} onCambiarSeccion={setSeccion}>
      {seccion === 'plantel' && (
        <PlantelSection onVerFichaMedica={irAMedicosDesdePerfil} />
      )}
      {seccion === 'medicos' && (
        <MedicosSection
          jugadorInicialId={jugadorParaMedicos}
          onConsumirJugadorInicial={() => setJugadorParaMedicos(null)}
        />
      )}
      {seccion === 'video' && <VideoSection />}
      {seccion === 'partidos' && <PartidosSection />}
    </Layout>
  )
}

export default App