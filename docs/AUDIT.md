# Auditoría inicial · 4 de noviembre de 2026

Se leyeron index.html, style.css, app.js y README.md completos, sus copias anidadas y los dos commits del remoto (613972a y 0e9fb7d). No existía .gitignore. El directorio entregado carecía de .git: se recuperó el historial del remoto después de comparar el contenido local, equivalente salvo finales de línea y espacios finales. Rama de trabajo: mejoras-v2.

- La carpeta `eventflow-riesgos-calidad/` contiene copias idénticas, byte a byte, de los cuatro archivos de raíz del remoto. Es redundante: se propone y realiza su eliminación, conservando el historial Git.
- `#remove` y `#close` ya tienen `type="button"`. No corresponde atribuirles un submit accidental.
- El almacenamiento solo comprueba que existan arrays; no valida IDs, rangos, referencias ni estados. JSON corrupto se descarta silenciosamente. No hay esquema ni migración.
- El guardado informa de errores, pero no hay aviso persistente ni respaldo, importación, historial o sincronización entre pestañas.
- La salida HTML escapa texto y el CSV escapa comillas y neutraliza fórmulas: conservar ambas protecciones. No se observaron claves en los archivos revisados.
- El orden solo usa el producto P×I. Los datos concentran cuatro combinaciones y siete riesgos tienen puntaje 12. Los responsables son equipos, no personas.
- El diálogo usa el elemento nativo dialog y etiquetas; faltan errores en línea, fechas y visualización de cambios.
- La matriz carece de nombres accesibles con prioridad y lista de riesgos. Solo hay tema oscuro, tabla con scroll en móvil, sin impresión ni metadatos sociales.
- La aplicación no carga fuentes, imágenes ni dependencias externas: mantener este beneficio de rendimiento.
- No hay pruebas automatizadas, CI ni licencia.

## Límites iniciales

Esta auditoría de código no prueba los sistemas de EventFlow (Firebase, IA, móviles, QR, recinto). La revisión del navegador, accesibilidad y Lighthouse se documentará tras ejecutar las verificaciones. No hay permiso push/admin para la cuenta GitHub conectada; About y publicación no se pueden modificar con esa cuenta.
