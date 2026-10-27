# Let's Get Close — puesta en marcha de la experiencia de dos teléfonos

Fecha: 27 de octubre de 2026. Estado: preparación de integración, NO multijugador nuevo desplegado.

## Decisión de producto

El producto principal usa dos teléfonos, una identidad por persona y una sala compartida. La carta ocupa cada pantalla y muestra el rol de quien la sostiene. La demostración local sirve únicamente para explorar las cartas; no sustituye el producto ni es su propuesta comercial.

Recorrido objetivo: crear partida → compartir enlace o QR → la pareja entra → ambos eligen y confirman nivel → una persona pregunta y la otra responde → cada una comparte la retroalimentación que corresponda → el servidor avanza y alterna roles. Registro permanente después de experimentar valor, antes de conservar historia entre dispositivos o contratar un plan. El modo invitado ya tiene base en el repositorio.

## Lo que debe hacer Vini ahora

1. Abrir el Supabase original desde https://supabase.com/dashboard/project/bbdeyohqrutithaziulp/settings/general y comprobar nombre, propietario y contenido. Este identificador viene del código; su existencia/estado remoto todavía no se ha podido verificar desde las conexiones actuales.
2. Destino recomendado: la organización que contiene **astra**, `ziztridqzkwfoftdxgnz` (actualmente «viniciusmexico@gmail.com's Org»). Mantener Let's Get Close como proyecto independiente de Astra, Multiverso y la web personal.
3. Si se conserva el original, transferir desde **Settings → General → Transfer project** a esa organización. Se requiere Owner de la organización de origen y pertenecer al destino. Revisar los bloqueos que muestre Supabase: integración GitHub de Supabase, roles de proyecto, log drains o límites del plan. No borrar el repositorio GitHub para resolver una integración de Supabase.
4. Si no aparece el destino, entrar con una cuenta que pertenezca a ambas organizaciones o resolver primero la pertenencia. Si no existe el proyecto original, detener la transferencia: inventariar backups/datos antes de crear su reemplazo. No crear un duplicado a ciegas.
5. Después de transferir, comprobar que el proyecto aparece en la conexión Supabase de este chat; puede requerir volver a autorizar la conexión para incluir el proyecto. Basta compartir el ID o el enlace del dashboard. No enviar contraseñas ni claves privadas al chat.
6. En la organización elegida, revisar el plan y facturación antes del lanzamiento. Recomendación de operación: Pro para producción y presupuesto/alertas. Una organización reúne facturación; cada proyecto activo conserva costes de cómputo. No se ha cambiado ningún plan ni creado proyectos con coste.

Transferir organiza la infraestructura; **no integra las nuevas cartas automáticamente**. El siguiente trabajo es técnico y no debe recaer en el usuario.

## Arquitectura recomendada

| Pieza | Responsabilidad | Decisión |
| --- | --- | --- |
| Vercel | Web/PWA, HTTPS, recursos y despliegues | Mantener el frontend existente. No hace falta añadir un VPS para empezar. |
| Supabase Postgres | Sala, miembros, rondas, catálogo, respuestas, derechos de acceso | Única autoridad sobre fase, nivel y turno. |
| Supabase Auth | Identidad propia por teléfono | Invitados autenticados al comenzar; vinculación a cuenta para historial/pago. |
| Supabase Realtime | Avisar cambios a los dos teléfonos | Canal privado autorizado; recuperar estado de Postgres al reconectar. |
| Edge Functions | IA, pagos, operaciones privilegiadas | Secretos en servidor; permisos y límites por petición. |
| Stripe | Plan para la pareja, checkout y facturación | Activar después del juego sincronizado; probar webhooks e idempotencia. |
| Correo transaccional | Acceso, recibos o avisos solicitados | SMTP propio; el código de correo existente usa Resend. No enviar contenido íntimo por defecto. |

Separar desarrollo local, staging con datos de prueba y producción. Preferir un proyecto Let's Get Close de producción y otro de staging en la misma organización, sujetos a presupuesto. No usar el Supabase de Astra ni de la web personal como base compartida del juego.

## Inventario antes de modificar el servidor

- Comparar migraciones aplicadas y esquema remoto con el repositorio. Hay muchas migraciones históricas; no ejecutar la carpeta completa sobre una base desconocida.
- Inventariar Auth, tablas, RLS, índices, funciones/RPC, triggers, cron, Storage, publicaciones Realtime, Edge Functions y entitlements de pago. Revisar advisors y logs sin descargar respuestas íntimas.
- Comprobar backup y ensayar restauración en entorno aislado antes del corte.
- Transferir el original conserva su identidad de proyecto. Si se crea uno nuevo, sustituir también URLs de cron, triggers, webhooks y redirects; no basta con cambiar la URL del frontend.
- El changelog actual exige no crear objetos en el esquema reservado `realtime`; sus políticas autorizadas sobre `realtime.messages` se gestionan según documentación. Revisar versión real de Postgres antes de cambios de extensiones.

## Configuración que prepararemos

### Vercel, variables del frontend

Usar `.env.example` como plantilla y asignar valores por entorno:

- `VITE_SUPABASE_URL`: URL del proyecto correspondiente.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: clave pública `sb_publishable_…`; una anon JWT heredada sigue admitida para migración.
- `VITE_SUPABASE_PROJECT_ID`: referencia del mismo proyecto, comprobada contra la URL.
- `VITE_TABLE_PREVIEW=true`: conserva el entorno de demostración aislado durante la integración.

El cliente ya se prepara para leer estas variables en lugar de una URL fija. Una clave pública no sustituye las políticas RLS. **No activar `VITE_TABLE_PREVIEW=false` para «arreglar» la sincronización**: habilita rutas antiguas; no conecta el nuevo `Play.tsx` al servidor.

Nunca colocar `service_role`, `sb_secret_`, `OPENAI_API_KEY`, claves Stripe, contraseña de base de datos ni claves de correo en variables `VITE_*`.

### Supabase

- **Auth:** habilitar Anonymous Sign-Ins en staging una vez auditadas las políticas para invitados; configurar Turnstile/CAPTCHA y límites con soporte en el cliente. Cada teléfono necesita su propio `auth.uid()`, no un ID editable en localStorage.
- **Auth URLs:** producción `https://letsgetclose.com`; añadir únicamente los redirects realmente usados y los orígenes de staging autorizados. Revisar callback OAuth y recuperación de contraseña.
- **Realtime:** canales privados con autorización por pertenencia a sala. Publicar solo estado compartible; las elecciones secretas no deben viajar al otro teléfono antes de revelar. La presencia indica conectividad, no consentimiento ni avance.
- **Edge Function Secrets:** `OPENAI_API_KEY`; `ALLOWED_ORIGINS` con los dominios exactos de cada entorno; `INTERNAL_FUNCTION_SECRET` para funciones internas. El proyecto gestiona sus claves Supabase del servidor.
- **Pago, cuando corresponda:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`. Empezar con modo test; productos/precios definitivos requieren decisión comercial.
- **Correo, si se activa:** `RESEND_API_KEY`, dominio remitente verificado y SMTP propio para Auth. Mantener correos de reactivación y análisis desactivados hasta definir consentimiento y contenido.
- Auditar los handlers antes de desplegarlos. Las funciones de IA antiguas aún no implementan el nuevo contrato de pareja.

## Integración del juego: trabajo pendiente obligatorio

### Estado autoritativo

Definir una ronda versionada con `room_id`, `round_id`, `version`, `card_key`, `catalog_version`, `agreed_level`, `topic`, `asker_id`, `respondent_id`, `kind`, `phase` y tiempos del servidor. Los nombres son contrato propuesto, no tablas creadas.

Acciones propuestas: crear/unirse; votar y confirmar nivel; confirmar respuesta; registrar feedback propio; enviar predicción/elección; revelar; pasar; pausar; terminar. Cada acción debe validar identidad, pertenencia, rol, fase, versión esperada y clave de idempotencia, dentro de una transacción que bloquee la ronda. Repetir una solicitud aceptada devuelve su mismo resultado; no vuelve a avanzar.

El cliente no debe poder escribir directamente `current_turn`, `current_card` o `current_phase`. Deshabilitar esos permisos solo al migrar los clientes al nuevo contrato, para no romper una versión antigua que siga en uso. Versionar el despliegue y prever rollback.

### Privacidad por teléfono

- En conversación, quien pregunta ve «escucha» y quien responde «tu turno»; cada uno registra su propia perspectiva. No obligar a escribir toda la conversación ni grabar audio para que el juego funcione.
- En adivinanzas, separar la predicción de A y la respuesta de B. El servidor revela el resultado permitido cuando ambos terminaron; nadie puede leer la elección pendiente del otro.
- En coincidencias, revelar solo la intersección acordada, no toda preferencia privada rechazada.
- Guardar feedback privado en almacenamiento con lectura propia; el selector recibe únicamente los datos y agregados autorizados. Las tablas actuales de respuestas compartidas no sirven para secretos previos a la revelación.
- Pausar, pasar o pedir menos intensidad permanece disponible. Una sola señal de incomodidad limita el ritmo; intensificar exige acuerdo mutuo dentro del nivel elegido.
- Borrado, desvinculación y retención del historial deben definirse antes de persistir intimidad. Separar permiso para adaptar esta sesión del permiso para guardar historia.

### Reconexión

Realtime notifica una versión nueva, el cliente lee un snapshot autorizado y converge. Tras suspender la app, cambiar Wi-Fi/datos, recargar o perder un evento, ambos teléfonos recuperan la misma ronda. Rechazar eventos atrasados; nunca aplicar «siguiente carta» solo porque llegó un broadcast.

### Inteligencia

Primero un selector editorial determinista sujeto a nivel, límites y no repetición. Después IA para ordenar candidatos y resumir evidencia autorizada. La IA no decide permisos, turnos, cobros ni aumenta intensidad unilateralmente.

Conectar y probar `_shared/round-policy.ts` con el selector. Derivar nivel desde el servidor, no desde el parámetro enviado por el cliente. Validar todas las salidas contra el catálogo. Añadir presupuesto por sesión, deduplicación por ronda, timeout y alternativa editorial cuando falle el proveedor.

El código antiguo usa `gpt-4o-mini`; «Astra» como modelo de trabajo de desarrollo no implica que el servidor utilice ese modelo. Elegir el modelo de producción mediante evaluación de calidad, latencia y coste; hacerlo configurable cuando se implemente el selector nuevo.

Medir coincidencia de predicción por tema, dirección y número de observaciones. No convertirla en «compatibilidad» ni inferir honestidad, consentimiento o salud de la relación. Tiempo visible en pantalla no equivale a tiempo hablando. Los insights deben describir evidencias de la sesión y sus límites.

## Criterios de lanzamiento

| Prueba | Condición de salida |
| --- | --- |
| Dos teléfonos reales | Crear, invitar, elegir nivel y jugar desde iPhone/Safari y Android/Chrome con identidades distintas. |
| Tercero ajeno | No puede entrar en sala completa ni leer sala, elecciones, feedback o informes. |
| Turnos simultáneos | Doble toque, reintento y solicitudes fuera de orden no duplican ronda ni gasto. |
| Privacidad | Elecciones invisibles antes de revelar, incluso consultando API directamente. |
| Reconexión | Recarga, pestaña suspendida y cambio de red recuperan la misma carta/turno. |
| IA | Nivel y límites se respetan; caída/timeout conserva una carta editorial válida. |
| Pago | Un webhook duplicado da un único derecho; cancelación/reembolso se reconcilian; cobro no interrumpe una respuesta. |
| Operación | Restauración ensayada, alertas, límites de gasto y rollback comprobados. |
| Retención | Historial solo con permiso y cuenta; borrar/desvincular funciona; métricas no incluyen contenido íntimo. |

Objetivos propuestos para medir en staging, no resultados logrados: >99% de acciones válidas aceptadas durante la prueba de carga definida; propagación entre teléfonos p95 <1 segundo en redes estables; recuperación de sesión p95 <5 segundos al volver la conexión. La aceptación incluye casos fallidos y navegadores reales, no solo una cifra media ni el build.

## Orden de ejecución

1. Acceso al proyecto original y decisión de transferencia.
2. Backup, inventario y staging; configuración de entornos.
3. Contrato versionado y políticas privadas; pruebas de concurrencia y autorización.
4. Conectar la nueva carta al contrato; enlace/QR, elección conjunta y reconexión.
5. Selector editorial → IA validada → insights autorizados.
6. Stripe test → plan de pareja → condiciones definitivas → live.
7. Prueba de aceptación con dos teléfonos, revisión operativa y corte de dominio.

No se han creado proyectos, cambiado planes, aplicado migraciones ni desplegado funciones remotas en esta preparación. El bloqueo inmediato es el acceso al proyecto original, y después queda la integración de producto descrita arriba.

## Referencias verificadas

- https://supabase.com/docs/guides/platform/project-transfer
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/realtime/authorization
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/changelog.md
