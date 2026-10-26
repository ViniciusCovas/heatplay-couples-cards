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
| Opcional | «Quiero recordar…» | Hasta 140 caracteres | Ancla narrativa explícita. Distinguir recuerdo privado de contenido autorizado para compartir. |
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

## Alcance implementado en esta iteración

La prévia aislada muestra una carta que ocupa la pantalla, sin encabezado/footer de sitio, texto «carta de demostración» ni favorito ambiguo. «Ya respondimos» abre una propuesta de microfeedback opcional sin valores iniciales, con percepción, ritmo y nota. Pausa/opciones explica las limitaciones de la prueba. El reloj local registra únicamente exposición visible/enfocada de la carta revelada y se pausa en overlays y cambios de visibilidad/foco. Los datos quedan solo en memoria y se reinician al iniciar otra muestra; no se envían a IA, compañero o backend. La selección de muestras continúa siendo fija: esta iteración valida interacción, no simula adaptación IA ni una segunda persona.

El evaluador online original permanece intacto. La corrección de unidades del prompt está en código, pendiente de despliegue de la función. Integrar el nuevo contrato en las salas, eliminar defaults de 3/5 sin romper reportes legacy, crear la proyección de sesión, actualizar la selección transaccional y generar informes verificables requieren migraciones y pruebas contra el Supabase original, todavía inaccesible en las conexiones disponibles.
