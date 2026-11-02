# Rendimiento Premium 4.0 — rediseño visual local

## Alcance

Solo presentación. Se conservan lecturas, filtros, fórmulas, contratos, autorización
y funciones de Análisis. No hay SQL, cambios de permisos, dependencias ni publicación.

## Pantalla

- Cabecera deportiva integrada: fotografía original de la jugadora, nombre,
  categoría y posición existentes, selector anual y contexto de la muestra.
- Comparador con selección/búsqueda existentes y fotografía de la segunda jugadora.
  Tarjetas paralelas identifican principal/comparación y sus muestras distintas.
- Estadísticas oficiales en una franja compacta. Recibe los siete totales ya
  calculados por PerfilJugador, sin recalcular nada. Se etiqueta expresamente como
  histórico de todos los períodos; la temporada/filtros de acciones no se mezclan.
- Histórico y detalles oficiales conservados dentro de un desplegable accesible.
  Al solicitar un detalle se abre su contenido. Sin datos se muestra N/D.
- Filtros compartidos compactos. Advertencias de fuentes/denominadores se conservan;
  el contexto extenso de cobertura está en un desplegable con resumen explícito.
- Mapa destacado, césped vectorial, áreas/arcos y puntos exactamente en las mismas
  coordenadas. Conserva leyendas de tipo/resultado y selección con teclado.
- Escritorio: mapa y distribución; efectividad y evolución. Comparación: los dos
  mapas juntos, gráficos comparativos debajo y explorador completo al final.
- Distribución con barras horizontales, cantidades y escala común, sin puntaje.
- Efectividad con bandas por resultado, porcentajes y denominadores existentes.
  La tabla con todos los conteos sigue disponible en un desplegable.
- Evolución con fechas/rivales, ejes y puntos discretos sobre escala compartida.
  No hay interpolación ni líneas que atribuyan continuidad a partidos sin cobertura.
  Los valores iguales de ambas jugadoras usan etiquetas separadas. Lista completa
  de valores accesible debajo; el gráfico se desplaza dentro de su contenedor si
  hay muchos partidos, sin comprimir las etiquetas o ensanchar toda la página.
- Explorer y accesos de video preservados. Temas claro/oscuro/automático mediante
  variables existentes, superficies claras y cabecera institucional oscura.

## Archivos

PerfilJugador.jsx: solo pasa indicadoresOficiales={totales} al contenedor existente.
RendimientoIndividual.jsx, GraficosAccionesIndividual.jsx, MapaAccionesIndividual.jsx
y rendimientoIndividual.css: presentación. Nuevo tests/rendimientoVisualPremium.test.mjs.
No se modifica el contenedor de datos ni los hooks de lectura o administración.

## Verificación y límites

Pruebas nuevas de contenido, conservación de cifras, posiciones X/Y, escala común,
etiquetas no superpuestas, estructura adaptable y estilos acotados. Las pruebas de
integración existentes cubren navegación, selección, filtros, sesión, permisos y PDF.
Comparación SHA-256 de 17 archivos críticos antes/después: sin cambios, incluyendo
lectores, motor, permisos, Análisis, migración/reversión, tres SQL protegidos y PDF.
Las fotografías originales no se editaron ni se reemplazaron: solo encuadre por CSS.

No fue posible la inspección visual real: el host de automatización del navegador
no está disponible. No se presentan DOM/SSR como validación real de 1440/768/390 px.
Pendiente revisión humana de encuadres, altura de paneles, nombres largos, contraste
y tamaño de gráficos a esos anchos, en claro y oscuro. No se generan capturas falsas.

## Resultados

Suite completa secuencial: 195 aprobadas, cero fallos. Pruebas específicas visuales
y de conexión repetidas tras los últimos ajustes: 5 aprobadas. Build correcto.
ESLint de los archivos intervenidos: sin errores ni avisos. Se mantiene el aviso
anterior de bundle de gran tamaño. El módulo servido por Vite responde HTTP 200.
Servidor local en http://localhost:5173/. No se hizo commit ni publicación.
