# Rediseño visual — resumen final

Rama `rediseno-club`, aplicada según `docs/REDISENO.md` con `docs/maqueta-rediseno.html` como referencia. Son 146 archivos respecto de `main` (incluye la guía, la maqueta y los tests adaptados en los pasos 1 y 2).

## Qué se cambió, por paso

**Paso 1 — Base común**
- Colores: `appearance/apariencia.css` es la única fuente (`--ui-*`, modo oscuro y su equivalente claro). `theme.js` y las paletas de `appearance/*.js` solo leen esos tokens. El amarillo es el único acento.
- Tipografía Barlow Condensed y Barlow cargada en `index.html`.
- `config/club.js` (`ESCUDO_URL`, nombre del club) reemplaza las URLs del escudo, incluidas las de los 10 generadores de PDF en `utils/generar*.js`. El escudo de fondo pasa a `Layout.jsx`.
- `utils/formatoFecha.js` (`fechaLarga`, `fechaCorta`, `fechaHora`).
- Componentes en `components/ui/`: `EncabezadoSeccion` (reescrito), `FranjaNumeros`, `Chips`, `Boton`, `EstadoVacio` y `PantallaCarga`.
- Movimiento: entrada escalonada y grilla con foco (`.club-grilla-foco` en `index.css`), con `prefers-reduced-motion` global.

**Paso 2 — Navegación**
- `Layout.jsx` y `layout.css`: barra superior fija y menú "Secciones" a pantalla completa, agrupado (Equipo, Partidos, Rendimiento, Planificación, Gestión). El filtrado por rol (`seccionesParaRol`, visibilidad, planificación, Análisis) es idéntico al de `main`.

**Paso 3 — Todas las secciones**
- Encabezado editorial, botones, chips, estados vacíos y fechas nuevas en: Asistencia, Calendario, Entrenamientos, Planificación, Físico y sus módulos, Partidos (alta, convocatoria, equipos, estadísticas), Videoanálisis, Análisis, Captación, Pases, Informes, Usuarios, Médicos, Evaluaciones, Buscador, Login, Wellness público, alta de jugadora y carga masiva.

**Paso 4 — Pantallas con diseño propio**
- Inicio (`InicioSection.jsx`, `inicio/*`): portada con cuenta regresiva, franja (posición, puntos, jugados, lesionadas) y tres bloques (Wellness con barras por métrica, Requieren atención con el semáforo real, Últimos 5).
- Plantel (`ListaJugadores.jsx`, `plantel/TarjetaJugadora.jsx`, `plantel/plantel.css`): grilla de fotos por puesto.
- Perfil (`perfil/CabeceraPerfil.jsx`, `PerfilJugador.jsx`): portada con dorsal y apellido, y franja con PJ, minutos, goles y semáforo. Se quitó lo repetido en Rendimiento.
- Partidos (`ListaPartidos.jsx`, `TarjetaPartidoPremium.jsx`): chips, franja recalculada, tabla por condición, racha y tarjetas compactas. **Eliminar** pasa a un menú "···" con confirmación en pantalla (sin `window.confirm`).
- Comparativa (`ComparativaJugadoras.jsx`): radar y barras con percentil sobre las métricas actuales.

**Ajustes posteriores**
- Semáforo de riesgo restaurado en Inicio, igual que antes de `2a21a2d`: `Promise.all` y resumen si son más de 3. También se usa en la franja del Perfil.
- Dorsal desde la última citación (`utils/dorsales.js`): una consulta para todo el plantel y una para el perfil. Sin dorsal se muestra el puesto.
- Revisión final: fechas crudas en Médicos y RPE, y el título de Inicio a 390 px.

## Lógica y datos

- No cambiaron consultas existentes, escrituras, RPC, permisos, cálculos (semáforo, ACWR, estadísticas) ni el flujo de guardado.
- Lecturas nuevas: el semáforo en Inicio (restaurado) y en el Perfil, y los dorsales desde `citaciones`, ambos pedidos explícitamente.
- Cálculos nuevos, solo de presentación: promedios por métrica de Wellness (campo `promedios` en `resumirWellnessInicio`), percentiles de la Comparativa y la franja de Partidos.

## Verificación

- `npm run build`: sin errores.
- `npx eslint src`: quedan 8 errores y 2 avisos que ya existían antes del rediseño (`AnalisisSection`, `BienestarPublico`, `ConvocarPartido`, `EvaluacionesSection`, `FisicoSection`, `InformesAutomaticosSection`, `ListaJugadores`). Por pedido, no se tocaron.
- Los 10 generadores de PDF usan `ESCUDO_URL`.

## Lo que no se pudo hacer o queda pendiente

- **Recorrido con cada rol y en el celular:** no se hizo en un navegador real, porque requiere sesiones de Supabase con cada rol. Se revisó estáticamente: filtrado de secciones igual a `main`, anchos a 390 px y movimiento reducido. Conviene recorrerlo a mano antes de mergear.
- **PDF:** se verificó el código (todos usan la constante del escudo), pero no se generaron PDF reales.
- **Tests de `tests/`:** después del Paso 2 no se corrieron ni se adaptaron (por pedido). Varios comparan textos y estructuras anteriores (títulos, tarjeta de partido, portada del perfil) y van a fallar hasta actualizarlos.
- **Comparativa:** usa las métricas existentes. Las de la maqueta (duelos, pases precisos, wellness) no se calculan hoy.
- **Código sin uso:** `CanchaPlantel.jsx`, `CargarEstadisticas.jsx` y `FormacionPartido.jsx` no se importaban en ningún lado; se borraron.
- **Colores escritos a mano que quedan a propósito:** cancha y pizarra, series de gráficos, informes imprimibles y `estadoConfig` del perfil, que también usan el PDF.
