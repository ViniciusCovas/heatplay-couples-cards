# GetClose — la pantalla es la carta, la inteligencia cuida el recorrido

Fecha: 26 de octubre de 2026. Propuesta de producto y arquitectura basada en el código de este repositorio y las correcciones del propietario. No describe capacidades ya desplegadas del backend.

## Decisión de experiencia

Conectar dos teléfonos → elegir un nivel compartido → una pregunta ocupando la pantalla. Mientras conversan: pregunta, nivel/progreso discretos y dos acciones («Ya respondimos», «Pasar»). Pausa, cambio de nivel y explicación de la prueba quedan en un menú. Sin cronómetro visible, encabezado de marca repetido, insignias de IA ni instrucciones debajo de cada carta. La marca permanece en el diseño y una firma pequeña dentro de la carta.

La interacción importante es entre las personas. La recogida de señales sucede en las transiciones y se reduce cuando no aporta información nueva.

## Lo que existe y lo que falta

| Evidencia del código | Implicación |
| --- | --- |
| `ResponseEvaluation.tsx` recoge honestidad, atracción, intimidad y sorpresa, más nota opcional. | Las valoraciones no desaparecieron del juego online; la anterior prueba visual no las representaba. |
| Las cuatro puntuaciones se inicializan en 3. | Enviar sin elegir puede aparentar cuatro opiniones reales. El nuevo contrato debe usar null/no respondido, nunca un valor neutro inventado. |
| `intelligent-question-selector` consulta dos respuestas y usa principalmente la más reciente para el prompt. | Hay adaptación puntual, pero no memoria longitudinal equilibrada de ambos ni arco construido con evidencia. |
| La estrategia actual busca subir la dimensión con menor puntuación. | Una experiencia incómoda no es una invitación a insistir. Separar preferencias, bienestar, límites y disfrute. |
| `Game.tsx` devuelve segundos; el selector escribía «ms». | Se corrige la unidad en el prompt. El temporizador legacy sigue necesitando refactor, especialmente pausas y visibilidad. |
| `ResponseInput` permite texto; el modo hablado guarda una frase indicativa, no audio. | No se puede deducir qué dijeron por haber permanecido frente a una carta. |
| El informe utiliza valoraciones y notas del oyente. | Las impresiones no son citas verificadas del interlocutor ni diagnósticos de la relación. |
| El cliente intenta elegir mediante IA si no hay carta; también existen rutas SQL de selección. | Un único coordinador del servidor debe decidir y publicar la siguiente carta. Verificar todos los triggers desplegados antes de cambiarlo. |

## Tres capas de señales

### 1. Intención y límites

El nivel es una decisión conjunta y un límite de contenido. Opcionalmente, cada uno puede elegir una intención en un toque: reír, descubrirse, reconectar o coquetear. No se añade un cuestionario obligatorio. Las preferencias explícitas prevalecen sobre cualquier inferencia. Profundidad emocional e intensidad sensual son ejes independientes; «profundizar» no autoriza pasar al siguiente nivel ni sexualizar la sesión.

### 2. Microfeedback por persona

Tras una ronda, cada teléfono pregunta algo breve sobre la experiencia propia, con respuestas sin preselección y opción de omitir:

| Perspectiva | Pregunta | Respuestas candidatas | Uso |
| --- | --- | --- | --- |
| Oyente | «Al escucharte…» | Me sentí más cerca / Descubrí algo / Sentí deseo / Me incomodó | Selección de tema y tipo de siguiente carta; autorreporte, no verdad sobre la pareja. |
| Quien respondió, en puntos seleccionados | «Al compartir esto…» | Me sentí escuchado / Quería contar más / Prefería dejarlo ahí | Detectar experiencias diferentes sin asignar culpables. |
| Cada persona | «Para la próxima…» | Más suave / Así está bien / Profundizar | Control directo del ritmo. Disponible siempre; no debe esconderse detrás de una nota. |
| Al cierre, propuesta futura | «Un momento que quiero guardar» | Una carta elegida o un recuerdo escrito voluntariamente | Fuera de las rondas. Distinguir recuerdo privado de contenido autorizado para compartir. |
| Solo cuando aporte valor | «¿Qué creías que elegiría tu pareja?» | Una predicción sobre una carta de opciones | Comparar expectativa y respuesta real, con revelación voluntaria de ambos. Sin ranking de quién conoce mejor al otro. |

