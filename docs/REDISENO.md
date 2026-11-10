# Rediseño visual completo — Club Comunicaciones

Este documento es la guía para rediseñar **toda la app de una sola vez**. La referencia visual es `docs/maqueta-rediseno.html`: abrila en el navegador antes de empezar y respetá su estilo (tipografía, colores, encabezados, franjas de números, tarjetas y transiciones).

## Reglas (obligatorias)

1. **Solo cambia la presentación.** No modifiques consultas a Supabase, permisos, roles, nombres de tablas o columnas, cálculos (semáforo, ACWR, estadísticas) ni el flujo de guardado. Si un cambio visual exige tocar lógica, frená y preguntá.
2. Trabajá en la rama **`rediseno-club`** (creada desde `main`). No toques `main`.
3. Hacé **un commit por paso** de la lista de abajo, con un mensaje claro en español.
4. Después de cada paso corré `npm run build` y `npx eslint src`. Si fallan, arreglalo antes de seguir.
5. Respetá `prefers-reduced-motion`: todas las animaciones se desactivan si el usuario lo pide.
6. Todo tiene que funcionar en el celular (ancho ~390 px) sin scroll horizontal.
7. No uses `window.confirm` ni `window.prompt` en lo que crees nuevo; usá una confirmación dentro de la pantalla.
8. Escribí todo en español (Argentina).

---

## Paso 1 — Base común (se aplica a toda la app)

### 1.1 Colores
Unificá los dos sistemas de color: `appearance/apariencia.css` (variables `--ui-*`) es la fuente única y `theme.js` (`COLORES`) solo lee esas variables. Modo oscuro:

| Uso | Valor |
|---|---|
| Fondo de página | `#0b0b0a` |
| Panel / tarjeta | `#141412` |
| Panel secundario | `#1c1c19` |
| Bordes y divisores | `#2a2a25` |
| Texto | `#f3f1e8` |
| Texto secundario | `#9a978a` |
| Texto apagado | `#5f5d54` |
| Acento (amarillo club) | `#f4c400` |
| Texto sobre acento | `#141200` |
| Victoria / OK | `#3ecf6e` |
| Empate / alerta | `#e8b84a` |
| Derrota / peligro | `#ef4a4a` |

- El **amarillo es el único color de acento**. Todos los botones principales son amarillos (hoy hay verdes: "Guardar convocados", "Guardar destacados", "Descargar PDF", etc.). Verde, amarillo-alerta y rojo se usan **solo** para resultados y el semáforo.
- La alerta azul de Físico ("datos insuficientes") pasa a la paleta (borde amarillo-alerta).
- El modo claro se mantiene, con equivalentes claros de estos mismos tokens.
- Reemplazá los colores hex escritos a mano en los componentes por los tokens (el INFORME.md lista los archivos con más hex sueltos; `AnalisisSection.jsx` es el más grande).

### 1.2 Tipografía
- Cargá de Google Fonts en `index.html`: **Barlow Condensed** (pesos 500, 600, 700, 800 itálica, 900 itálica) y **Barlow** (400, 500, 600).
- **Títulos de sección y números grandes:** Barlow Condensed 900 itálica, en mayúsculas.
- **Subtítulos, etiquetas, chips y botones:** Barlow Condensed 600-700, mayúsculas, con `letter-spacing` de 0.12-0.2em.
- **Texto común:** Barlow.
- Números en tablas y franjas con `font-variant-numeric: tabular-nums`.

### 1.3 Escudo del club
- Creá `src/config/club.js` con una constante única `ESCUDO_URL` (la URL actual de `Biblioteca/escudos/Escudo simplificado.png`) y el nombre del club. Reemplazá las **10 URLs del escudo escritas a mano** por esa constante (incluidos los generadores de PDF).
- **Escudo de fondo en todas las secciones:** en `Layout.jsx`, detrás del contenido, un escudo grande fijo (`position: fixed`, ~60vw de ancho, a la derecha y centrado verticalmente, `opacity` ~0.04, `pointer-events: none`, sin afectar el scroll). Sacá el escudo de fondo que hoy tiene solo Inicio para que no quede duplicado.

