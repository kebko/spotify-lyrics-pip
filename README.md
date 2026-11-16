# Spotify Lyrics PiP

Extension Manifest V3 para **Chrome de escritorio 116 o posterior**. Copia
unicamente el texto que Spotify Web ya muestra en Letras. No modifica Spotify,
no consulta APIs, no descarga canciones ni busca letras en servicios externos.

## Instalacion

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona esta carpeta
   (`spotify-lyrics-pip`, la que contiene `manifest.json`).
4. Abre <https://open.spotify.com/> o recarga la pestaña si ya estaba abierta.
5. Reproduce una cancion.
6. Pulsa el boton verde **Letras PiP**, abajo a la derecha de Spotify.
   Activa Letras automaticamente si estaban desactivadas.
   Tambien puedes pulsar directamente el boton Letras de Spotify: al activarlo
   con un clic (o con el teclado), abre PiP.

### Actualizar a 1.0.17

Background incluye **Transparent** en ambos formularios. El contenido HTML
no pinta fondo y las letras conservan texto claro con sombra; los ajustes
mantienen fondo oscuro para ser legibles. La seleccion se guarda localmente.
Chrome puede componer la ventana PiP nativa sobre un fondo opaco: esta opcion
no garantiza ver el escritorio u otras aplicaciones detras, ni cambia el marco nativo.

Los botones conservan el entero solicitado mientras Chrome termina de
redimensionar la ventana, incluso con clics rapidos. No liberan la referencia
en el primer frame, que puede llegar antes del resize. Se normaliza el pequeño
error numerico del calculo CSS cerca de los enteros.

Font muestra el tamaño real del texto durante el resize (hasta dos decimales)
en ambos formularios y lo guarda al terminar. Los botones parten de ese tamaño
real, sin limite superior y con minimo de 1 px. Si hay decimales, el primer
clic de + sube al entero siguiente y - baja al anterior; despues avanza de 1 en 1.
Cerrar PiP inmediatamente despues de redimensionar tambien guarda el tamaño.
Font se actualiza incluso mientras Spotify espera la linea actual.
El rango anterior 8-24 px y la migracion de 28 a 24 px ya no se aplican.

Al reabrir PiP, la fuente se escala automaticamente a la altura restaurada
por Chrome usando la altura guardada junto con la fuente como referencia.
Con la misma altura conserva la fuente, sin aumentarla en cada reapertura.
Espera la lectura de ajustes antes de calcular la escala. No cambia
el tamaño restaurado de la ventana. Los botones siguen fijando un nuevo
tamaño de referencia al usarlos.

El resize manual vuelve a ampliar y reducir la fuente proporcionalmente.
Los botones fijan un nuevo tamaño de referencia y ajustan la ventana;
incluso si Chrome impone una altura minima, permiten elegir 8 o 9 px.
Desde esa altura de referencia, el resize escala el texto sin cortar filas.
Puede superar el valor elegido al ampliar manualmente.

La interfaz esta en ingles: **Lyrics PiP**, **Close PiP**, **Settings**, **Hide**,
**Lines**, **Font**, **Background**, **Dark**, **Light** y **Transparent**. Tambien los avisos y
etiquetas de accesibilidad. No traduce el texto de las canciones.

Los botones de fuente desactivados muestran cursor de no permitido, no de espera.
La fuente real respeta el tamaño elegido aunque Chrome impida reducir la ventana:
8, 9 y 10 px son tamaños distintos. Se reduce si falta espacio para las filas.

Corrige la fila Fuente duplicada en Ajustes: se crea una sola vez por
formulario, tanto en Spotify como en PiP.

Sustituye el selector de tamaño por **- 18px +**, con pasos de **1 px**,
minimo de **1 px** y sin limite superior. Ambos formularios guardan y comparten el valor. Al pulsar un
boton se solicita una altura acorde a las filas y la fuente, conservando
el ancho de PiP. Requiere Chrome 121 o posterior para redimensionar por codigo.
Chrome puede imponer un minimo de ventana, pero eso no aumenta la fuente elegida.
Se muestran los valores decimales obtenidos al redimensionar; los botones los llevan a enteros.

Activar Letras con el boton de Spotify abre PiP usando ese mismo gesto del
usuario. No requiere otro clic en Letras PiP. Se mantiene el cierre automatico
al desactivar Letras. No intercepta ni cancela la accion original de Spotify.
Los cambios programaticos sin gesto del usuario y las Letras ya activadas al
cargar la pagina no abren PiP: Chrome exige activacion del usuario.

Desactivar Letras desde el boton de Spotify cierra PiP automaticamente sin
volver a pulsar ese boton. Detecta tambien la sustitucion del boton por otro
con estado desactivado. No interpreta un boton ausente como desactivado,
ni cierra PiP mientras esta activando Letras. Si la activacion falla y
Spotify confirma estado desactivado, cierra PiP y conserva el aviso de error.

**Letras PiP** activa Letras si hace falta, una vez abierta la ventana.
**Cerrar PiP** cierra la ventana y desactiva Letras, incluso si las habias
activado manualmente. Comprueba `aria-pressed` o `data-active` del boton
`data-testid="lyrics-button"` antes de pulsarlo y confirma el cambio.
Si el boton no esta disponible o Spotify no responde, muestra un error.
Si falla la apertura de PiP, no cambia Letras. La X nativa solo cierra PiP
y no modifica Letras.

