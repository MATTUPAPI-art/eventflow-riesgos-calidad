# Cambios

## 2.0.0 · 2026-11-04 · Rama mejoras-v2

- Auditoría del historial y eliminación de la carpeta duplicada tras comprobar igualdad de los cuatro archivos.
- Modelo de esquema 2, migración desde v1, validación, historial y contadores de ID.
- Interfaz getState/saveState con localStorage; adaptador Firestore opcional e inactivo y reglas de ejemplo.
- Restablecimiento confirmado; CSV con BOM, dos secciones, delimitador configurable y vista previa de importación. Se conserva protección ante fórmulas.
- Sincronización entre pestañas, protección de ediciones abiertas y aviso de respaldo por antigüedad o cambios.
- 22 escenarios ficticios y 22 pruebas con metas medibles; roles y personas separados, fechas, contingencia y exposición residual.
- Resumen ejecutivo, matrices comparativas, filtros y ordenación, tarjetas móviles y tablero de calidad.
- Temas según sistema, teclado, errores en línea, foco, impresión, favicon e imagen social.
- Pruebas node:test, automatización de navegador, accesibilidad con axe, Lighthouse móvil y CI en push/PR.

## Pendientes de operación

- Revisar los escenarios y sustituir los responsables ficticios por responsables reales en el navegador de operación.
- Ejecutar las pruebas de aceptación del producto EventFlow con Firebase, IA, dispositivos y recinto reales. Esta microweb solo registra resultados.
- Si se decide activar Firestore: seleccionar proyecto, autenticación y modelo de colaboración; extender y probar reglas con Emulator Suite antes de conectar datos. Actualmente solo se prueba el contrato del adaptador con SDK simulado.
- Consultar normativa local aplicable a datos de menores y consentimiento con asesoría competente.
- Validar manualmente con lector de pantalla, dispositivos físicos y Excel en español; inspeccionar la vista previa del enlace en WhatsApp después del despliegue.
- Integración a `main` y despliegue pendientes de autorización del propietario. No se ha elegido licencia, por decisión del usuario.

El detalle reproducible de verificación se conserva en `docs/VERIFICATION.md`.
