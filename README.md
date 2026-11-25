# Lector de ruso

Pega un texto en ruso y pulsa **Leer texto**. El original queda visible debajo del editor. Haz clic en una palabra para repetirla, o selecciona un fragmento y pulsa **Leer selección**. Puedes recorrer las palabras con las flechas del teclado y reproducir la que tiene el foco con Intro o Espacio.

**Leer el poema** abre y reproduce «Мы пьём из чаши бытия» con tres estilos de lectura. Aleksandr HQ ajusta la velocidad, la altura de la voz y el volumen para pasar de la nostalgia a la reflexión y cerrar con más intensidad.

Los controles **Velocidad** y **Tono** se aplican al iniciar una lectura, incluso al repetir una palabra o selección. En el poema, se combinan con los ajustes de cada estrofa. Usa comas y puntos para marcar pausas y signos de interrogación para indicar preguntas.

## Ejecutar con Docker

Desde la raíz del repositorio:

```sh
docker build -t lector-ruso .
docker run --rm -p 127.0.0.1:8000:8000 lector-ruso
```

Abre [http://localhost:8000](http://localhost:8000). La primera compilación descarga RHVoice, los datos del ruso y la voz Aleksandr HQ. El servidor genera el audio en el equipo donde se ejecuta.

Si ya tienes Python 3 y los datos de ruso y Aleksandr HQ instalados para `RHVoice-test`, también puedes ejecutar `python3 server.py`.

## Voz

[Aleksandr HQ](https://github.com/RHVoice/aleksandr-hq-rus) es una voz de [RHVoice Lab](https://rhvoice.su/voices/) basada en grabaciones del locutor y narrador Aleksander Karlov. La voz se distribuye bajo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). El motor [RHVoice](https://github.com/RHVoice/RHVoice) se distribuye bajo [GPL v2](https://github.com/RHVoice/RHVoice/blob/master/LICENSE.md).
