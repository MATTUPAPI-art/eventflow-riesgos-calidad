# Contribuir

1. Trabaja en una rama; `main` publica GitHub Pages y solo se integra con autorización del propietario.
2. Usa Node 22 o superior. Ejecuta `npm ci`, `npm test` y `npm start`.
3. Mantén HTML, CSS y módulos ES estáticos, sin dependencias de ejecución innecesarias. Los scripts de QA son dependencias de desarrollo.
4. Añade pruebas de lógica cuando cambies el esquema, validación, CSV o IDs. Las migraciones deben conservar el contenido del usuario.
5. Para cambios de interfaz, ejecuta `npm run test:browser` con Chrome instalado; revisa teclado, móvil, ambos temas e impresión. Ejecuta `npm run audit:lighthouse` sin otro proceso de QA activo.
6. Usa commits pequeños con `feat:`, `fix:`, `docs:`, `style:`, `refactor:` o `test:`. Describe qué verificaste y sus límites en la propuesta de cambios.
7. Solo datos ficticios en ejemplos, capturas y pruebas. No incluyas claves, archivos de configuración locales, listas de invitados ni evidencia real en el repositorio.

No se ha seleccionado licencia. No se concede una licencia de uso adicional mediante esta guía.
