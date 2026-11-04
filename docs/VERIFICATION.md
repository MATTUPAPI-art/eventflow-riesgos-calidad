# Verificación realizada · 4 de noviembre de 2026

Entorno: Windows, Node 24.20.0, Chrome Headless 155, Playwright Core 1.64.1, axe y Lighthouse 13.6.0. Servidor HTTP local en `127.0.0.1:4173`; datos y nombres ficticios, sin servicios externos. Rama `mejoras-v2`. No se modificó ni publicó `main`.

## Pruebas de lógica

`npm test`: **14 aprobadas, 0 fallidas** mediante `node:test`, sin instalar dependencias para esta suite. Incluye los 25 productos P×I y umbrales, desempates, migración v1/v2, validación de IDs/rangos/estados/fechas/referencias, reglas para responsables y evidencia, generación de IDs sin reutilización, historial, respaldo por revisión/antigüedad, almacenamiento y fallos de cuota, contrato Firestore simulado, CSV en ambos separadores, comillas/saltos/fórmulas, entradas malformadas, contadores restaurados y validez/cobertura de todos los ejemplos.

## Navegador real automatizado

`npm run test:browser`: **12 grupos de flujos aprobados**. El script conserva su resultado en `artifacts/browser-results.json`:

1. Carga de 22 riesgos, 22 pruebas, 50 celdas y 7 indicadores; reducción inicial 0 %.
2. Búsqueda, filtros, chips, matrices inherente/residual y orden por columna.
3. Validación en línea de persona/fecha; edición, historial, persistencia al recargar y devolución de foco.
4. Alta de riesgo, Ctrl+Enter, texto HTML escapado, foco atrapado, Escape y cierre sin submit; cancelar/confirmar borrado y comprobar que no reaparece tras recargar.
5. Vínculos riesgo/prueba, evidencia obligatoria fechada y estados Aprobada/Fallida con actualización del tablero.
6. Alta/borrado de prueba y selección de vínculos.
7. Descarga real de CSV con coma y punto y coma; importación sin cambios, rechazo de archivo malformado, vista previa sin modificar datos y aplicación posterior.
8. Dos pestañas: sincronización y bloqueo de escritura sobre cambios externos mientras un editor conserva texto pendiente.
9. Restablecimiento cancelado/confirmado; eliminación de vínculos y registro de ese cambio al borrar un riesgo.
10. Anchos de 320, 390, 768 y 1440 px sin desbordamiento horizontal. axe sin infracciones detectadas en Riesgos y Calidad para claro/oscuro en móvil y en el diálogo de nueva prueba. PDF generado con ambas secciones visibles.
11. JSON corrupto conservado; descarga del original intacto; recuperación confirmada y carga de la interfaz cuando localStorage está bloqueado.
12. Migración v1 en navegador sin inventar personas; fallo de cuota simulado con aviso y conservación de cambios en memoria.

La automatización no observó errores JavaScript ni solicitudes a dominios externos en el contexto principal. Se inspeccionaron visualmente la captura de escritorio, la vista móvil clara, la imagen social y la previsualización de impresión. La versión original también se abrió antes de sustituirla: 14 riesgos, 9 pruebas y 25 celdas; se verificó abrir/cerrar editor y cambiar a Calidad. `#remove` y `#close` ya eran botones de tipo button.

## Lighthouse móvil

Última medición: **4 de noviembre de 2026, 18:17, America/La_Paz** (22:17 UTC), Lighthouse 13.6.0, perfil móvil y throttling predeterminados, sin ejecutar la suite del navegador simultáneamente.

| Categoría | Resultado |
| --- | ---: |
| Rendimiento | **99** |
| Accesibilidad | **100** |
| Buenas prácticas | **100** |

FCP 1,2 s; LCP 1,2 s; CLS 0; TBT 100 ms. HTML y JSON completos en `artifacts/lighthouse.html` y `artifacts/lighthouse.json`. `npm run audit:lighthouse` falla si cualquiera de las tres categorías no supera 90.

La primera medición dio 79/100/100 por CLS 0,536 al insertar indicadores. Se corrigió reservando su espacio desde el HTML. Una medición posterior dio 100/100/100 y la última dio 99/100/100. Se informa la última, sin seleccionar el mejor resultado. Los valores dependen de la máquina, el servidor y la carga; no representan una medición del sitio público después del merge.

## Otros controles

- `node --check app.js` y `git diff --check` sin errores.
- Búsqueda de patrones habituales de claves privadas y tokens en las fuentes: sin coincidencias; dependencias y artefactos excluidos.
- About configurado en el fork autorizado. El original es de solo lectura para la sesión; `docs/ABOUT.md` contiene descripción, URL y topics para el propietario.
- Captura del README e imagen social creadas desde contenido ficticio mediante Chrome/HTML/CSS, sin fotos ni datos personales reales.
- Workflow `Tests` ejecuta la suite de lógica en cada push/PR. Su resultado remoto se consulta después de subir la rama.

## Lo que no se verificó

- Sistemas reales de EventFlow, integración web/móvil/Firebase, reglas en Emulator Suite, IA, pagos, QR, red o energía del recinto. Las 22 pruebas del tablero son criterios pendientes de ejecutar, no resultados acreditados por esta suite.
- Funcionamiento del adaptador con una instancia real de Firestore; solo contrato con SDK simulado. Las reglas son un ejemplo básico privado y necesitan ampliación para producción.
- Excel de escritorio en español y vista previa de WhatsApp. Se comprobó el contenido CSV y sus descargas, no esas aplicaciones.
- Dispositivos móviles físicos, Safari/Firefox, lector de pantalla manual y auditoría integral de conformidad WCAG. axe y Lighthouse no sustituyen esas comprobaciones.
- Presentación de cada página del PDF en un lector independiente: se comprobó generación y visibilidad de ambas secciones, y se inspeccionó la previsualización CSS de impresión.
- Despliegue v2 en GitHub Pages: se mantiene pendiente del merge autorizado. No hay garantías de transacción para escrituras exactamente simultáneas entre pestañas.

Decisiones ya resueltas: crear fork para entregar; no añadir LICENSE por ahora. Decisiones de operación pendientes: aprobar integración a main, revisar responsables/fechas reales y decidir si se activará almacenamiento remoto.
