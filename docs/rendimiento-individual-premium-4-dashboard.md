# Rendimiento Individual Premium 4.0 — avance local compatible

## Qué se integra hoy

La pestaña Rendimiento de PerfilJugador usa RendimientoIndividual. Conserva las
seis pestañas, todas las consultas, filtros/detalles oficiales históricos, gráficos
de temporadas, evaluaciones, Seguimiento y exportaciones. No se añaden lecturas
ni escrituras Supabase. Los acumulados oficiales se presentan tal como existen;
no se utilizan como denominador de acciones ni se suman goles oficiales y etiquetados.

El diseño incorpora cabecera deportiva, fotografía existente con alternativa,
selector calendario, histórico oficial y estado explícito de integración pendiente.
El histórico y sus detalles siguen abarcando todos los períodos, identificado en
pantalla; no se confunde con la temporada del comparador de acciones.

## Componentes preparados y comprobados exclusivamente con fixtures locales

- MapaAccionesIndividual: cancha 2D, puntos exactos X/Y 0–100, selección con mouse
  y teclado, detalle y leyenda de tipo/resultado. Coordenadas ausentes, nulas,
  booleanas o fuera de rango no se dibujan. No se utiliza el centro de una zona.
- GraficosAccionesIndividual: barras interactivas por tipo, tabla de efectividad
  con numerador/denominador y resultados diferenciados, evolución SVG por partido
  vinculado/fechado. Dos análisis del mismo partido se agrupan y no duplican eventos.
- RendimientoIndividual: jugadora principal fija, segunda jugadora opcional del
  conjunto autorizado entregado por el futuro lector; fotografías, filtros comunes
  de análisis, tipo, resultado, período, zona y minutos; mapas lado a lado,
  explorador y acción seleccionada. Quitar comparación conserva la principal.
- presentacionIndividual: funciones puras; reutilizan resumirAcciones del motor,
  sin cambiar clasificación, fórmulas, PDF ni datos históricos.

No existen datos de ejemplo ni una vía de activación en la aplicación publicada.
Los fixtures están únicamente en tests. No se fabrica evidencia de permisos.
No se instala ninguna dependencia.

## Contrato de conexión futura (NO activado)

Perfil no entrega lecturaAcciones ni jugadorasAutorizadas: por tanto, no consulta
Análisis ni otras jugadoras y el selector comparativo queda deshabilitado.

El futuro lector, solo después de verificar autorización real, debe entregar:
- lecturaAcciones.contrato: resultado de construirContratoIndividual, del mismo
  usuario/sesión/proyecto y año calendario. No persistirlo entre cuentas.
- lecturaAcciones.analisis: metadatos de análisis accesibles; para evolución se
  requiere partido_deportivo {id, fecha, rival} cuyo id coincida exactamente con
  partido_calendario_id. Sin esta relación no se infiere un vínculo por fechas.
- jugadorasAutorizadas: únicamente perfiles accesibles verificados, nunca lista
  global sin RLS. Al cambiar la sesión, retirar inmediatamente fuentes y selección.
- estados error/denegado diferenciados. Una fuente parcial o fallida no se muestra
  como cero. Una lectura confirmada sin eventos indica registros observados vacíos,
  no ausencia de actividad deportiva. Cobertura del etiquetado siempre no acreditada.

La evidencia del contrato anterior no concede permisos. Ocultar el lector no
sustituye RLS; la conexión sigue dependiendo de la validación y activación de las
políticas pendientes. No se implementó ningún nuevo lector como atajo.

Video: no hay enlaces fabricados. El componente solo ofrece la acción de video si
el futuro integrador entrega un callback y confirma la sincronización del análisis.
Hoy no se conecta ese callback. No se modifica YouTube ni el módulo Análisis.

## Limitaciones explícitas

La orientación histórica no está verificada: se preserva X/Y original y se informa
esa limitación. No se presenta falsamente todo evento como ataque de izquierda a
derecha. La normalización estándar necesita una referencia espacial acreditada.
No se ofrecen tasas por 90 ni percentiles en este dashboard preparatorio.
Los resultados específicos se clasifican exactamente con el motor existente;
no se redefine el literal Pendiente ni se cambian denominadores en esta entrega.

El navegador automatizado informó que su host no está disponible. JSDOM verifica
interacciones y CSS adaptable, pero no acredita encuadres ni tamaños reales a
1440/768/390 px. Esa inspección real en claro y oscuro queda pendiente.

Los cambios de seguridad anteriores permanecen íntegros y sin aplicar. Este árbol
completo NO debe publicarse contra el esquema anterior. El nuevo dashboard por sí
mismo no requiere SQL; las lecturas de acciones y el comparador real sí permanecen
pendientes de la verificación de seguridad acordada. No se crearon recursos remotos.

## Verificación de la entrega local

- Suite completa secuencial: 183 pruebas aprobadas, cero fallos.
- Pruebas específicas repetidas tras los últimos ajustes: 6 aprobadas.
- Build de producción correcto. Persiste el aviso anterior de bundle grande.
- ESLint de los archivos intervenidos: correcto. Global: 22 errores y 3 avisos
  preexistentes, sin nuevos hallazgos.
- Las pruebas anteriores confirman las mismas consultas, fórmulas históricas,
  permisos y generadores PDF del Perfil. Se conserva el estado vacío anterior.
- SHA-256 de los tres SQL protegidos coincide con los valores anteriores.
- Sin SQL, migraciones, recursos remotos, commits, push ni despliegues.

## Actualización posterior: conexión local

El lector preparatorio descrito arriba ya fue conectado localmente en la siguiente
entrega. Ver rendimiento-individual-lectura-real.md para el estado vigente. Las
restricciones de publicación y validación de políticas pendientes continúan.