No pedir todas estas cosas después de cada carta. Probar un pulso corto por ronda y un cambio de perspectiva cada 2–3 rondas, comparándolo con una frecuencia menor en pruebas de uso. Estos intervalos son hipótesis de diseño, no frecuencias validadas. Eliminar la nota obligatoria de «honestidad»: podemos preguntar cómo se percibió una respuesta, no medir si una persona miente.

### 3. Señales de interacción

Guardar, con información y controles de privacidad claros: carta mostrada/revelada, pantalla visible y enfocada, respuesta finalizada, pausa/reanudación, pase, selección explícita de ritmo y desconexión. Separar tiempo de exposición, espera de compañero y formulario. Medir con reloj monotónico local y timestamps de recepción del servidor; no confiar en el reloj cliente como evidencia fuerte.

`active_visible_ms` significa exposición con pantalla visible/enfocada, no atención ni tiempo de habla. Un teléfono apoyado sobre la mesa puede seguir sumando tiempo; un teléfono bloqueado puede coexistir con una conversación excelente. El dato es débil y no determina interés, honestidad, deseo o malestar. Un pase sin motivo queda sin motivo. Pérdida de red nunca se interpreta como rechazo.

## El arco: estado de cada persona + recorrido compartido

Mantener por sesión tres registros distintos: perspectiva A, perspectiva B y decisiones compartidas. Nunca promediar un «quiero bajar» con un «quiero subir» hasta convertirlos en permiso.

El recorrido puede alternar apertura, descubrimiento, resonancia, juego/coqueteo y cierre. No es una escalera obligatoria: admite volver a lo ligero, quedarse en un tema o terminar. La etapa describe una decisión editorial, no un estado psicológico descubierto por la máquina.

Reglas concretas:

- Cualquier persona pide bajar → bajar esfuerzo/intensidad dentro del nivel permitido, o proponer un nivel inferior si no hay cartas adecuadas. No revelar quién lo pidió a partir de feedback privado.
- Ambas piden profundizar → proponer mayor profundidad dentro del nivel y límites vigentes; un nuevo nivel requiere confirmación de ambas.
- Una pide profundizar y otra mantener → mantener. Si falta una respuesta, no asumir acuerdo ni bloquear indefinidamente: ofrecer continuar al ritmo vigente con estado de sincronización claro.
- Malestar explícito → ofrecer pausa, pasar o cambiar; no intentar «resolver» a la persona con más preguntas sobre ese mismo tema.
- Descubrimiento positivo de ambas + ancla compartida → una continuación relacionada, seguida de variedad. Las palabras privadas no se reutilizan en una carta compartida.
- Tiempo largo sin feedback → conservar incertidumbre. Preguntar brevemente por ritmo si hace falta; no concluir «gran conexión».
- Repetidos pases → ofrecer otro tema; no insistir con sinónimos de la misma pregunta.
- Finalizar → escoger una carta de integración y producir un resumen solo con la evidencia disponible.

Ejemplo hipotético: ambos quieren reconectar. Tras una carta sobre recuerdos, A reporta cercanía y B descubrimiento. Ambos quieren seguir al mismo ritmo. Se ofrece otra pregunta de recuerdos con enfoque distinto. Más tarde B pide algo ligero: cambia a una carta lúdica, sin señalar a B. Si ambos autorizan profundizar después, vuelve a una conversación más personal. La historia registra elecciones, no inventa motivos.

## Arquitectura de inteligencia

1. **Metadatos editoriales:** cada carta tiene ID y versión, idiomas revisados, nivel, tema, profundidad emocional, intensidad sensual, esfuerzo, tipo de acción y continuaciones compatibles. Conservar el catálogo original; revisar sus traducciones y etiquetas antes de usarlo para adaptación.
2. **Registro de eventos:** session_id, round_id, event_id idempotente, actor autenticado, rol y destinatario cuando aplique, tipo, dato explícito o inferido, timestamps, duración y calidad de medición. El servidor asigna identidad; nunca aceptar actor arbitrario del cliente. Las notas son datos, no instrucciones para el modelo.
3. **Estado proyectado:** preferencias y límites de ambos, tema reciente, cartas usadas, feedback por perspectiva, incertidumbres, etapa editorial y versión de estado. Separar señales explícitas de inferencias; caducar señales viejas cuando el usuario cambia de preferencia.
4. **Política determinista:** antes de llamar al modelo, filtrar idioma/nivel/límites, no repetición, malestar, preferencias y permisos. El modelo no puede anular estos filtros ni reactivar un tema excluido.
5. **Selector IA:** recibe un resumen mínimo de sesión y candidatos válidos; devuelve ID, propósito editorial, evidencia usada, incertidumbre y alternativa. Validar la respuesta. A falta de servicio, seleccionar editorialmente entre los mismos candidatos válidos. La inferencia no interrumpe una carta ya mostrada.
6. **Publicación atómica:** un servidor reclama la decisión con round_id + state_version, valida otra vez los límites y guarda ID/texto/idioma/versión en una transacción. Ambos clientes reciben exactamente la misma carta. Un resultado tardío o de una versión vieja se descarta.
7. **Informe fundamentado:** construir hechos calculables primero; el modelo redacta únicamente a partir de ellos y de notas autorizadas. Cada afirmación lleva evidencia identificable. Verificar que citas, cantidades y actores coincidan antes de mostrarlo.

