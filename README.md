# EventFlow AI · Riesgos y calidad

Microweb para gestionar riesgos y pruebas de aceptación del piloto de EventFlow AI. Incluye 14 riesgos precargados, una matriz interactiva de probabilidad e impacto, 9 pruebas y exportación a CSV. Los cambios se guardan en el navegador de cada persona.

## Abrir y editar

Abre `index.html` en Chrome o Firefox. Edita `index.html` para cambiar el contenido, `style.css` para el diseño y `app.js` para la lógica y los datos iniciales.

## Publicar desde tu cuenta de GitHub

1. En https://github.com/new, crea un repositorio público llamado `eventflow-riesgos-calidad`.
2. Usa **Add file → Upload files** y sube `index.html`, `style.css`, `app.js` y `README.md` directamente en la raíz. Incluye `.nojekyll` si está visible. Confirma en `main`.
3. Abre **Settings → Pages**. En **Source**, selecciona **Deploy from a branch**. Elige `main` y `/(root)`, y guarda.
4. Cuando termine el despliegue, copia el enlace de **Settings → Pages** para tu entrega.

## Demostración

1. Selecciona la celda de probabilidad 4 e impacto 5 para ver los riesgos críticos de esa combinación.
2. Edita un riesgo, cambia su responsable o su estado y guarda.
3. Abre **Control de calidad**, evalúa una prueba, registra evidencia y guarda.
4. Pulsa **Exportar CSV** para descargar la matriz y las pruebas.