### 1.4 Ancho y espaciado
- El contenido usa todo el ancho disponible, con un máximo de ~1440 px y márgenes laterales de al menos 16 px. Hoy muchas pantallas (Evaluaciones, Captación, Planificación, Físico, Médicos) quedan en una columna angosta.

### 1.5 Fechas
- Creá `src/utils/formatoFecha.js` con:
  - `fechaLarga(d)` → `JUE 29 OCT 2026`
  - `fechaCorta(d)` → `29 oct`
  - `fechaHora(d, hora)` → `Dom 31 may · 15:15`
- Reemplazá en la interfaz todas las fechas que hoy se muestran como `2026-09-18` o `2026-05-31 · 15:15:00`. **No cambies** cómo se guardan ni cómo se consultan las fechas.

### 1.6 Componentes base (en `src/components/ui/`)
Reutilizá o reescribí los que ya existen (`EncabezadoSeccion`, `TarjetaIndicador`, `BarraFiltros`, `EstadoContenido`, `PestanasAccesibles`):

- **`EncabezadoSeccion`**: `eyebrow` (línea chica arriba, con una parte resaltada en amarillo), `titulo` (enorme, itálica, mayúsculas; acepta una parte en amarillo), `acciones` (botones a la derecha) e `imagenFondo` opcional (foto oscurecida con degradado, para usar en Plantel, Inicio y Videoanálisis con las fotos que ya están cargadas).
- **`FranjaNumeros`**: 3 o 4 números grandes con su etiqueta, separados por líneas finas, con animación de conteo al entrar. En el celular pasa a 2 columnas.
- **`Chips`**: filtros tipo chip (el seleccionado en blanco sobre negro).
- **`Boton`**: variantes `principal` (amarillo), `secundario` (borde) y `peligro` (rojo, solo para borrar).
- **`EstadoVacio`**: mensaje corto + acción sugerida, para reemplazar los "Sin datos", "Cargando…" y los ceros que se ven en Captación, Informes automáticos, Semáforo, etc.

### 1.7 Movimiento
- **Pantalla de carga** con el escudo (pulso suave + barra amarilla) mientras se verifica la sesión al abrir la app.
- **Entrada de cada sección:** los bloques aparecen escalonados (subir 20 px + aparecer, 70 ms entre bloques).
- **Grillas con foto o tarjetas** (Plantel, Partidos, Videoanálisis, Captación, Equipos): al pasar el mouse por una, **las demás se apagan** (`grayscale + brightness .35`) y la elegida sube 4 px, con una línea amarilla abajo.
- Transiciones de 0.3 a 0.6 s con `cubic-bezier(.2,.8,.2,1)`.

---

## Paso 2 — Navegación: menú "Secciones"

- Reemplazá la barra lateral por una **barra superior fija** (botón amarillo "SECCIONES", ubicación actual "Comunicaciones · Plantel", buscador, link de wellness, usuario y apariencia).
- El botón abre un **menú a pantalla completa** (se abre en círculo desde el botón; los ítems entran escalonados; al pasar por uno, los demás se apagan), con las secciones **agrupadas**:
  - **Equipo:** Inicio, Plantel, Asistencia, Evaluaciones
  - **Partidos:** Partidos, Videoanálisis, Análisis
  - **Rendimiento:** Físico, Médicos
  - **Planificación:** Calendario, Entrenamientos, Planificación semanal
  - **Gestión:** Captación, Pases, Informes automáticos, Usuarios
- **Mantené exactamente el filtrado por rol** de `seccionesParaRol()`, `visibilidadSecciones.js`, `puedePlanificar()` y los permisos de Análisis. Si un grupo queda vacío para un rol, no se muestra.
- Cerrar con Esc, con la X o al elegir una sección. En el celular funciona igual.

---

## Paso 3 — Aplicar la base a TODAS las secciones

