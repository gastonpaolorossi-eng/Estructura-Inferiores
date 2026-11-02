# Rendimiento Individual 4.0 — Bloque A

## Estado de seguridad: detenido antes de Etapa 2

No se verificaron políticas desplegadas ni lecturas con sesiones de aplicación de
los roles pertinentes. Las herramientas administrativas de Supabase no constituyen
una prueba de autorización de una jugadora/perfil y no se utilizaron para leer datos.
No se ejecutó SQL, no se leyó `.env.local` y no se usaron claves de servicio.

El menú ofrece Análisis a Coordinación y al recorrido técnico; otros roles pueden
abrir perfiles sin tener ese acceso. Esto NO acredita permisos de consulta. El código
de Análisis contiene además una categoría fija, mientras que Perfil usa el ID de
jugadora. Ninguna de esas condiciones autoriza por sí sola nuevos accesos históricos.

Antes de habilitar el lector individual, verificar mediante sesiones ordinarias y
solo lectura: identidad/proyecto, roles permitidos, categorías accesibles, jugadoras
seleccionables y tablas de partidos, análisis, eventos y participación deportiva.
Comprobar también rechazo de otras categorías y comportamiento con sesión cerrada.
Si la comprobación requiere SQL, solicitar autorización específica; no se incluye
ninguna sentencia SQL en esta entrega.

## Contrato implementado, sin consumidor en la aplicación

`src/utils/rendimiento/contratoIndividual.js` es puro: no importa el cliente, no hace
consultas y no está conectado a Perfil ni a una interfaz nueva.

`validarAlcanceIndividual` verifica consistencia de una evidencia externa con usuario, sesión,
proyecto, año calendario, una o dos jugadoras y categorías explícitas. Distingue
sin sesión, alcance inválido, no verificado, denegado y evidencia consistente.
No autentica, no valida JWT y no es una nueva autoridad de permisos. La evidencia
actual es exclusivamente simulada en pruebas; no debe fabricarse en frontend ni
obtenerse de localStorage o campos editables. El contrato no habilita el lector.

`construirContratoIndividual` consume fuentes ya consultadas bajo ese alcance:

- Cada fuente distingue disponible/denegado/error/no consultada. Los errores descartan
  filas residuales; una respuesta malformada no se interpreta como lista vacía.
- Se filtra por ID, categoría histórica explícitamente permitida y año calendario.
- El partido deportivo vinculado y fechado determina el año; sin vínculo se utiliza
  la fecha del análisis, identificando los eventos como no vinculados.
- Las acciones sin análisis accesible o fecha válida quedan en incidencias, sin
  asignarles un año ficticio. No se vincula por nombres, rival o semejanza de fechas.
- Se eliminan duplicados por ID; versiones contradictorias del mismo ID quedan
  excluidas del agregado y registradas como conflicto de datos.
- Se separan registros deportivos, participación validada, acciones vinculadas,
  acciones sin vínculo, número de análisis y número de partidos deportivos distintos.
- La ausencia accesible devuelve resumen de acciones null: no implica rendimiento
  cero. Los conteos describen registros observados, no cobertura completa.
- Se reutilizan `resumirAcciones` y `resumirParticipacion`. No se recalculan ni reemplazan
  los siete indicadores históricos; las filas originales permanecen disponibles.
- Participaciones duplicadas invalidan minutos del cálculo validado sin alterar
  registros. Varios análisis de un partido no duplican sus minutos.
- La cobertura individual queda no acreditada y las tasas por 90 deshabilitadas en
  este contrato preparatorio. No hay tasa por partido analizado.

Para el lector futuro, los eventos deben estar limitados a los dos IDs y los análisis
autorizados. Los estados de cobertura global no pueden inferirse desde ese subconjunto.
Los filtros de visualización de tipo/resultado no deben aplicarse a las bases de
porcentajes sin definir primero su denominador. No se implementaron esos filtros aquí.

## Verificación

Las pruebas usan datos simulados: permiso consistente/no probado/denegado, sesión
ausente, usuario/proyecto distintos, categorías históricas, año, eventos ajenos,
ausencia, errores, huérfanos, fechas desconocidas, vínculos incompletos, varios análisis,
participación duplicada, fórmulas y conflictos de IDs. No verifican permisos reales.

No se implementó Etapa 2 ni diseño, mapa, comparador o explorador. El perfil publicado
y la Preview anterior permanecen sin cambios. No hay commit, push ni despliegue.
