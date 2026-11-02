# Permisos definitivos de Análisis — preparación local

## No aplicado

La migración `202611010001_permisos_definitivos_analisis.sql` NO se ejecutó. No se
cambiaron RLS, datos ni perfiles desplegados. Los archivos del Bloque A previo y
los tres SQL protegidos permanecen intactos. No hay commit ni publicación.

Identidades comprobadas por metadatos autorizados de solo lectura:

- Kevin: `f7562d52-a16a-48b5-95a0-efbcc70080d3`.
- Gastón: `b2c65c50-8772-45a4-b2e0-c0e53c66253b`.

Ambas cuentas tenían correo confirmado, sin bloqueo vigente, y un perfil de
Coordinación. No se usó esa conexión administrativa para simular permisos de usuarios.

## Diseño

`puede_administrar_analisis()` devuelve solo la autorización de la sesión actual:
JWT autenticado, UUID incluido en la lista, cuenta no bloqueada y un único perfil
actual con rol Coordinación. Consulta el correo actual de Auth, no un nombre ni
un correo recibido desde React. SECURITY DEFINER, propietario postgres, search_path
vacío, sin parámetros ni ejecución anon/PUBLIC. No habilita a otros coordinadores.

Las ocho políticas de las dos tablas se reemplazan. Escritura: esta función en
INSERT WITH CHECK, UPDATE USING/WITH CHECK y DELETE USING. Lectura: administradores
ven todo; los demás ven eventos cuya autora es visible mediante la RLS de jugadores.
No se usa igualdad de categoría actual/histórica y se conserva Reserva. El padre
es visible si tiene eventos visibles. La política de eventos no depende del padre:
no hay recursión entre ambas. Detalles dependen de la visibilidad del evento.

Las observaciones deportivas y notas de filas accesibles siguen consultables. La
visibilidad de una destinataria no concede acceso a su perfil: sus datos descriptivos
se resuelven mediante jugadores con RLS. La relación deportiva del pase conserva
el identificador registrado, sin promover permisos por esa relación.

Las dos RPC de pases mantienen sus firmas, validación, revisión, auditoría y bloqueos
evento → detalle. Se reemplaza únicamente su guarda de autorización. Continúan sin
escritura directa en detalles; se conserva FORCE RLS y el trigger de consistencia.
Se retiran TRUNCATE/TRIGGER/REFERENCES innecesarios de las tablas principales para
los roles de aplicación. No se cambian políticas deportivas o de perfiles.

## Borrado deportivo

`eliminar_partido_deportivo_seguro(uuid)` es SECURITY INVOKER. Primero bloquea el
partido visible FOR UPDATE; borra citaciones/estadísticas, desvincula videos y borra
el partido en UNA transacción, conservando RLS. Un error de cualquier paso revierte
todo. Si las políticas impiden desvincular un video, el partido no se elimina y
se devuelve error: no se ignora como en el flujo anterior.

Un trigger privado BEFORE DELETE sobre partidos comprueba, sin depender de que el
usuario vea el análisis, si hay vínculo. Solo las dos cuentas pueden provocar su
SET NULL. No cambia la FK ni borra análisis. El bloqueo del padre también impide
que un INSERT concurrente con FK válida cree un vínculo mientras se borra.

La barrera adicional BEFORE DELETE en citaciones/estadísticas y BEFORE DELETE o
cambio de partido_id en videos rechaza operaciones destructivas de clientes sin
el protocolo actual. Se aplica a todos los partidos para no dejar una carrera
entre requests antiguos y la creación de un vínculo con Análisis. El cliente
nuevo envía x-client-info: club-comunicaciones/permisos-analisis-v2. Las ediciones
deportivas legítimas conservan RLS y no cambian su lógica. La RPC marca únicamente
su transacción para poder completar el borrado atómico.

El identificador de protocolo no es secreto, no concede permisos y NO sustituye
RLS. Un cliente que lo falsifique no obtiene permiso para administrar Análisis ni
borrar su padre vinculado. No se promete convertir varias solicitudes arbitrarias
en una transacción: el flujo soportado para eliminar partidos es la RPC. La
barrera evita el borrado parcial del flujo de las versiones antiguas conocidas.
Durante el despliegue, esos clientes recibirán un rechazo y deberán actualizarse;
no ampliar permisos para mantenerlos operativos.

## React y sesiones