Desde 1.0.3, la fuente crece o disminuye automaticamente con la altura de PiP para que
quepan todas las filas completas, tambien al cambiar el numero de lineas.
No bloquea el borde nativo de Chrome. **Fuente** determina la altura inicial
solicitada; los botones tambien ajustan la altura con PiP abierto.
Chrome puede reutilizar el tamaño anterior, en cuyo caso la fuente se adapta
a ese tamaño.

La version 1.0.2 reduce los margenes interiores de PiP a **4 px arriba/abajo y 6 px a los lados**
y solicita una altura inicial ajustada a las filas. Chrome puede imponer un
tamaño minimo o reutilizar el tamaño anterior: reduce manualmente la altura
si la ventana sigue siendo grande. El marco y la barra de titulo nativos no
se pueden reducir desde la extension.

La version 1.0.1 corrige el aviso permanente "Esperando la linea actual" en el diseño
`data-testid="lyrics-line"` observado en Spotify. La linea actual usa la clase
`xp5WpqjB3u9hFHWKn2aE`; las lineas pasadas y futuras tienen clases distintas.
La correccion se comprueba con esa estructura y texto sintetico.

Si usas esta carpeta directamente, pulsa **Recargar** en la tarjeta de la
extension en `chrome://extensions` y despues **recarga la pestaña de Spotify**.
Si instalaste una copia extraida del ZIP, sustituye sus archivos por los nuevos
antes de recargar. Cierra y vuelve a abrir PiP.

La ventana flotante permanece encima de otras aplicaciones. Puedes moverla y
cambiar su tamaño con los controles nativos de Chrome. Spotify debe permanecer
abierto y con Letras activadas, aunque puedes cambiar de pestaña o aplicacion.
Chrome requiere un clic dentro de Spotify para abrir PiP: no es posible abrirla
automaticamente solo al activar Letras.

## Ajustes

- **3 lineas** por defecto: anterior, actual **en negrita**, siguiente.
- Se pueden seleccionar **1, 3, 5 o 7 lineas**, fuente desde **1 px** y fondo
  oscuro, claro o transparente (contenido HTML). Los ajustes se guardan localmente y se comparten entre pestañas.
- Al redimensionar verticalmente, la fuente se ajusta automaticamente sin un
  limite fijo de 8 a 24 px. Una ventana muy baja puede producir texto pequeño.
- Usa **Ajustes** en Spotify o en la propia ventana PiP (aparece al pasar el
  cursor o enfocar el boton con Tab).
- La ventana solo muestra letras; no incluye portada ni controles de reproduccion.
  Una linea larga se recorta con puntos suspensivos para mantener el numero de
  filas: aumenta el ancho o reduce la altura (y con ello la fuente) para verla completa.
- Al principio y al final se reservan filas vacias para mantener centrada la
  linea actual.
- **Ocultar** oculta el control de Spotify, no cierra PiP. El icono de la extension
  vuelve a mostrar el control. **Cerrar PiP** o la X nativa cierra la ventana.

## Limitaciones y privacidad

- Necesita letras **sincronizadas** disponibles para tu cancion/cuenta/region.
  No calcula tiempos ni inventa una linea actual si Spotify no la señala.
- Al desactivar Letras, cambiar a una cancion sin letras o retirar el panel,
  muestra un aviso en lugar de conservar texto anterior.
- Lee los selectores del DOM de Spotify (`lyrics-lyricsContent-text`,
  `lyrics-line`, `fullscreen-lyric`, estados `active` / `highlight`, clases
  activas conocidas de ambos diseños y atributos semanticos cuando estan disponibles).
  Si Spotify cambia su interfaz, puede ser necesario adaptar `lyrics.js`.
- PiP depende de la API Document Picture-in-Picture, no de una ventana emergente
  normal. Chrome determina el tamaño minimo y puede cerrar PiP si se cierra o
  recarga la pestaña de origen. Solo permite una ventana Document PiP a la vez.
- La sincronizacion sigue las actualizaciones reales del DOM, tambien al pausar,
  avanzar o retroceder. Si Spotify deja de actualizar las letras al estar en
  segundo plano, la extension no puede reconstruirlas por su cuenta.
- Solo solicita `storage` y se ejecuta en `https://open.spotify.com/*`.
  Las letras no se guardan ni se transmiten por la red.
- No es una extension oficial ni esta afiliada a Spotify.

## Comprobaciones locales

Abre `tests/index.html` en un navegador. Usa textos sinteticos, no letras de
canciones, y comprueba seleccion, cambios del DOM, ajustes y ciclo de vida
con una API PiP simulada. Estas pruebas no sustituyen la comprobacion manual
con una sesion de Spotify y PiP real.

Abre `tests/native.html` y pulsa **Letras PiP** para comprobar la API PiP nativa
con texto sintetico, sin iniciar sesion en Spotify. Solo simula almacenamiento.
Usa Chrome de escritorio, no el navegador integrado de VS Code: este puede
exponer la API pero rechazar la apertura de la ventana nativa.

Para comprobar el flujo real: abre PiP con Letras activadas, pausa y reanuda,
salta a otra posicion, cambia de cancion, desactiva/reactiva Letras, cambia
los ajustes y cierra/reabre PiP. Comprueba tambien el cambio de aplicacion.