El prefetch puede producir candidatos mientras conversan, pero la decisión final se toma después del feedback y se revalida. No elegir definitivamente la siguiente carta antes de escuchar las señales que deberían determinarla.

## Insights que sí merecen compartirse

- «En estas dos cartas ambos indicaron sentirse más cerca.» Mostrar las cartas y la base de la afirmación.
- «La pregunta que ambos eligieron para recordar fue…» Solo si ambas selecciones existen.
- «En esta ronda tú descubriste algo y tu pareja indicó sentirse escuchada.» Solo si la política de compartición permite esa combinación.
- Un recuerdo compartido escrito por ellos y una propuesta pequeña para continuar fuera del juego.

No producir «98% compatibles», diagnósticos de apego, inferencias de fidelidad o veracidad, perfiles culturales inventados ni comparaciones con otras parejas sin datos adecuados. Una sola sesión describe esa sesión. Si solo hay señales de una persona, no hablar en nombre de ambas.

Privacidad por defecto: cada persona ve sus notas y reflexiones privadas; el informe compartido usa exclusivamente contenido autorizado. Una vista de «esto es lo que se compartirá» requiere acuerdo de ambos antes de generar enlace o enviar. Las notas no se convierten en memoria permanente automáticamente. Permitir borrar sesión y retirar memoria; no incluir texto íntimo en logs, analytics, URLs o notificaciones. No grabar voz como requisito del juego.

## Criterios de éxito y pruebas

- Primera carta accesible rápidamente después de conectar y elegir nivel; medir el tiempo real en pruebas, no prometer un número sin datos.
- El pulso opcional se resuelve normalmente en 1–2 elecciones; comprobar que no interrumpe la conversación. Medir abandono del formulario por separado de rechazo a una carta.
- Ambas personas sienten que pueden mantener, bajar o parar. No optimizar el sistema para maximizar duración, exposición íntima, puntuaciones o compras.
- Pruebas de selección con desacuerdo, feedback ausente, pausa, cambios de límite durante inferencia, idiomas, notas con instrucciones maliciosas, desconexiones, reintentos y respuestas del modelo fuera de catálogo.
- Dos clientes reales deben conservar la misma carta y avanzar una sola vez con envíos simultáneos. Tercer usuario no puede leer sesión ni feedback.
- El informe debe tolerar cero notas, datos escasos, contradicciones y una persona que no autoriza compartir.

## Carta física y feedback inmersivo — revisión de 26/10

La carta ocupa casi todo el teléfono con un pequeño margen que permite percibir bordes, grosor, capas y sombra. Conserva el rosa/lila y los acentos de cada nivel. Tiene esquinas redondeadas, bisel, textura sutil y luz; la profundidad se construye con CSS, sin sensores ni WebGL. La pregunta domina la cara principal. La marca grande aparece solo en la carta todavía sin revelar, no encima de cada pregunta.

«Ya respondimos» gira el mismo objeto hacia su reverso. Allí aparecen cuatro emojis con significado escrito: 🥰 más cerca, 🤩 sorpresa, 🔥 deseo y 😕 incomodidad. Debajo, un segundo gesto define el ritmo: 🌿 más suave, 👌 así está bien, ✨ profundizar. Nada viene seleccionado. Elegir de nuevo desmarca. Se puede continuar sin responder o volver a leer la pregunta sin perder las selecciones. La siguiente carta empieza sin feedback anterior. Las etiquetas son necesarias porque el significado de un emoji puede variar entre personas y plataformas.