App consulta la autorización del servidor; Layout oculta Análisis para todos los
demás. App separa el acceso a la interfaz (UUID admitido y Coordinación) de la
autorización de escritura del servidor. El componente vuelve a comprobar identidad
y rol mediante Auth y perfiles antes
de leer sus tablas y sus handlers siguen protegidos por el estado administrativo.
Las utilidades admiten los dos UUID como filtro preliminar, pero las RPC son la
autoridad de cada escritura y vuelven a verificar el rol actual.

La autorización visual se consulta al cambiar sesión/rol, recuperar foco y cada
30 segundos; una respuesta tardía de otra sesión se descarta. La autorización distingue puedeMontar de puedeEscribir. Un cambio de token del
mismo usuario conserva editor, formulario, reproductor y ventanas, pero pausa
escrituras hasta obtener confirmación. Un error de conexión mantiene el trabajo
local con escrituras suspendidas. La denegación confirmada, cierre de sesión o
cambio de cuenta retira el acceso; respuestas anteriores se descartan. El perfil
no se vuelve a cargar por la mera rotación del token.
Al revocarse, App desmonta el módulo y el hook de ventanas cierra la auxiliar.
La protección de base actúa en cada nueva sentencia; la interfaz puede tardar hasta
30 segundos en reflejar un cambio externo de rol. No se promete revocación de una
transacción que ya estaba ejecutándose antes del cambio.

Sin la migración, la RPC de autorización no está disponible: el acceso permanece
visible para las dos cuentas con Coordinación y el editor abre en modo consulta,
con aviso de activación pendiente. Los handlers y botones de guardado mantienen
el bloqueo mientras el servidor no autorice; no se sustituye la RPC por una
comprobación visual ni se habilita escritura por UUID únicamente. No publicar
esta versión contra el esquema viejo. No se implementó
todavía el lector individual ni sus gráficos; se preparan sus permisos de lectura.

## Validación y límites

Las pruebas React usan DOM y clientes simulados. Cubren renovación con consulta
pendiente/error, continuidad de formulario y video, ventana auxiliar abierta,
pausa de escrituras, revocación, cierre de sesión y respuestas tardías.

Se ejecutó además tests/permisosAnalisis.postgres.mjs en PGlite PostgreSQL 18.6,
local y aislado, sin red ni datos reales. El esquema y registros son sintéticos;
también se sustituyen en memoria los dos UUID de configuración por identidades
ficticias, sin copiar perfiles, correos reales, contraseñas ni sesiones. El archivo
original mantiene los UUID aprobados, cubiertos por las pruebas estáticas. Se probaron RLS, lectura por
categoría/Reserva, rechazo de escrituras, pérdida de rol, RPC/revisiones, clientes
antiguos, atomicidad y reversión con rechazo de deriva y aprobación explícita.
Además de esos UUID, las huellas de las RPC ANTERIORES se adaptan en memoria a
los stubs sintéticos. No se cambian las condiciones de autorización de las nuevas
funciones y políticas.

Límites: PGlite no reproduce Supabase Auth, firmas/expiración JWT, PostgREST/CORS,
concurrencia multiconexión ni el esquema íntegro de producción (PostgreSQL 17.6).
Auth se representa mediante claims locales y roles SQL; no acredita sesiones
reales. Las políticas deportivas y el trigger anterior de pases son fixtures,
no una certificación del despliegue real. La prueba de rollback valida el motor,
pero el respaldo anterior contiene stubs sintéticos, no las RPC de producción.

Pendiente en un entorno separado, antes de producción:

1. Ejecutar migración y comprobar sus precondiciones, políticas, ACL y funciones.
2. Probar cuentas ordinarias: ambos administradores, otro coordinador, técnico,
   Médico, PF, anónimo; escritura directa y RPC rechazadas donde corresponda.
3. Probar Reserva, otras categorías, histórico, eventos sin autora y detalle de pase.
4. Probar rollback transaccional de borrado cuando fallen hijos, videos o padre;
   análisis vinculado no visible y concurrencia con creación/eliminación de análisis.
5. Probar revisiones cruzadas de destinataria/destino, tipo/autora y cascadas.
6. Inspeccionar navegador autenticado, cierre de sesión y ventana auxiliar abierta.

## Pasos exactos propuestos para aplicar, solo con autorización posterior

1. Revisar este diff y los dos SQL nuevos; conservar copias y resultados de la
   verificación de metadatos. No incluir los SQL protegidos en una entrega.
2. Completar las pruebas PostgreSQL/RLS anteriores en una base separada con esquema
   equivalente. La huella del preflight exige las RPC exactas auditadas; si difieren,
   revisar, no quitar la comprobación para forzar la ejecución.
