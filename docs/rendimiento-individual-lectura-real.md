# Rendimiento Individual 4.0 — conexión de lectura local

## Estado

Se conectó Perfil → Rendimiento mediante RendimientoIndividualConDatos. A diferencia
de la entrega visual previa, el contenedor usa el cliente Supabase existente y
SELECT reales. No hay claves de servicio, tablas nuevas, RPC nuevas ni cambios SQL.
La pestaña oculta no consulta datos deportivos de Análisis. No publicar este árbol:
los cambios de seguridad anteriores siguen sin aplicar/validar en producción.

## Lecturas y alcance

1. Validar usuario con auth.getUser y contrastar el ID con la sesión del hook.
2. Leer su perfil por email actual, sin aceptar roles desde metadata editable.
3. Paginar campos mínimos de jugadores visibles bajo RLS. Esta es la única fuente
   del selector comparativo, incluida la excepción de Reserva según las políticas
   actuales. Una lista vacía no se interpreta como un rechazo RLS confirmado.
4. Solicitar eventos y estadísticas exclusivamente por jugador_id de la principal
   y segunda seleccionada. No consultar eventos de categoría completa.
5. Leer metadatos de análisis por IDs exactos de los eventos seleccionados y por
   IDs deportivos referenciados en las estadísticas accesibles de esas jugadoras.
   No consultar análisis de categoría completa, notas internas ni eventos de terceros.
6. Leer partidos exclusivamente por IDs referenciados. Una relación deportiva solo
   se acredita cuando ID, categoría y fecha del partido son consistentes.
7. Revalidar usuario, perfil y visibilidad de las jugadoras antes de entregar datos.
   Si cambia el contexto o acceso, no se publican resultados parciales antiguos.

Las lecturas reutilizan leerPaginas (500 filas, orden estable por id) y leerPorIds
(lotes de 100). Una única fuente alimenta los gráficos, mapas y explorador. Cambiar
filtros de visualización o temporada no repite consultas. Seleccionar otra jugadora
relee ambas muestras bajo el mismo contexto; no reutiliza caché de otra sesión.

El contrato admite estado lectura_rls para proyectar fuentes de una consulta
ordinaria autenticada. No se fabrica una evidencia verificado ni se cambia
validarAlcanceIndividual. El contrato es un cálculo puro, NO una autorización.
La base sigue siendo la autoridad: las políticas antiguas no se consideran
certificadas por este lector ni sustituidas por sus filtros. La restricción de
escritura y lectura definitiva requiere el despliegue separado ya acordado.

## Presentación y cálculos

- Principal fija, segunda opcional entre jugadoras RLS visibles; se retiran muestras
  de selecciones que dejan de ser accesibles. La comparación no es una clasificación.
- Año calendario tomado de fechas reales; la fecha deportiva vinculada prevalece.
- Filtros comunes de partido deportivo (agrupa varios análisis del mismo partido),
  tipo, resultado, período, zona y minutos. Se conservan registros sin vínculo
  en opciones identificadas como análisis sin vínculo deportivo verificado.
- Mapa: solo coordenadas exactas válidas; no se invierten históricos sin referencia.
- Precisión y efectividad reutilizan el motor. Neutros/pendientes no se suman al
  denominador evaluado. Errores y fuentes denegadas nunca se reemplazan por cero.
- Estadísticas inaccesibles no bloquean acciones legibles, pero sus minutos quedan
  N/D. No se ofrecen tasas por 90 no acreditadas ni se duplican participaciones.
- Cobertura: partidos deportivos distintos con análisis accesible en el alcance
  compartido, partidos con acciones propias y tamaño observado con filtros. NO es
  porcentaje de cobertura ni confirmación de participación o etiquetado completo.
- Evolución agrupa por partido deportivo verificado y no conecta datos ausentes.
- Oficial y etiquetado permanecen separados; no se suman goles de ambas fuentes.

## Sesión, errores y actualización

useRendimientoIndividual invalida resultados por identidad/token, categoría/rol del
contexto, principal y segunda. Cada petición tiene vigencia propia: se abandonan
las páginas restantes y se descartan respuestas tardías cuando deja de estar vigente.
No se promete cancelar una sentencia HTTP que ya esté en ejecución.

Cerrar sesión retira los datos inmediatamente en el render siguiente; una respuesta
anterior no puede restaurarlos. El cambio de token revalida sin tocar las herramientas
existentes de Análisis. Actualizar datos y recuperar foco permiten recoger cambios
remotos. No se puede retirar retroactivamente información ya leída: una revocación
externa se refleja en la siguiente revalidación/RLS. Se mantienen filtros y selección
si siguen siendo válidos. No hay caché persistente ni almacenamiento de JWT propio.

## Video

Se permite un enlace HTTPS a YouTube únicamente desde video_url del análisis exacto
y un segundo numérico, finito y no negativo. No se busca video por fecha/rival ni se
usa el tiempo de otro partido. El enlace usa el segundo almacenado, como Análisis,
sin calcular offsets ni modificar reproductores. No se acredita una sincronización
que el esquema no registra: si el video fue reemplazado, esa correspondencia temporal
requiere comprobación manual. Videos sin vínculo válido no generan enlace.

## Pruebas y pendientes

Las pruebas nuevas usan API y filas exclusivamente ficticias, sin conexión remota:
1201 eventos/paginación, dos jugadoras, Reserva visible por RLS simulada, ausencia,
denegación, minutos inaccesibles, cancelación, cambio de usuario/categoría, carga
solo al abrir la pestaña, filtros conservados, video válido y cierre con respuesta
pendiente. No acreditan políticas desplegadas con usuarios reales.

Pendiente: inspección visual real a 1440/768/390 px en claro/oscuro, sesiones de
cada rol con la base real y sincronización de videos existentes. El navegador
informó anteriormente que el host de automatización no estaba disponible. Los
estilos y la interacción DOM sí se verifican automáticamente, sin capturas simuladas.

Esta entrega no ejecuta SQL, no cambia Supabase, .env.local, permisos, fotos, PDF
ni el módulo de etiquetado. Preserva las migraciones y correcciones de seguridad
locales. No hay commit, push ni despliegue.

## Archivos de esta conexión

Nuevos: src/utils/rendimiento/lecturaIndividual.js,
src/hooks/useRendimientoIndividual.js,
src/components/perfil/RendimientoIndividualConDatos.jsx,
tests/helpers/clienteIndividual.mjs, tests/lecturaIndividual.test.mjs,
tests/conexionIndividual.interaccion.mjs y este documento.

Actualizados: PerfilJugador.jsx, RendimientoIndividual.jsx,
rendimientoIndividual.css, presentacionIndividual.js, contratoIndividual.js,
lecturas.js (solo exporta sus dos helpers existentes) y la documentación de la
entrega visual anterior. No se modificaron los archivos de seguridad de Análisis.

## Resultado final

Dos ejecuciones de la suite secuencial: 190 aprobadas, cero fallos en cada una.
Build final correcto. ESLint específico correcto; global mantiene 22 errores y
3 avisos preexistentes. Continúa el aviso anterior por bundle de gran tamaño.
Los tres SQL protegidos conservan exactamente sus SHA-256 anteriores.
No se ejecutaron estas consultas contra producción mediante credenciales
administrativas ni se acreditaron sesiones reales. La validación de API, RLS y
sesión en esta entrega es con mocks; el código sí usa el cliente ordinario real
cuando se abre Rendimiento en la aplicación local.