Se elimina «Quiero recordar algo» del flujo. Era una nota de texto opcional, no una función de memoria automática. Si validamos un recuerdo al final, se llamará «Un momento que quiero guardar» y explicará qué se guarda y con quién. Durante la partida no debe abrir el teclado sin una razón clara.

El reverso no usa Dialog, backdrop ni bloqueo de scroll; sigue dentro de la carta. Solo la pausa explícita conserva un diálogo utilitario. El lado inactivo usa inert/aria-hidden, el foco pasa al contenido activo, los botones tienen nombre y estado accesible y reduced-motion elimina el giro. En pantallas bajas o con texto ampliado se permite scroll natural para no recortar controles.

## Benchmarking y oportunidad

Fuentes oficiales consultadas el 26/10/2026. Revisión de funcionalidades documentadas, no pruebas prácticas de los cuatro productos ni auditoría completa del mercado. Las oportunidades son propuestas propias.

| Referente | Funcionalidad documentada | Aprendizaje para GetClose |
| --- | --- | --- |
| [We’re Not Really Strangers — Couples](https://www.werenotreallystrangers.com/products/couples-edition) | Cartas físicas, tres niveles, preguntas y wildcards; ritmo flexible. | Cuidar el objeto, los turnos y la calidad editorial. La pregunta debe sostener el momento por sí sola. |
| [Paired — FAQ](https://www.paired.com/frequently-asked-questions) | Actividades breves diarias, personalización al empezar, responder para desbloquear la respuesta de la pareja. | Reciprocidad y revelación equilibrada; evitar que una persona condicione la respuesta inicial de la otra. |
| [Agapé — FAQ](https://www.getdailyagape.com/faq) | Declara personalización por machine learning y preguntas picantes opt-in; esta FAQ también describe su servicio SMS. | Personalizar preguntas ya existe; mantener el control explícito sobre contenido e intensidad. |
| [Couply — anuncio de AI coach](https://www.couply.io/post/ai-couples-relationship-coach) | Coach con IA personalizado a partir de cuestionarios, consejos e ideas de citas. | La IA conversacional tampoco es un diferencial suficiente por sí sola. |

Hipótesis de diferenciación: un mazo táctil compartido cuya secuencia se adapta ronda a ronda a la experiencia de ambos, con muy poco esfuerzo de pantalla y un recuerdo final fundamentado. No afirmar exclusividad ni superioridad hasta contrastar uso real y más alternativas.

El momento «wow» propuesto: ambos indican sorpresa positiva ante una carta de recuerdos, quieren mantener el ritmo y permiten reutilizar el tema. Aparece una continuación editorial que encaja con ese momento. Después, una persona pide suavizar y el mazo cambia a algo juguetón sin señalarla. Al cerrar, el juego recupera las cartas que ambos marcaron como cercanía, sin fingir conocer la conversación hablada.

Para no convertir cada ronda en un formulario, validar dos modos en pruebas con parejas: reverso opcional siempre disponible frente a pulsos intercalados con mayor frecuencia al inicio o tras cambios explícitos. La adaptación no puede depender de contestar todo. El objetivo es utilidad percibida por ambos y control del ritmo, no número de respuestas o minutos de pantalla.

## IA: datos, decisiones y memoria

**Recoger:** intención elegida, nivel acordado, temas excluidos, quién respondió/escuchó, feedback explícito de cada persona, pases sin atribuir motivo, cartas ya usadas y exposición activa separada de espera/formulario. Los emojis se guardan como categorías semánticas, no se someten a reconocimiento emocional. No hay grabación encubierta ni inferencia sobre el contenido hablado.

**Decidir:** mantener, suavizar, profundizar dentro del nivel, cambiar de tema o cerrar. Conservar dos perspectivas; nunca promediarlas para convertir un desacuerdo en permiso. No usar duración o 🔥 como consentimiento. En una ronda de escucha la pregunta puede ser «Al escucharte…»; para quien habló, «Al compartirlo…». La prueba actual usa una perspectiva genérica única porque no simula dos participantes.

**Recordar:** memoria de sesión por defecto. Entre sesiones, solo preferencias y recuerdos que la persona decida guardar, con controles de ver/borrar y alcance privado/compartido. La siguiente sesión consulta «¿Seguimos con este ritmo?» en lugar de tratar preferencias antiguas como permanentes. Separa memoria útil de historial bruto; no enviar toda la relación al modelo en cada carta.

**Aprender:** primero, reglas y ranking editorial con señales explícitas; después evaluar si un modelo mejora continuaciones, variedad y coherencia. No hace falta entrenar un modelo con datos íntimos para arrancar. El LLM ordena candidatos autorizados y redacta insights basados en hechos; el servidor mantiene límites, turnos, sincronización y selección final. Si falla, el juego continúa con el mismo catálogo elegible.

**Explicar al cierre:** hechos de la sesión, momentos elegidos y una propuesta para otra ocasión. Ejemplo condicionado a datos reales: «En dos cartas ambos marcaron “más cerca”». Sin una respuesta de ambos, no redactar conclusiones colectivas. Compartir requiere una vista previa y acuerdo sobre ese contenido. No presentar puntuaciones de compatibilidad, sinceridad o salud relacional.

## Alcance implementado

La previa aislada incorpora el objeto con profundidad, giro 3D al reverso y emojis sin popup. El reloj local mide exposición visible/enfocada de la pregunta revelada, excluyendo reverso, pausa y pérdida de foco. Las señales siguen en memoria de la pestaña, sin envío a IA, compañero o backend. La secuencia de muestra permanece fija; la interfaz lo explica en la entrada, pausa y reverso.

`supabase/functions/_shared/round-policy.ts` añade una base pura, todavía sin conexión al selector: cualquier solicitud de suavizar o incomodidad prevalece; profundizar requiere dos señales vigentes y distintas; mantiene límites de nivel/temas, evita repeticiones y pausa si se agotan candidatos válidos. Las pruebas cubren señales ausentes, desacuerdo, deseo sin permiso, datos viejos, terceros, duplicados y catálogo agotado. No implementa aún ranking, cambio temático por historial, memoria, sincronización o informes.

El evaluador online original permanece intacto. La corrección de unidades del prompt está en código, pendiente de despliegue de la función. Integrar el nuevo contrato en las salas, eliminar defaults de 3/5 sin romper reportes legacy, etiquetar el catálogo, validar entrada/identidad en servidor, crear la proyección, actualizar selección transaccional y generar informes verificables requieren migraciones y pruebas contra el Supabase original, todavía inaccesible en las conexiones disponibles.

## Dinámica principal: una pregunta, una respuesta, cambio de papeles

La dinámica por defecto conserva el juego de cartas original: en la primera carta P1 lee/pregunta y P2 responde; en la segunda P2 lee/pregunta y P1 responde. No obligar a ambos a contestar la misma pregunta ni introducir una pantalla de «cambio de turno». Se puede seguir conversando todo lo que quieran antes de marcar la respuesta como terminada. Un pase reemplaza la pregunta conservando los papeles; la persona no pierde su oportunidad de responder por no querer esa carta.

En los dos teléfonos conectados se muestra la misma carta. Una línea discreta identifica los papeles con los nombres elegidos: «Tú preguntas · Alex responde» / «Alex pregunta · Tú respondes». Quien responde marca «Terminé»; quien escucha puede seguir leyendo la carta, pedir pausa o pasar. No hace falta escribir o grabar la conversación presencial. Para distancia, el canal escrito es una opción independiente, no un requisito de todas las partidas.

Después, ambos pueden usar el reverso de su propio teléfono. El contexto cambia según el papel: «Al escucharte…» para quien preguntó y «Al compartirlo…» para quien respondió. Esa diferencia permite separar percepción del otro y experiencia de expresarse. Las respuestas son opcionales, sin defaults y sin revelar la elección privada de uno antes de la del otro. Mantener/bajar ritmo siempre accesible; validar con parejas si conviene solicitar el resto en cada ronda o solo en momentos seleccionados.

El servidor cierra la ronda cuando la respuesta terminó y cada participante envió u omitió su pulso. Si alguien se desconecta, conservar la carta y ofrecer reintento/pausa; no confundir falta de sincronización con una emoción ni inventar feedback. La IA evalúa ambos contextos para escoger entre cartas autorizadas y el servidor publica una sola siguiente carta, intercambiando los papeles exactamente una vez. Pausar, reconectar o repetir una petición no debe alterar el turno.

**Hallazgo del código original:** `Game.tsx` alterna `current_turn` al pasar de respuesta a evaluación y valida que el evaluador no sea quien respondió. Por tanto `current_turn` no identifica de forma estable al respondente durante toda la ronda. En la integración nueva deben persistir `asker_id`, `respondent_id` y `phase` por separado; los dos IDs permanecen inmutables hasta cerrar la ronda. No deducir a quién pertenecen las señales mirando únicamente el turno actual.

**Cambio implementado en la muestra local:** papeles visibles dentro de la carta, «Respuesta lista» en lugar de «Ya respondimos», reverso identificado con la persona que escuchó y su pregunta contextual, registro local de ambos papeles y perspectiva, alternancia al completar respuesta, conservación del turno al pasar. Solo representa el pulso del oyente en esta muestra; no simula dos teléfonos ni recopila una segunda respuesta inexistente. El doble pulso y la coordinación autoritativa del servidor siguen pendientes de integración.

## Variaciones ocasionales implementadas — 26/10, sesión de ocho cartas

La muestra editorial sigue conversación → adivina → conversación → coincidimos → conversación → acción compartida → conversación → cierre. Son ejemplos iniciales del mismo nivel o más suaves; no se generan preguntas explícitas ni se eleva automáticamente el nivel. El catálogo de variaciones se ampliará con metadatos y validación editorial. No confundir esta secuencia fija con adaptación por IA.

- **Adivina mi respuesta:** quien pregunta predice un plan; su elección sale de pantalla. Una cara de entrega pide pasar el teléfono, la otra persona elige, y ambos deciden revelar juntos. Se muestran predicción y respuesta sin puntuación de pareja.
- **Coincidimos:** elección múltiple individual con el mismo paso de entrega; el resultado solo muestra la intersección. Un resultado sin coincidencias propone conversar, sin etiquetar incompatibilidad. Las selecciones no compartidas no se copian al registro de rondas.
- **Quedarnos aquí:** continuación editorial opcional dentro de una conversación; se puede regresar a la pregunta original. No cambia turno, nivel ni contador; no pretende haber entendido lo hablado.
- **Acción compartida:** dejar el teléfono en la mesa y compartir un detalle apreciado del otro. Sin temporizador; se puede pasar.
- **Cierre:** seleccionar entre preguntas de conversación completadas, no las omitidas. Dos confirmaciones locales habilitan conservar el momento; cambiar la pregunta borra ambas confirmaciones. Cerrar sin guardar siempre está disponible. El recuerdo descarga solo la pregunta elegida en texto, sin respuestas, nombres, elecciones privadas o insights inventados.

La prueba usa un solo teléfono con entrega explícita, basada en la cooperación de ambos; no es un límite de seguridad entre usuarios. Las elecciones permanecen temporalmente en memoria de esa pestaña y desaparecen al recargar. La pantalla de entrega no monta en el DOM los controles ni textos de las elecciones privadas. Nunca publicar estos datos como payload de sala al integrar multiplayer.

`cardVariations.ts` contiene reglas sin dependencias del navegador: fases de elección, validación de opciones, intersección compartida y resultado semántico. `VariationCard.tsx` representa estas fases dentro de la misma carta, sin modales. Los resultados locales guardan el tipo, IDs de coincidencias y, en adivinanza, el acierto de esa predicción concreta. No equivalen a un perfil de compatibilidad ni a una emoción.

### Preparación para Supabase y una futura app móvil

Mantener UI y transporte separados. El servidor deberá autenticar actor y membresía, persistir la fase/version de ronda, recibir cada elección en una tabla privada con RLS y devolver a cada cliente solo su elección. Al revelar, una función transaccional calcula el resultado público permitido. Cada comando llevará event_id y expected_version; rechazar rondas cerradas, actores incorrectos, duplicados y resultados tardíos. Para coincidencias nunca difundir los conjuntos originales. En dos teléfonos se sustituye la entrega local por espera dentro de la carta, sin alterar las reglas del minijuego.

En acciones compartidas se preserva la rotación de papeles de la siguiente conversación, sin medir rendimiento del gesto. El servidor debe persistir quién pregunta/responde independientemente de la fase. Recuperar el snapshot al volver del segundo plano; Presence no es la fuente oficial de turnos. No almacenar secretos íntimos en analytics ni en notificaciones.

Las superficies conservan safe-area, controles táctiles de 44–48px o más, estado accesible de selección, foco en cambios de fase, layout flexible y movimiento reducido. No se usan hover obligatorio, gestos exclusivos, micrófono, sensores, pantalla completa obligatoria ni permisos de instalación. La descarga es una acción web; una app futura podrá sustituirla por la hoja nativa de compartir conservando el mismo contenido autorizado. Se necesita aún QA real en Safari/iOS y Android y sincronización con dos identidades antes de llamar a esto una app lista para producción.