3. Coordinar una ventana sin escrituras ni borrados y cerrar clientes antiguos.
4. Revalidar proyecto, dos cuentas/roles y huellas. Ejecutar UNA vez la migración
   completa BEGIN–COMMIT con postgres. Si falla, detenerse; no ejecutar fragmentos.
5. Verificar objetos y permisos mediante metadatos, sin crear datos ficticios en
   producción. El respaldo privado conserva las definiciones anteriores.
6. Publicar la versión React únicamente con aprobación independiente, recargar
   clientes y comprobar las dos sesiones administradoras y las de consulta.

## Reversión

`supabase/rollback/202611010001_permisos_definitivos_analisis.sql` restaura las
políticas, cuerpos originales de RPC y permisos de tablas capturados al aplicar.
Elimina solo objetos nuevos; no borra datos deportivos. No toca el trigger original
de pases. Requiere postgres, respaldo y ausencia de cambios posteriores que dependan
de estos objetos. No es idempotente ni una migración para ejecución automática.

**Advertencia:** revierte a lectura general autenticada y a las autorizaciones
anteriores. No ejecutarlo automáticamente ante errores. La recuperación preferida
es deshabilitar la nueva interfaz conservando la base restringida; cualquier
restauración completa requiere aprobación y coordinación con la versión React.

## Reversión reforzada y compatibilidad de despliegue

La migración registra un manifiesto privado de políticas (incluidas las deportivas
relacionadas), funciones/ACL, triggers, RLS, restricciones y respaldo original.
La reversión compara esa huella antes de eliminar cualquier objeto. Una política
ajena o una función modificada impide revertir; no se elimina silenciosamente.
Requiere además SET club.aprobar_reversion_amplia='SI_REVISADO' en la misma conexión,
solo tras decisión expresa de restaurar permisos anteriores más amplios. No se
incluye esa aprobación activada en el archivo. Cualquier error revierte todo.
Un cambio de versión de PostgreSQL puede cambiar la representación del catálogo:
se detiene para revisión manual, nunca se omite la comprobación.

Orden seguro pendiente de autorización: ventana sin escrituras; verificar esquema
y huellas; aplicar SQL completo una vez; comprobar metadatos; desplegar React con
protocolo v2; verificar sesiones reales y clientes antiguos. En la ventana entre
SQL y React los clientes viejos deben rechazar operaciones afectadas, no quedar
con permisos anteriores. Si se retira React nuevo, mantener la base restringida;
si se aprueba revertir la base, retirar/detener antes el React dependiente de las
RPC nuevas. No ejecutar reversión con operaciones activas.

## Resultado local de esta corrección

Suite JS secuencial: 177 aprobadas, cero fallos, después de corregir la lectura
inicial nula del hook. Ensayo PostgreSQL aislado: aprobado. Build: correcto.
ESLint global: 22 errores y 3 avisos anteriores, sin nuevos hallazgos; lint de
hook, App, protocolo, editor de destinataria y nuevas pruebas: correcto.
Se observó un aviso local de puerto WebSocket 24678 ocupado en pruebas Vite;
no produjo fallos ni se cambió la infraestructura ajena en esta entrega.
Los tres SQL protegidos conservan sus SHA-256 originales. No se aplicó SQL en
Supabase, ni se modificaron variables de entorno, fotografías, PDF o producción.

## Corrección del acceso con migración pendiente

La visibilidad anterior dependía de puedeMontar, que exigía una respuesta positiva
de puede_administrar_analisis. Al faltar esa RPC, Kevin y Gastón perdían el menú.
Ahora puedeAbrir es una capacidad de navegación separada: UUID reconocido y rol
Coordinación del perfil, con retirada ante denegación explícita. PuedeEscribir
sigue dependiendo de confirmación positiva del servidor y del token vigente.
El editor comprueba además Auth/perfil antes de cargar datos, conserva esAdmin
como autorización de servidor y usa accesoEditor solo para presentar los controles.
PGRST202/42883 se identifican como función pendiente, otros fallos como revalidación
fallida. Ningún error se convierte en permiso de escritura. Una key por ID de
usuario evita conservar el editor al cambiar entre las dos cuentas; renovar el
token del mismo usuario no cambia esa key.

La restricción definitiva de la base de datos todavía requiere aplicar y validar
la migración: esta corrección de navegación no modifica ni certifica RLS actual.