Cada `*Section.jsx` usa `EncabezadoSeccion` + `FranjaNumeros` (cuando tenga sentido) + los colores, botones, chips, fechas y estados vacíos nuevos. Lista completa:

Inicio, Plantel (ListaJugadores, PerfilJugador, AgregarJugador, CargaMasiva), Médicos, Videoanálisis (VideoSection, EstadisticasEquipo), Análisis, Partidos (ListaPartidos, AgregarPartido, ConvocarPartido, EquiposSection, ComparativaJugadoras), Calendario, Entrenamientos, Planificación semanal, Asistencia, Físico (y todos sus módulos: Wellness, RPE, Carga, CMJ, Semáforo, Ciclo), Captación, Pases, Informes automáticos, Usuarios, Evaluaciones, Buscador global, Login y el formulario público de Wellness (`BienestarPublico.jsx`).

**Recortá los textos explicativos largos** a una línea. Ejemplo: en Inicio, "Jugadoras accesibles según las reglas actuales, sin excluir lesionadas. Una respuesta parcial no equivale a una evaluación completa…" pasa a "21 de 33 respondieron".

---

## Paso 4 — Pantallas principales con diseño propio

### Inicio
- Encabezado con el escudo y "CLUB **COMUNICACIONES**" grande; a la derecha, el próximo partido con cuenta regresiva.
- `FranjaNumeros`: posición, puntos, partidos jugados, lesionadas.
- Debajo, tres bloques del mismo peso: **Wellness de hoy** (barras por métrica), **Requieren atención** (semáforo rojo/amarillo con el motivo) y **Últimos 5** (cuadraditos V/E/D + último resultado + cumpleaños).

### Plantel
- Grilla de **fotos reales** (`jugadores.foto_url`), 5-6 por fila en escritorio y 2 en el celular, agrupadas por puesto con el título del puesto grande y la cantidad en amarillo.
- Foto con `object-fit: cover` anclada arriba (que no corte la cara), degradado negro abajo, **dorsal en amarillo y apellido grande**; el nombre aparece al pasar el mouse. Estado (lesionada, suspendida, no disponible) como etiqueta chica arriba a la derecha.
- Sin foto: fondo del panel con las iniciales grandes.
- Efecto de apagar a las demás al pasar el mouse.

### Perfil de jugadora (portada)
- Arriba: foto grande, dorsal gigante en amarillo, apellido enorme, nombre y puesto; `FranjaNumeros` con PJ, minutos, goles y estado físico (semáforo).
- Las pestañas se mantienen. En **Rendimiento** sacá lo repetido (hoy "Participación deportiva" aparece dos veces) y dejá el detalle largo en desplegables.

### Partidos
- `FranjaNumeros` que se recalcula con los filtros: partidos, G-E-P, goles a favor/en contra, efectividad.
- Chips de filtro: resultado (todos/victorias/empates/derrotas) y condición (todas/local/visitante).
- Tabla chica "por condición" y la racha en cuadraditos de color.
- **Tarjetas compactas** (4-5 por fila): fecha y condición arriba, escudo del rival + nombre + resultado grande con el color del resultado, y una **franja vertical de color** a la izquierda (verde/amarillo/rojo). Las acciones (PDF citación, Imagen citación, Estadísticas, Editar) aparecen al pasar el mouse; **Eliminar va dentro de un menú "···"** con confirmación en pantalla.

### Comparativa de jugadoras
- Mismo estilo que la maqueta: lista para elegir dos jugadoras (amarillo y blanco), radar con animación y barras por métrica con el valor y el percentil. Solo cambio visual: usá las métricas que ya calcula hoy.

---

## Paso 5 — Revisión final
- `npm run build` sin errores y `npx eslint src` limpio.
- Recorré todas las secciones con cada rol (coordinación, técnico, preparador físico, médico) y en el celular.
- Revisá que los PDF sigan generándose con el escudo.
- Escribí al final un resumen de qué archivos cambiaste y cualquier cosa que no hayas podido hacer.
