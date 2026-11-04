import { recordDefaults, SCHEMA_VERSION } from './model.js';
// Fictional pilot scenarios; these are estimates, not findings about production.
const risks = [
  ['Medidas imprecisas a partir de fotos','IA y montaje','Producto',3,3,'Especialista de plano','El mobiliario no cabe y exige rehacer parte del montaje.','Medir salón y muebles; contrastar escala y permitir corrección manual.','Usar plano medido y aprobado sin IA.'],
  ['Salidas o pasillos obstruidos','Seguridad física','Seguridad',3,5,'Responsable del recinto','El montaje dificulta evacuación o acceso.','Marcar zonas restringidas y aprobar circulación antes de montar.','Detener el montaje y despejar rutas con el recinto.'],
  ['Acceso indebido a otro evento','Seguridad digital','Seguridad',4,5,'Desarrollador de seguridad','Una cuenta lee o altera datos de otro evento.','Aplicar permisos por rol y evento; probar reglas con Firebase Emulator Suite.','Revocar sesiones y aislar el evento afectado.'],
  ['Exposición de fotos y listas privadas','Privacidad','Privacidad',3,5,'Responsable de privacidad','Se divulgan datos o imágenes de invitados.','Minimizar datos, restringir URLs y definir retención y eliminación.','Suspender enlaces, revocar accesos y activar protocolo de incidentes.'],
  ['Conectividad inestable en el recinto','Operación móvil','Operación',5,3,'Coordinador de check-in','Datos móviles intermitentes dejan al equipo sin registro actualizado.','Precargar listas, persistir cola offline y ensayar reconexión.','Usar lista mínima local y conciliar al recuperar red.'],
  ['Registro duplicado de invitados','Check-in','Operación',3,4,'Desarrollador de check-in','Dos celulares aceptan la misma invitación y alteran aforo.','Usar ID único e idempotencia; resolver conflictos al sincronizar.','Validar lista y conciliar registros con un supervisor.'],
  ['Errores de escaneo de inventario','Inventario','Operación',3,2,'Encargado de inventario','Un movimiento incorrecto provoca diferencias de saldo.','Identificar entrega y devolución; exigir confirmación y permitir código manual.','Detener movimientos y realizar conteo físico.'],
  ['Plano desactualizado en el móvil','Montaje','Producto',2,2,'Coordinador de montaje','El equipo coloca muebles según una versión anterior.','Mostrar versión y fecha; notificar y confirmar el plano aprobado.','Distribuir copia numerada del último plano aprobado.'],
  ['Asignación inadecuada de invitados','IA y montaje','Producto',3,3,'Organizador de sala','Se separan familias o se asignan lugares poco accesibles.','Fijar grupos, cupos y accesibilidad; revisar y permitir ajustes.','Reasignar manualmente con el organizador.'],
  ['IA lenta o no disponible','IA y montaje','Tecnología',4,2,'Desarrollador de IA','Un ajuste tarda y retrasa una tarea del montaje.','Definir timeout, conservar versión aprobada y habilitar edición manual.','Continuar con el plano aprobado sin esperar a la IA.'],
  ['Saturación durante la llegada','Check-in','Operación',4,4,'Coordinador de accesos','Colas extensas afectan el ingreso esencial al evento.','Medir hora pico con celulares de gama baja y datos móviles.','Abrir un punto adicional con lista precargada.'],
  ['Panel local con datos de ejemplo','Integración','Tecnología',5,2,'Desarrollador web','El escenario demo no acredita integración real web, base de datos y móvil.','Identificar modo demo y verificar un flujo completo en entorno de prueba.','Presentar alcance local y aplazar decisiones que dependan de datos reales.'],
  ['Alcance del piloto sin acotar (escenario)','Proyecto','Proyecto',5,3,'Líder de producto','Un alcance amplio deja incompletos los flujos esenciales.','Acordar un recinto y criterios de salida para check-in, inventario y plano.','Recortar funciones secundarias con aprobación del equipo.'],
  ['Falla de un celular o de su cámara','Operación móvil','Tecnología',4,1,'Soporte de campo','Un operador cambia a búsqueda manual o equipo de reserva.','Ensayar sin cámara en equipos de gama baja y preparar un celular.','Cambiar al equipo de reserva y recuperar la cola persistida.'],
  ['Pérdida o robo de celular con listas','Operación móvil','Privacidad',2,5,'Responsable de dispositivos','Un tercero accede a listas guardadas en un dispositivo extraviado.','Bloqueo de pantalla, mínimo dato offline y revocación remota de sesiones.','Revocar acceso, bloquear dispositivo y evaluar exposición.'],
  ['Personal saliente conserva acceso','Seguridad digital','Seguridad',3,4,'Administrador de accesos','Una persona que deja el equipo mantiene permisos de eventos.','Lista de bajas con revocación de roles y sesiones antes de la salida.','Revocar sesiones y revisar operaciones recientes.'],
  ['QR o invitaciones falsificados o compartidos','Check-in','Seguridad',3,4,'Desarrollador de check-in','Ingresan personas con una copia o un QR manipulado.','Validar token en servidor, caducidad e idempotencia; nunca confiar solo en imagen.','Derivar invitaciones dudosas al organizador.'],
  ['Facturación inesperada de Firebase o IA','Infraestructura','Finanzas',3,3,'Responsable de costos','Uso repetido o abusivo supera el presupuesto del piloto.','Configurar alertas de presupuesto, cuotas y límites de solicitudes; las alertas no cortan gasto.','Desactivar función costosa y continuar con edición manual.'],
  ['Corte eléctrico o baterías agotadas','Recinto','Operación',4,4,'Coordinador técnico','Se detienen los puestos de ingreso durante la llegada.','Probar autonomía, cargar baterías y disponer de powerbanks y respaldo eléctrico.','Activar alimentación de reserva y lista mínima de contingencia.'],
  ['Base de datos sin respaldo recuperable','Infraestructura','Tecnología',2,5,'Administrador de datos','Una eliminación o corrupción pierde registros esenciales del evento.','Programar respaldos y ensayar restauración aislada con datos ficticios.','Restaurar última copia y conciliar movimientos posteriores.'],
  ['Dependencia de una persona clave','Proyecto','Proyecto',1,4,'Líder técnico','La ausencia de una persona bloquea una operación o recuperación.','Documentar runbooks y asignar suplente con acceso individual.','Activar suplente y procedimiento documentado.'],
  ['Datos de menores sin consentimiento registrado','Privacidad','Privacidad',2,5,'Responsable de privacidad','Se recopilan datos o imágenes de menores sin autorización adecuada.','Minimizar datos, registrar autorización y consultar normativa local aplicable con asesoría.','Suspender recopilación y gestionar eliminación o regularización.']
];
const checks = [
  ['Validar plano y circulación','IA y montaje','Comparar 10 medidas reales: error máximo de 5 cm en medidas críticas; 100 % de salidas y pasillos libres, con aprobación del recinto.',['R-01','R-02']],
  ['Aislar los datos por evento','Seguridad digital','Automatizar en Firebase Emulator Suite con dos cuentas: 0 lecturas o escrituras cruzadas permitidas y 100 % de operaciones autorizadas esperadas aceptadas.',['R-03']],
  ['Proteger fotos y listas privadas','Privacidad','Abrir URL directa de imagen en incógnito, además de usar cuenta sin permiso: 0 fotos o listas privadas accesibles en los 10 intentos.',['R-04']],
  ['Registrar sin internet y sincronizar','Operación móvil','En modo avión registrar 10 llegadas y 5 movimientos; cerrar y reabrir la app sin conexión. Conservar los 15 y sincronizar sin pérdidas ni duplicados en ≤60 s al reconectar.',['R-05']],
  ['Evitar doble registro','Check-in','Escanear 10 invitaciones desde dos celulares simultáneos: el conteo final aumenta exactamente 10, también tras reconexión.',['R-06']],
  ['Conciliar inventario','Inventario','Registrar 20 entregas y 10 devoluciones con escáner y código manual: diferencia final con conteo físico igual a 0.',['R-07']],
  ['Publicar un plano actualizado','Montaje','Publicar versión nueva: 2 celulares conectados muestran versión aprobada y aviso en ≤30 s; offline identifican explícitamente la versión guardada.',['R-08']],
  ['Verificar flujo web → móvil → reporte','Integración','Crear 3 eventos ficticios en entorno de prueba, registrar 5 llegadas por evento y reabrir sesiones: 15 registros persistidos y reporte exacto.',['R-12']],
  ['Ensayar hora pico','Check-in','Simular 30 llegadas con 2 celulares de gama baja y datos móviles: ≥27 registros en ≤5 s cada uno y 0 duplicados.',['R-11']],
  ['Validar asignación y accesibilidad','IA y montaje','Asignar 50 invitados ficticios en 10 grupos con 3 necesidades de acceso: 0 sobrecupos, 0 grupos separados y 100 % de accesos respetados tras edición.',['R-09']],
  ['Continuar ante caída de IA','IA y montaje','Simular timeout y error del proveedor: edición manual disponible en ≤15 s y última versión aprobada íntegra en 3 de 3 intentos.',['R-10']],
  ['Recuperar un puesto sin cámara','Operación móvil','Deshabilitar cámara en gama baja: registrar 5 invitados por búsqueda manual y cambiar a equipo de reserva en ≤2 min sin perder cola.',['R-14']],
  ['Revocar dispositivo perdido','Privacidad','Simular pérdida con cuenta de prueba: revocar sesión en ≤5 min, 0 consultas remotas posteriores; verificar bloqueo y política de borrado de caché local.',['R-15']],
  ['Revocar acceso de personal saliente','Seguridad digital','Dar de baja a 2 usuarios ficticios: 0 operaciones aceptadas con sus sesiones anteriores tras revocación y 100 % de roles eliminados.',['R-16']],
  ['Rechazar QR inválidos o compartidos','Check-in','Probar 5 tokens alterados, 5 caducados y 5 copias usadas: 0 aceptaciones indebidas; derivación visible en todos los casos.',['R-17']],
  ['Controlar consumo y alertas','Infraestructura','En entorno de prueba verificar límites de 10 solicitudes/minuto y alerta sintética al 50/80/100 % de presupuesto: 3 avisos recibidos; procedimiento de desactivación en ≤5 min.',['R-18']],
  ['Operar sin red eléctrica','Recinto','Desconectar alimentación durante 30 min: mantener 2 puestos con batería, 20 registros íntegros y conmutación de alimentación en ≤2 min.',['R-19']],
  ['Restaurar respaldo aislado','Infraestructura','Restaurar copia ficticia de 100 registros en entorno aislado en ≤30 min; 100 IDs y sus saldos coinciden con el origen.',['R-20']],
  ['Ejecutar runbook con suplente','Proyecto','El suplente ejecuta check-in y recuperación sin ayuda del titular en ≤20 min, con 0 pasos críticos omitidos.',['R-21']],
  ['Verificar consentimiento y retención','Privacidad','Usar 5 perfiles ficticios de menores: 0 datos o imágenes recopilados sin autorización registrada; comprobar eliminación de 5/5 al vencer retención y revisión local documentada.',['R-22']],
  ['Acordar alcance del piloto','Proyecto','Antes de iniciar, registrar aprobación del alcance por producto y operación: 3 flujos esenciales con responsable y criterio de salida; 0 funciones imprescindibles sin prioridad.',['R-13']],
  ['Conciliar pagos locales QR y transferencias','Pagos','Con 10 pagos ficticios por QR y 10 transferencias, incluidos 2 pendientes: 0 confirmaciones basadas solo en captura, 20 estados conciliados con referencia única.',['R-06','R-17']]
];
export function createExampleState(now = new Date()) {
  const date = now.toISOString();
  const due = new Date(now); due.setDate(due.getDate()+14);
  const review = new Date(now); review.setDate(review.getDate()+7);
  const names = ['Lucía Demo','Mateo Demo','Sofía Demo','Daniel Demo'];
  return {
    schemaVersion: SCHEMA_VERSION, revision: 1, exportedRevision: 0, lastExportAt: null, updatedAt: date,
    risksCounter: risks.length, checksCounter: checks.length,
    risks: risks.map(([title,area,category,p,i,role,consequence,action,contingency],n) => ({
      ...recordDefaults('risks'), id:`R-${String(n+1).padStart(2,'0')}`, title,area,category,p,i,residualP:p,residualI:i,
      role,owner:p*i>=10?names[n%names.length]:'',consequence,action,contingency,
      type:[11,12].includes(n)?'Problema actual':'Riesgo',dueDate:due.toISOString().slice(0,10),reviewDate:review.toISOString().slice(0,10),updatedAt:date
    })),
    checks: checks.map(([title,area,criteria,risks],n) => ({...recordDefaults('checks'),id:`Q-${String(n+1).padStart(2,'0')}`,title,area,criteria,risks,updatedAt:date}))
  };
}
