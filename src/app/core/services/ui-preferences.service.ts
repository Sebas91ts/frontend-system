import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark';
export type LanguagePreference = 'es' | 'en' | 'pt';
export type TranslationKey =
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.open'
  | 'settings.close'
  | 'settings.theme'
  | 'settings.language'
  | 'settings.light'
  | 'settings.dark'
  | 'settings.preview'
  | 'common.yes'
  | 'common.no'
  | 'user.center'
  | 'user.greeting'
  | 'user.hero'
  | 'user.role'
  | 'user.area'
  | 'user.email'
  | 'user.sync'
  | 'user.loading'
  | 'user.workload'
  | 'user.mine'
  | 'user.areaTasks'
  | 'user.total'
  | 'user.priority'
  | 'user.recommendation'
  | 'user.logout'
  | 'user.refresh'
  | 'user.viewMine'
  | 'user.viewArea'
  | 'user.workloadAttentionTitle'
  | 'user.workloadHealthyTitle'
  | 'user.workloadEmptyTitle'
  | 'user.workloadAttentionDescription'
  | 'user.workloadHealthyDescription'
  | 'user.workloadEmptyDescription'
  | 'user.metricMineHint'
  | 'user.metricAreaHint'
  | 'user.metricTotalHint'
  | 'user.priorityTitle'
  | 'user.emptyTitle'
  | 'user.emptyDescription'
  | 'user.guidanceTitle'
  | 'user.guidanceStepOne'
  | 'user.guidanceStepTwo'
  | 'user.guidanceStepThree'
  | 'user.claimAvailable'
  | 'user.updating'
  | 'user.notUpdated'
  | 'user.unassignedArea'
  | 'admin.center'
  | 'admin.title'
  | 'admin.subtitle'
  | 'admin.openTasks'
  | 'admin.openInstances'
  | 'admin.openProcesses'
  | 'admin.manageUsers'
  | 'admin.manageAreas'
  | 'admin.role'
  | 'admin.loading'
  | 'admin.retry'
  | 'admin.trackingTitle'
  | 'admin.trackingSubtitle'
  | 'admin.instancesTitle'
  | 'admin.instancesSubtitle'
  | 'admin.completedByArea'
  | 'admin.completedByUser'
  | 'admin.recentTitle'
  | 'admin.recentSubtitle'
  | 'admin.seeTracking'
  | 'admin.todayInstances'
  | 'admin.noDate'
  | 'admin.unknownProcess'
  | 'admin.unknownUser'
  | 'admin.unspecifiedArea'
  | 'admin.noAreaData'
  | 'admin.noUserData'
  | 'admin.noRecentData'
  | 'tasks.inboxTitle'
  | 'tasks.inboxSubtitle'
  | 'tasks.back'
  | 'tasks.refresh'
  | 'tasks.loading'
  | 'tasks.myTasks'
  | 'tasks.areaTasks'
  | 'tasks.allTasks'
  | 'tasks.assigned'
  | 'tasks.pending'
  | 'tasks.available'
  | 'tasks.process'
  | 'tasks.created'
  | 'tasks.reference'
  | 'tasks.assignment'
  | 'tasks.area'
  | 'tasks.noTasks'
  | 'tasks.noMine'
  | 'tasks.noArea'
  | 'tasks.noAll'
  | 'tasks.quickWork'
  | 'tasks.close'
  | 'tasks.loadingTask'
  | 'tasks.assignedTo'
  | 'tasks.formTitle'
  | 'tasks.noForm'
  | 'tasks.submit'
  | 'tasks.saving'
  | 'tasks.directWork'
  | 'tasks.takeTask'
  | 'tasks.missingField'
  | 'tasks.realtime'
  | 'tasks.initialLoading'
  | 'tasks.instanceReference'
  | 'tasks.assignedLabel'
  | 'tasks.availableLabel'
  | 'tasks.workingNow'
  | 'tasks.takeHint'
  | 'tasks.takenBy'
  | 'tasks.areaUnknown'
  | 'tasks.processUnknown'
  | 'tasks.instanceUnknown'
  | 'tasks.noProcess'
  | 'tasks.noAssignment'
  | 'tasks.allCamunda'
  | 'tasks.mineCount'
  | 'tasks.areaCount'
  | 'tasks.allCount'
  | 'tasks.taskTitle'
  | 'tasks.selectOption'
  | 'tasks.checkboxHint'
  | 'tasks.fileSelected'
  | 'tasks.fileValidation'
  | 'tasks.fileLimit'
  | 'tasks.uploadPending'
  | 'tasks.formRequired'
  | 'tasks.quickCompleteSuccess'
  | 'tasks.quickCompleteError'
  | 'tasks.quickOpenError'
  | 'tasks.loadSuccess'
  | 'tasks.loadError'
  | 'tracking.title'
  | 'tracking.subtitle'
  | 'tracking.back'
  | 'tracking.refresh'
  | 'tracking.loading'
  | 'tracking.sync'
  | 'tracking.lastUpdate'
  | 'tracking.initialSync'
  | 'tracking.process'
  | 'tracking.instance'
  | 'tracking.currentState'
  | 'tracking.activeTasks'
  | 'tracking.completedTasks'
  | 'tracking.pendingTasks'
  | 'tracking.timeline'
  | 'tracking.viewer'
  | 'tracking.viewerHint'
  | 'tracking.summary'
  | 'tracking.processUnknown'
  | 'tracking.instanceUnknown'
  | 'tracking.noTracking'
  | 'tracking.activeState'
  | 'tracking.finishedState'
  | 'tracking.noData'
  | 'taskDetail.title'
  | 'taskDetail.subtitle'
  | 'taskDetail.back'
  | 'taskDetail.viewTracking'
  | 'taskDetail.showTechnical'
  | 'taskDetail.hideTechnical'
  | 'taskDetail.loading'
  | 'taskDetail.loadingForm'
  | 'taskDetail.loadingHistory'
  | 'taskDetail.name'
  | 'taskDetail.process'
  | 'taskDetail.area'
  | 'taskDetail.assignedTo'
  | 'taskDetail.state'
  | 'taskDetail.created'
  | 'taskDetail.tracking'
  | 'taskDetail.technicalProcess'
  | 'taskDetail.technicalInstance'
  | 'taskDetail.taskKey'
  | 'taskDetail.form'
  | 'taskDetail.noForm'
  | 'taskDetail.selectOption'
  | 'taskDetail.checkboxHint'
  | 'taskDetail.fileValidation'
  | 'taskDetail.fileSelected'
  | 'taskDetail.fileUploaded'
  | 'taskDetail.view'
  | 'taskDetail.required'
  | 'taskDetail.history'
  | 'taskDetail.historyCount'
  | 'taskDetail.noHistory'
  | 'taskDetail.historyEmpty'
  | 'taskDetail.noDetail'
  | 'taskDetail.noId'
  | 'taskDetail.noDate'
  | 'taskDetail.noProcess'
  | 'taskDetail.noInstance'
  | 'taskDetail.noArea'
  | 'taskDetail.noAssignment'
  | 'taskDetail.actionSend'
  | 'taskDetail.actionSending'
  | 'taskDetail.actionLabel'
  | 'taskDetail.waitTake'
  | 'taskDetail.takenBy'
  | 'taskDetail.completeHint'
  | 'taskDetail.completeSuccess'
  | 'taskDetail.completeError'
  | 'taskDetail.loadTooLong'
  | 'taskDetail.loadError'
  | 'taskDetail.formMissing'
  | 'taskDetail.historyMissing'
  | 'taskDetail.fileTooLarge'
  | 'taskDetail.fileAttached'
  | 'taskDetail.noTaskName'
  | 'taskDetail.noUser'
  | 'taskDetail.noProcessLabel'
  | 'taskDetail.fieldUnnamed'
  | 'taskDetail.instancePrefix'
  | 'processes.families'
  | 'processes.subtitle'
  | 'processes.pageSubtitle'
  | 'processes.loading'
  | 'processes.empty'
  | 'processes.back'
  | 'processes.pageTitle'
  | 'processes.create'
  | 'processes.refresh'
  | 'processes.familyBack'
  | 'processes.familyTitle'
  | 'processes.familySubtitle'
  | 'processes.familyMissing'
  | 'processes.familyEmpty'
  | 'processes.searchLabel'
  | 'processes.searchPlaceholder'
  | 'processes.statusAll'
  | 'processes.statusDraft'
  | 'processes.statusPublished'
  | 'processes.statusHistoric'
  | 'processes.filtersTitle'
  | 'processes.filtersHint'
  | 'processes.statusLabel'
  | 'processes.orderLabel'
  | 'processes.sortLabel'
  | 'processes.sortRecent'
  | 'processes.sortName'
  | 'processes.sortVersion'
  | 'processes.clearFilters'
  | 'processes.totalCount'
  | 'processes.visibleCount'
  | 'processes.emptyTitle'
  | 'processes.emptyDescription'
  | 'processes.loadError'
  | 'processes.createSuccess'
  | 'processes.createError'
  | 'processes.publishSuccess'
  | 'processes.publishError'
  | 'processes.startSuccess'
  | 'processes.startError'
  | 'processes.versionSuccess'
  | 'processes.versionError'
  | 'processes.validationError'
  | 'processes.version'
  | 'processes.versions'
  | 'processes.draft'
  | 'processes.published'
  | 'processes.historic'
  | 'processes.lastActivity'
  | 'processes.edit'
  | 'processes.viewDetails'
  | 'processes.publishing'
  | 'processes.publish'
  | 'processes.versioning'
  | 'processes.createVersion'
  | 'processes.starting'
  | 'processes.startProcess'
  | 'processes.executeInCamunda'
  | 'processes.monitorCycle';

const THEME_STORAGE_KEY = 'system-bpm-theme';
const LANGUAGE_STORAGE_KEY = 'system-bpm-language';

const TRANSLATIONS: Record<LanguagePreference, Record<TranslationKey, string>> = {
  es: {
    'settings.title': 'Ajustes',
    'settings.subtitle': 'Personaliza la experiencia visual del sistema.',
    'settings.open': 'Abrir ajustes',
    'settings.close': 'Cerrar',
    'settings.theme': 'Tema',
    'settings.language': 'Idioma',
    'settings.light': 'Claro',
    'settings.dark': 'Oscuro',
    'settings.preview': 'Los cambios se guardan en este navegador.',
    'common.yes': 'Si',
    'common.no': 'No',
    'user.center': 'Centro de trabajo BPM',
    'user.greeting': 'Hola',
    'user.hero': 'Gestiona tus tareas asignadas, toma solicitudes disponibles de tu area y manten tu flujo al dia.',
    'user.role': 'Rol',
    'user.area': 'Area',
    'user.email': 'Correo institucional',
    'user.sync': 'Sincronizacion',
    'user.loading': 'Cargando tu espacio de trabajo...',
    'user.workload': 'Estado operativo',
    'user.mine': 'Mis tareas',
    'user.areaTasks': 'Disponibles en mi area',
    'user.total': 'Total operativo',
    'user.priority': 'Prioridad del dia',
    'user.recommendation': 'Como avanzar',
    'user.logout': 'Cerrar sesion',
    'user.refresh': 'Actualizar',
    'user.viewMine': 'Ver mis tareas',
    'user.viewArea': 'Ver tareas de mi area',
    'user.workloadAttentionTitle': 'Tienes trabajo asignado',
    'user.workloadHealthyTitle': 'Tu bandeja personal esta despejada',
    'user.workloadEmptyTitle': 'Sin tareas pendientes por ahora',
    'user.workloadAttentionDescription': 'Prioriza tus tareas asignadas antes de tomar nuevas solicitudes del area.',
    'user.workloadHealthyDescription': 'Puedes apoyar tomando tareas disponibles para tu area.',
    'user.workloadEmptyDescription': 'Cuando Camunda genere nuevas tareas, apareceran aqui automaticamente.',
    'user.metricMineHint': 'Asignadas directamente a ti',
    'user.metricAreaHint': 'Pendientes para tomar',
    'user.metricTotalHint': 'Trabajo visible para tu rol',
    'user.priorityTitle': 'Tareas que requieren atencion',
    'user.emptyTitle': 'Todo despejado',
    'user.emptyDescription': 'No hay tareas asignadas ni disponibles para tu area en este momento.',
    'user.guidanceTitle': 'Flujo de trabajo recomendado',
    'user.guidanceStepOne': 'Completa primero las tareas ya asignadas a tu usuario.',
    'user.guidanceStepTwo': 'Si tu bandeja esta vacia, toma tareas disponibles de tu area.',
    'user.guidanceStepThree': 'Revisa el seguimiento cuando necesites contexto del proceso.',
    'user.claimAvailable': 'Tomar una tarea disponible',
    'user.updating': 'Actualizando...',
    'user.notUpdated': 'Aun no actualizado',
    'user.unassignedArea': 'Area no asignada',
    'admin.center': 'Control central',
    'admin.title': 'Dashboard BPM',
    'admin.subtitle': 'Visualiza el estado operativo del sistema, la carga de trabajo y las ultimas ejecuciones sin salir del panel administrativo.',
    'admin.openTasks': 'Abrir tareas',
    'admin.openInstances': 'Ver instancias',
    'admin.openProcesses': 'Abrir procesos',
    'admin.manageUsers': 'Gestionar usuarios',
    'admin.manageAreas': 'Gestionar areas',
    'admin.role': 'Administrador',
    'admin.loading': 'Cargando metricas del sistema...',
    'admin.retry': 'Reintentar',
    'admin.trackingTitle': 'Pestana dedicada para seguimiento',
    'admin.trackingSubtitle': 'Consulta todas las instancias desde un apartado independiente, con filtros por periodo, estado y proceso. Por defecto veras primero las instancias de hoy y desde ahi podras abrir su seguimiento visual.',
    'admin.instancesTitle': 'Instancias recientes',
    'admin.instancesSubtitle': 'Se construyen a partir de la actividad mas reciente para que entres rapido al monitoreo operativo.',
    'admin.completedByArea': 'Tareas completadas por area',
    'admin.completedByUser': 'Tareas completadas por usuario',
    'admin.recentTitle': 'Ultimas tareas completadas',
    'admin.recentSubtitle': 'Actividad reciente registrada en el historial propio.',
    'admin.seeTracking': 'Ver seguimiento',
    'admin.todayInstances': 'instancias destacadas',
    'admin.noDate': 'Sin fecha',
    'admin.unknownProcess': 'Proceso no identificado',
    'admin.unknownUser': 'Usuario no identificado',
    'admin.unspecifiedArea': 'Area no especificada',
    'admin.noAreaData': 'Todavia no hay tareas completadas para mostrar por area.',
    'admin.noUserData': 'Todavia no hay tareas completadas para mostrar por usuario.',
    'admin.noRecentData': 'Todavia no hay tareas completadas registradas en el historial.',
    'tasks.inboxTitle': 'Bandeja de tareas',
    'tasks.inboxSubtitle': 'Consulta tareas activas reales de Camunda y completa las que tengas disponibles desde la app.',
    'tasks.back': 'Volver',
    'tasks.refresh': 'Refrescar',
    'tasks.loading': 'Cargando...',
    'tasks.myTasks': 'Mis tareas',
    'tasks.areaTasks': 'Tareas de mi area',
    'tasks.allTasks': 'Todas',
    'tasks.assigned': 'Asignada',
    'tasks.pending': 'Pendiente',
    'tasks.available': 'Disponible',
    'tasks.process': 'Proceso',
    'tasks.created': 'Creada',
    'tasks.reference': 'Referencia',
    'tasks.assignment': 'Asignacion',
    'tasks.area': 'Area',
    'tasks.noTasks': 'No hay tareas para mostrar',
    'tasks.noMine': 'Aun no tienes tareas asignadas.',
    'tasks.noArea': 'No hay tareas disponibles para tomar en tu area.',
    'tasks.noAll': 'No hay tareas activas en Camunda.',
    'tasks.quickWork': 'Trabajo rapido',
    'tasks.close': 'Cerrar',
    'tasks.loadingTask': 'Cargando tarea...',
    'tasks.assignedTo': 'Asignada a',
    'tasks.formTitle': 'Formulario de tarea',
    'tasks.noForm': 'Esta tarea no tiene formulario configurado.',
    'tasks.submit': 'Enviar formulario y completar',
    'tasks.saving': 'Enviando...',
    'tasks.directWork': 'Trabajar ahora',
    'tasks.takeTask': 'Tomar tarea',
    'tasks.missingField': 'Este campo es obligatorio.',
    'tasks.realtime': 'Bandeja sincronizada en vivo',
    'tasks.initialLoading': 'Cargando tareas activas de Camunda...',
    'tasks.instanceReference': 'Instancia',
    'tasks.assignedLabel': 'Asignada',
    'tasks.availableLabel': 'Disponible',
    'tasks.workingNow': 'Primero debes tomar la tarea para poder trabajarla.',
    'tasks.takeHint': 'Puedes tomar esta tarea',
    'tasks.takenBy': 'Asignada a',
    'tasks.areaUnknown': 'Area no identificada',
    'tasks.processUnknown': 'Proceso no identificado',
    'tasks.instanceUnknown': 'Instancia no identificada',
    'tasks.noProcess': 'Proceso sin nombre',
    'tasks.noAssignment': 'Sin asignar',
    'tasks.allCamunda': 'Todas las tareas de Camunda',
    'tasks.mineCount': 'Mis tareas',
    'tasks.areaCount': 'Tareas de mi area',
    'tasks.allCount': 'Todas',
    'tasks.taskTitle': 'Tarea sin nombre',
    'tasks.selectOption': 'Selecciona una opcion',
    'tasks.checkboxHint': 'Marca esta opcion si corresponde.',
    'tasks.fileSelected': 'Archivo seleccionado:',
    'tasks.fileValidation': 'El archivo se validara al seleccionarlo y se enviara con el formulario.',
    'tasks.fileLimit': 'El archivo supera el limite de 10 MB.',
    'tasks.uploadPending': 'Subiendo archivo...',
    'tasks.formRequired': 'Completa los campos obligatorios antes de finalizar la tarea.',
    'tasks.quickCompleteSuccess': 'La tarea se completo correctamente.',
    'tasks.quickCompleteError': 'No se pudo completar la tarea.',
    'tasks.quickOpenError': 'No se pudo abrir la tarea.',
    'tasks.loadSuccess': 'Se cargaron tareas activas de Camunda.',
    'tasks.loadError': 'No se pudieron cargar las tareas de Camunda.',
    'tracking.title': 'Seguimiento de instancia',
    'tracking.subtitle': 'Revisa el avance real del proceso, el estado visual del BPMN y la trazabilidad de ejecucion desde una sola vista.',
    'tracking.back': 'Volver a tareas',
    'tracking.refresh': 'Actualizar',
    'tracking.loading': 'Cargando seguimiento de la instancia...',
    'tracking.sync': 'Sincronizacion en vivo',
    'tracking.lastUpdate': 'Ultima actualizacion:',
    'tracking.initialSync': 'Sincronizacion inicial',
    'tracking.process': 'Proceso en seguimiento',
    'tracking.instance': 'Instancia',
    'tracking.currentState': 'Estado actual',
    'tracking.activeTasks': 'Tareas activas',
    'tracking.completedTasks': 'Tareas completadas',
    'tracking.pendingTasks': 'Tareas pendientes',
    'tracking.timeline': 'Timeline de ejecucion',
    'tracking.viewer': 'Estado visual del BPMN',
    'tracking.viewerHint': 'Mapa del proceso',
    'tracking.summary': 'Resumen de instancia',
    'tracking.processUnknown': 'Proceso no identificado',
    'tracking.instanceUnknown': 'Instancia no identificada',
    'tracking.noTracking': 'No se pudo cargar el seguimiento de la instancia.',
    'tracking.activeState': 'Activa',
    'tracking.finishedState': 'Finalizada',
    'tracking.noData': 'Sin datos',
    'taskDetail.title': 'Detalle de tarea',
    'taskDetail.subtitle': 'Vista de detalle para una tarea real de Camunda.',
    'taskDetail.back': 'Volver',
    'taskDetail.viewTracking': 'Ver seguimiento',
    'taskDetail.showTechnical': 'Ver mas',
    'taskDetail.hideTechnical': 'Ocultar detalle tecnico',
    'taskDetail.loading': 'Cargando detalle...',
    'taskDetail.loadingForm': 'Cargando formulario...',
    'taskDetail.loadingHistory': 'Cargando historial...',
    'taskDetail.name': 'Nombre de la tarea',
    'taskDetail.process': 'Proceso',
    'taskDetail.area': 'Area',
    'taskDetail.assignedTo': 'Asignada a',
    'taskDetail.state': 'Estado',
    'taskDetail.created': 'Creada',
    'taskDetail.tracking': 'Seguimiento',
    'taskDetail.technicalProcess': 'Proceso tecnico',
    'taskDetail.technicalInstance': 'Instancia tecnica',
    'taskDetail.taskKey': 'Task Key',
    'taskDetail.form': 'Formulario de tarea',
    'taskDetail.noForm': 'Esta tarea no tiene formulario configurado.',
    'taskDetail.selectOption': 'Selecciona una opcion',
    'taskDetail.checkboxHint': 'Marca esta opcion si corresponde.',
    'taskDetail.fileValidation': 'El archivo se validara al seleccionarlo y se enviara con el formulario.',
    'taskDetail.fileSelected': 'Archivo seleccionado:',
    'taskDetail.fileUploaded': 'Archivo cargado:',
    'taskDetail.view': 'Ver',
    'taskDetail.required': 'Este campo es obligatorio.',
    'taskDetail.history': 'Historial',
    'taskDetail.historyCount': 'tarea(s) registradas',
    'taskDetail.noHistory': 'Sin registros aun',
    'taskDetail.historyEmpty': 'Esta ejecucion no registro datos de formulario.',
    'taskDetail.noDetail': 'No se pudo mostrar el detalle',
    'taskDetail.noId': 'No se recibio el identificador de la tarea.',
    'taskDetail.noDate': 'Sin fecha',
    'taskDetail.noProcess': 'Proceso no identificado',
    'taskDetail.noInstance': 'Instancia no identificada',
    'taskDetail.noArea': 'Area no identificada',
    'taskDetail.noAssignment': 'Sin asignar',
    'taskDetail.actionSend': 'Enviar formulario y completar',
    'taskDetail.actionSending': 'Enviando...',
    'taskDetail.actionLabel': 'Accion pendiente',
    'taskDetail.waitTake': 'Primero debes tomar la tarea para poder completar el formulario.',
    'taskDetail.takenBy': 'La tarea fue tomada por',
    'taskDetail.completeHint': 'Completa los campos obligatorios antes de finalizar la tarea.',
    'taskDetail.completeSuccess': 'La tarea se completo correctamente.',
    'taskDetail.completeError': 'No se pudo completar la tarea.',
    'taskDetail.loadTooLong': 'La carga del detalle tardo demasiado. Intenta refrescar la pagina.',
    'taskDetail.loadError': 'No se pudo cargar el detalle de la tarea.',
    'taskDetail.formMissing': 'Esta tarea no tiene formulario configurado.',
    'taskDetail.historyMissing': 'Esta tarea todavia no tiene historial disponible.',
    'taskDetail.fileTooLarge': 'El archivo supera el limite de 10 MB.',
    'taskDetail.fileAttached': 'Archivo adjunto',
    'taskDetail.noTaskName': 'Tarea sin nombre',
    'taskDetail.noUser': 'Usuario no identificado',
    'taskDetail.noProcessLabel': 'Sin proceso',
    'taskDetail.fieldUnnamed': 'Campo sin nombre',
    'taskDetail.instancePrefix': 'Instancia #',
    'processes.families': 'Familias de procesos',
    'processes.subtitle': 'Cada familia agrupa sus versiones. Elige una version para abrirla o crear una nueva version.',
    'processes.pageSubtitle': 'Gestiona borradores, publica versiones y supervisa el ciclo de vida de cada proceso desde una sola vista.',
    'processes.loading': 'Cargando procesos...',
    'processes.empty': 'Todavia no hay procesos guardados.',
    'processes.back': 'Volver al dashboard',
    'processes.pageTitle': 'Procesos BPM',
    'processes.create': 'Nuevo proceso',
    'processes.refresh': 'Refrescar',
    'processes.familyBack': 'Volver a procesos',
    'processes.familyTitle': 'Versiones del proceso',
    'processes.familySubtitle': 'Revisa las versiones de esta familia, su estado y las acciones disponibles.',
    'processes.familyMissing': 'La familia de proceso no fue encontrada.',
    'processes.familyEmpty': 'No hay versiones para mostrar en esta familia.',
    'processes.searchLabel': 'Buscar',
    'processes.searchPlaceholder': 'Nombre, clave o version',
    'processes.statusAll': 'Todos',
    'processes.statusDraft': 'Borradores',
    'processes.statusPublished': 'Publicados',
    'processes.statusHistoric': 'Historicos',
    'processes.filtersTitle': 'Filtros',
    'processes.filtersHint': 'Usa filtros para encontrar rapido un proceso, su estado o su version.',
    'processes.statusLabel': 'Estado',
    'processes.orderLabel': 'Ordenar por',
    'processes.sortLabel': 'Orden',
    'processes.sortRecent': 'Mas recientes',
    'processes.sortName': 'Nombre',
    'processes.sortVersion': 'Version',
    'processes.clearFilters': 'Limpiar filtros',
    'processes.totalCount': 'Total de procesos',
    'processes.visibleCount': 'Mostrando',
    'processes.emptyTitle': 'No hay coincidencias',
    'processes.emptyDescription': 'Prueba ajustando los filtros o crea un proceso nuevo para empezar.',
    'processes.loadError': 'No se pudo cargar la lista de procesos.',
    'processes.createSuccess': 'Proceso creado correctamente.',
    'processes.createError': 'No se pudo crear el proceso.',
    'processes.publishSuccess': 'Proceso publicado y desplegado correctamente.',
    'processes.publishError': 'No se pudo publicar el proceso.',
    'processes.startSuccess': 'Instancia iniciada correctamente.',
    'processes.startError': 'No se pudo iniciar la instancia del proceso.',
    'processes.versionSuccess': 'Nueva version creada correctamente.',
    'processes.versionError': 'No se pudo crear la nueva version del proceso.',
    'processes.validationError': 'El proceso no cumple la validacion requerida.',
    'processes.version': 'Version',
    'processes.versions': 'versiones',
    'processes.draft': 'BORRADOR',
    'processes.published': 'PUBLICADO',
    'processes.historic': 'HISTORICO',
    'processes.lastActivity': 'Ultima actividad:',
    'processes.edit': 'Editar',
    'processes.viewDetails': 'Ver detalle',
    'processes.publishing': 'Publicando...',
    'processes.publish': 'Publicar',
    'processes.versioning': 'Creando version...',
    'processes.createVersion': 'Crear version',
    'processes.starting': 'Iniciando...',
    'processes.startProcess': 'Iniciar proceso',
    'processes.executeInCamunda': 'Ejecutar esta version en Camunda',
    'processes.monitorCycle': 'Monitorear ciclo',
  },
  en: {
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize the visual experience of the system.',
    'settings.open': 'Open settings',
    'settings.close': 'Close',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.preview': 'Changes are saved in this browser.',
    'common.yes': 'Yes',
    'common.no': 'No',
    'user.center': 'BPM work center',
    'user.greeting': 'Hello',
    'user.hero': 'Manage assigned tasks, claim available requests from your area, and keep your workflow up to date.',
    'user.role': 'Role',
    'user.area': 'Area',
    'user.email': 'Institutional email',
    'user.sync': 'Sync',
    'user.loading': 'Loading your workspace...',
    'user.workload': 'Operational status',
    'user.mine': 'My tasks',
    'user.areaTasks': 'Available in my area',
    'user.total': 'Operational total',
    'user.priority': 'Today priority',
    'user.recommendation': 'How to move forward',
    'user.logout': 'Sign out',
    'user.refresh': 'Refresh',
    'user.viewMine': 'View my tasks',
    'user.viewArea': 'View area tasks',
    'user.workloadAttentionTitle': 'You have assigned work',
    'user.workloadHealthyTitle': 'Your personal inbox is clear',
    'user.workloadEmptyTitle': 'No pending tasks for now',
    'user.workloadAttentionDescription': 'Prioritize assigned tasks before claiming new requests from your area.',
    'user.workloadHealthyDescription': 'You can help by claiming tasks available for your area.',
    'user.workloadEmptyDescription': 'When Camunda creates new tasks, they will appear here automatically.',
    'user.metricMineHint': 'Assigned directly to you',
    'user.metricAreaHint': 'Waiting to be claimed',
    'user.metricTotalHint': 'Work visible to your role',
    'user.priorityTitle': 'Tasks needing attention',
    'user.emptyTitle': 'All clear',
    'user.emptyDescription': 'There are no assigned or available tasks for your area right now.',
    'user.guidanceTitle': 'Recommended workflow',
    'user.guidanceStepOne': 'Complete tasks already assigned to your user first.',
    'user.guidanceStepTwo': 'If your inbox is empty, claim available tasks from your area.',
    'user.guidanceStepThree': 'Review tracking when you need process context.',
    'user.claimAvailable': 'Claim an available task',
    'user.updating': 'Refreshing...',
    'user.notUpdated': 'Not updated yet',
    'user.unassignedArea': 'Unassigned area',
    'admin.center': 'Central control',
    'admin.title': 'BPM Dashboard',
    'admin.subtitle': 'See the system status, workload, and latest executions without leaving the admin panel.',
    'admin.openTasks': 'Open tasks',
    'admin.openInstances': 'View instances',
    'admin.openProcesses': 'Open processes',
    'admin.manageUsers': 'Manage users',
    'admin.manageAreas': 'Manage areas',
    'admin.role': 'Administrator',
    'admin.loading': 'Loading system metrics...',
    'admin.retry': 'Retry',
    'admin.trackingTitle': 'Dedicated tracking tab',
    'admin.trackingSubtitle': 'Browse all instances in a separate section, with filters by period, status, and process. By default you will see today\'s instances first and can open visual tracking from there.',
    'admin.instancesTitle': 'Recent instances',
    'admin.instancesSubtitle': 'Built from the latest activity so you can jump into operational monitoring quickly.',
    'admin.completedByArea': 'Tasks completed by area',
    'admin.completedByUser': 'Tasks completed by user',
    'admin.recentTitle': 'Latest completed tasks',
    'admin.recentSubtitle': 'Recent activity recorded in the local history.',
    'admin.seeTracking': 'View tracking',
    'admin.todayInstances': 'highlighted instances',
    'admin.noDate': 'No date',
    'admin.unknownProcess': 'Unidentified process',
    'admin.unknownUser': 'Unidentified user',
    'admin.unspecifiedArea': 'Unspecified area',
    'admin.noAreaData': 'There are no completed tasks to show by area yet.',
    'admin.noUserData': 'There are no completed tasks to show by user yet.',
    'admin.noRecentData': 'There are no completed tasks recorded in the history yet.',
    'tasks.inboxTitle': 'Task inbox',
    'tasks.inboxSubtitle': 'Review real Camunda tasks and complete the ones available from the app.',
    'tasks.back': 'Back',
    'tasks.refresh': 'Refresh',
    'tasks.loading': 'Loading...',
    'tasks.myTasks': 'My tasks',
    'tasks.areaTasks': 'My area tasks',
    'tasks.allTasks': 'All tasks',
    'tasks.assigned': 'Assigned',
    'tasks.pending': 'Pending',
    'tasks.available': 'Available',
    'tasks.process': 'Process',
    'tasks.created': 'Created',
    'tasks.reference': 'Reference',
    'tasks.assignment': 'Assignment',
    'tasks.area': 'Area',
    'tasks.noTasks': 'No tasks to show',
    'tasks.noMine': 'You do not have assigned tasks yet.',
    'tasks.noArea': 'There are no tasks available to claim in your area.',
    'tasks.noAll': 'There are no active tasks in Camunda.',
    'tasks.quickWork': 'Quick work',
    'tasks.close': 'Close',
    'tasks.loadingTask': 'Loading task...',
    'tasks.assignedTo': 'Assigned to',
    'tasks.formTitle': 'Task form',
    'tasks.noForm': 'This task has no configured form.',
    'tasks.submit': 'Submit form and complete',
    'tasks.saving': 'Sending...',
    'tasks.directWork': 'Work now',
    'tasks.takeTask': 'Take task',
    'tasks.missingField': 'This field is required.',
    'tasks.realtime': 'Live synchronized inbox',
    'tasks.initialLoading': 'Loading active Camunda tasks...',
    'tasks.instanceReference': 'Instance',
    'tasks.assignedLabel': 'Assigned',
    'tasks.availableLabel': 'Available',
    'tasks.workingNow': 'You must take the task before working on it.',
    'tasks.takeHint': 'You can take this task',
    'tasks.takenBy': 'Assigned to',
    'tasks.areaUnknown': 'Unidentified area',
    'tasks.processUnknown': 'Unidentified process',
    'tasks.instanceUnknown': 'Unidentified instance',
    'tasks.noProcess': 'Unnamed process',
    'tasks.noAssignment': 'Unassigned',
    'tasks.allCamunda': 'All Camunda tasks',
    'tasks.mineCount': 'My tasks',
    'tasks.areaCount': 'My area tasks',
    'tasks.allCount': 'All',
    'tasks.taskTitle': 'Untitled task',
    'tasks.selectOption': 'Select an option',
    'tasks.checkboxHint': 'Check this option if it applies.',
    'tasks.fileSelected': 'Selected file:',
    'tasks.fileValidation': 'The file will be validated when selected and sent with the form.',
    'tasks.fileLimit': 'The file exceeds the 10 MB limit.',
    'tasks.uploadPending': 'Uploading file...',
    'tasks.formRequired': 'Fill the required fields before finishing the task.',
    'tasks.quickCompleteSuccess': 'The task was completed successfully.',
    'tasks.quickCompleteError': 'The task could not be completed.',
    'tasks.quickOpenError': 'The task could not be opened.',
    'tasks.loadSuccess': 'Active Camunda tasks loaded.',
    'tasks.loadError': 'Camunda tasks could not be loaded.',
    'tracking.title': 'Instance tracking',
    'tracking.subtitle': 'Review the actual process progress, BPMN visual state, and execution trace from one place.',
    'tracking.back': 'Back to tasks',
    'tracking.refresh': 'Refresh',
    'tracking.loading': 'Loading instance tracking...',
    'tracking.sync': 'Live synchronization',
    'tracking.lastUpdate': 'Last update:',
    'tracking.initialSync': 'Initial synchronization',
    'tracking.process': 'Tracking process',
    'tracking.instance': 'Instance',
    'tracking.currentState': 'Current state',
    'tracking.activeTasks': 'Active tasks',
    'tracking.completedTasks': 'Completed tasks',
    'tracking.pendingTasks': 'Pending tasks',
    'tracking.timeline': 'Execution timeline',
    'tracking.viewer': 'BPMN visual state',
    'tracking.viewerHint': 'Process map',
    'tracking.summary': 'Instance summary',
    'tracking.processUnknown': 'Unidentified process',
    'tracking.instanceUnknown': 'Unidentified instance',
    'tracking.noTracking': 'Instance tracking could not be loaded.',
    'tracking.activeState': 'Active',
    'tracking.finishedState': 'Completed',
    'tracking.noData': 'No data',
    'taskDetail.title': 'Task detail',
    'taskDetail.subtitle': 'Detailed view for a real Camunda task.',
    'taskDetail.back': 'Back',
    'taskDetail.viewTracking': 'View tracking',
    'taskDetail.showTechnical': 'Show more',
    'taskDetail.hideTechnical': 'Hide technical details',
    'taskDetail.loading': 'Loading detail...',
    'taskDetail.loadingForm': 'Loading form...',
    'taskDetail.loadingHistory': 'Loading history...',
    'taskDetail.name': 'Task name',
    'taskDetail.process': 'Process',
    'taskDetail.area': 'Area',
    'taskDetail.assignedTo': 'Assigned to',
    'taskDetail.state': 'State',
    'taskDetail.created': 'Created',
    'taskDetail.tracking': 'Tracking',
    'taskDetail.technicalProcess': 'Technical process',
    'taskDetail.technicalInstance': 'Technical instance',
    'taskDetail.taskKey': 'Task Key',
    'taskDetail.form': 'Task form',
    'taskDetail.noForm': 'This task has no configured form.',
    'taskDetail.selectOption': 'Select an option',
    'taskDetail.checkboxHint': 'Check this option if it applies.',
    'taskDetail.fileValidation': 'The file will be validated when selected and sent with the form.',
    'taskDetail.fileSelected': 'Selected file:',
    'taskDetail.fileUploaded': 'Uploaded file:',
    'taskDetail.view': 'View',
    'taskDetail.required': 'This field is required.',
    'taskDetail.history': 'History',
    'taskDetail.historyCount': 'recorded task(s)',
    'taskDetail.noHistory': 'No records yet',
    'taskDetail.historyEmpty': 'This execution did not record any form data.',
    'taskDetail.noDetail': 'Could not show the detail',
    'taskDetail.noId': 'Task identifier was not received.',
    'taskDetail.noDate': 'No date',
    'taskDetail.noProcess': 'Unidentified process',
    'taskDetail.noInstance': 'Unidentified instance',
    'taskDetail.noArea': 'Unidentified area',
    'taskDetail.noAssignment': 'Unassigned',
    'taskDetail.actionSend': 'Submit form and complete',
    'taskDetail.actionSending': 'Sending...',
    'taskDetail.actionLabel': 'Pending action',
    'taskDetail.waitTake': 'You must take the task before completing the form.',
    'taskDetail.takenBy': 'The task was taken by',
    'taskDetail.completeHint': 'Fill the required fields before finishing the task.',
    'taskDetail.completeSuccess': 'The task was completed successfully.',
    'taskDetail.completeError': 'The task could not be completed.',
    'taskDetail.loadTooLong': 'The detail load took too long. Try refreshing the page.',
    'taskDetail.loadError': 'The task detail could not be loaded.',
    'taskDetail.formMissing': 'This task has no configured form.',
    'taskDetail.historyMissing': 'This task does not have history available yet.',
    'taskDetail.fileTooLarge': 'The file exceeds the 10 MB limit.',
    'taskDetail.fileAttached': 'Attached file',
    'taskDetail.noTaskName': 'Untitled task',
    'taskDetail.noUser': 'Unidentified user',
    'taskDetail.noProcessLabel': 'No process',
    'taskDetail.fieldUnnamed': 'Unnamed field',
    'taskDetail.instancePrefix': 'Instance #',
    'processes.families': 'Process families',
    'processes.subtitle': 'Each family groups its versions. Choose a version to open it or create a new one.',
    'processes.pageSubtitle': 'Manage drafts, publish versions, and supervise the lifecycle of each process from a single view.',
    'processes.loading': 'Loading processes...',
    'processes.empty': 'There are no saved processes yet.',
    'processes.back': 'Back to dashboard',
    'processes.pageTitle': 'BPM Processes',
    'processes.create': 'New process',
    'processes.refresh': 'Refresh',
    'processes.familyBack': 'Back to processes',
    'processes.familyTitle': 'Process versions',
    'processes.familySubtitle': 'Review the versions in this family, their state, and available actions.',
    'processes.familyMissing': 'The process family was not found.',
    'processes.familyEmpty': 'There are no versions to show in this family.',
    'processes.searchLabel': 'Search',
    'processes.searchPlaceholder': 'Name, key, or version',
    'processes.statusAll': 'All',
    'processes.statusDraft': 'Drafts',
    'processes.statusPublished': 'Published',
    'processes.statusHistoric': 'Historic',
    'processes.filtersTitle': 'Filters',
    'processes.filtersHint': 'Use filters to quickly find a process, its state, or version.',
    'processes.statusLabel': 'State',
    'processes.orderLabel': 'Sort by',
    'processes.sortLabel': 'Sort',
    'processes.sortRecent': 'Most recent',
    'processes.sortName': 'Name',
    'processes.sortVersion': 'Version',
    'processes.clearFilters': 'Clear filters',
    'processes.totalCount': 'Total processes',
    'processes.visibleCount': 'Showing',
    'processes.emptyTitle': 'No matches',
    'processes.emptyDescription': 'Try adjusting filters or create a new process to get started.',
    'processes.loadError': 'The process list could not be loaded.',
    'processes.createSuccess': 'Process created successfully.',
    'processes.createError': 'The process could not be created.',
    'processes.publishSuccess': 'Process published and deployed successfully.',
    'processes.publishError': 'The process could not be published.',
    'processes.startSuccess': 'Instance started successfully.',
    'processes.startError': 'The process instance could not be started.',
    'processes.versionSuccess': 'A new version was created successfully.',
    'processes.versionError': 'The new process version could not be created.',
    'processes.validationError': 'The process does not meet the required validation.',
    'processes.version': 'Version',
    'processes.versions': 'versions',
    'processes.draft': 'DRAFT',
    'processes.published': 'PUBLISHED',
    'processes.historic': 'HISTORIC',
    'processes.lastActivity': 'Last activity:',
    'processes.edit': 'Edit',
    'processes.viewDetails': 'View details',
    'processes.publishing': 'Publishing...',
    'processes.publish': 'Publish',
    'processes.versioning': 'Creating version...',
    'processes.createVersion': 'Create version',
    'processes.starting': 'Starting...',
    'processes.startProcess': 'Start process',
    'processes.executeInCamunda': 'Execute this version in Camunda',
    'processes.monitorCycle': 'Monitor cycle',
  },
  pt: {
    'settings.title': 'Configuracoes',
    'settings.subtitle': 'Personalize a experiencia visual do sistema.',
    'settings.open': 'Abrir configuracoes',
    'settings.close': 'Fechar',
    'settings.theme': 'Tema',
    'settings.language': 'Idioma',
    'settings.light': 'Claro',
    'settings.dark': 'Escuro',
    'settings.preview': 'As alteracoes sao salvas neste navegador.',
    'common.yes': 'Sim',
    'common.no': 'Nao',
    'user.center': 'Centro de trabalho BPM',
    'user.greeting': 'Ola',
    'user.hero': 'Gerencie suas tarefas atribuidas, assuma solicitacoes disponiveis da sua area e mantenha seu fluxo em dia.',
    'user.role': 'Funcao',
    'user.area': 'Area',
    'user.email': 'E-mail institucional',
    'user.sync': 'Sincronizacao',
    'user.loading': 'Carregando seu espaco de trabalho...',
    'user.workload': 'Estado operacional',
    'user.mine': 'Minhas tarefas',
    'user.areaTasks': 'Disponiveis na minha area',
    'user.total': 'Total operacional',
    'user.priority': 'Prioridade do dia',
    'user.recommendation': 'Como avancar',
    'user.logout': 'Sair',
    'user.refresh': 'Atualizar',
    'user.viewMine': 'Ver minhas tarefas',
    'user.viewArea': 'Ver tarefas da area',
    'user.workloadAttentionTitle': 'Voce tem trabalho atribuido',
    'user.workloadHealthyTitle': 'Sua caixa pessoal esta limpa',
    'user.workloadEmptyTitle': 'Sem tarefas pendentes por enquanto',
    'user.workloadAttentionDescription': 'Priorize suas tarefas atribuidas antes de assumir novas solicitacoes da area.',
    'user.workloadHealthyDescription': 'Voce pode ajudar assumindo tarefas disponiveis para sua area.',
    'user.workloadEmptyDescription': 'Quando o Camunda gerar novas tarefas, elas aparecerao aqui automaticamente.',
    'user.metricMineHint': 'Atribuidas diretamente a voce',
    'user.metricAreaHint': 'Pendentes para assumir',
    'user.metricTotalHint': 'Trabalho visivel para sua funcao',
    'user.priorityTitle': 'Tarefas que precisam de atencao',
    'user.emptyTitle': 'Tudo limpo',
    'user.emptyDescription': 'Nao ha tarefas atribuidas nem disponiveis para sua area neste momento.',
    'user.guidanceTitle': 'Fluxo de trabalho recomendado',
    'user.guidanceStepOne': 'Conclua primeiro as tarefas ja atribuidas ao seu usuario.',
    'user.guidanceStepTwo': 'Se sua caixa estiver vazia, assuma tarefas disponiveis da sua area.',
    'user.guidanceStepThree': 'Revise o acompanhamento quando precisar de contexto do processo.',
    'user.claimAvailable': 'Assumir uma tarefa disponivel',
    'user.updating': 'Atualizando...',
    'user.notUpdated': 'Ainda nao atualizado',
    'user.unassignedArea': 'Area nao atribuida',
    'admin.center': 'Controle central',
    'admin.title': 'Dashboard BPM',
    'admin.subtitle': 'Visualize o estado operacional do sistema, a carga de trabalho e as ultimas execucoes sem sair do painel administrativo.',
    'admin.openTasks': 'Abrir tarefas',
    'admin.openInstances': 'Ver instancias',
    'admin.openProcesses': 'Abrir processos',
    'admin.manageUsers': 'Gerenciar usuarios',
    'admin.manageAreas': 'Gerenciar areas',
    'admin.role': 'Administrador',
    'admin.loading': 'Carregando metricas do sistema...',
    'admin.retry': 'Repetir',
    'admin.trackingTitle': 'Aba dedicada para acompanhamento',
    'admin.trackingSubtitle': 'Consulte todas as instancias em uma secao separada, com filtros por periodo, estado e processo. Por padrao voce vera primeiro as instancias de hoje e podera abrir o acompanhamento visual a partir dali.',
    'admin.instancesTitle': 'Instancias recentes',
    'admin.instancesSubtitle': 'Construidas a partir da atividade mais recente para voce entrar rapido no monitoramento operacional.',
    'admin.completedByArea': 'Tarefas concluidas por area',
    'admin.completedByUser': 'Tarefas concluidas por usuario',
    'admin.recentTitle': 'Ultimas tarefas concluidas',
    'admin.recentSubtitle': 'Atividade recente registrada no historico proprio.',
    'admin.seeTracking': 'Ver acompanhamento',
    'admin.todayInstances': 'instancias destacadas',
    'admin.noDate': 'Sem data',
    'admin.unknownProcess': 'Processo nao identificado',
    'admin.unknownUser': 'Usuario nao identificado',
    'admin.unspecifiedArea': 'Area nao especificada',
    'admin.noAreaData': 'Ainda nao ha tarefas concluidas para mostrar por area.',
    'admin.noUserData': 'Ainda nao ha tarefas concluidas para mostrar por usuario.',
    'admin.noRecentData': 'Ainda nao ha tarefas concluidas registradas no historico.',
    'tasks.inboxTitle': 'Caixa de tarefas',
    'tasks.inboxSubtitle': 'Revise tarefas reais do Camunda e conclua as disponiveis pela aplicacao.',
    'tasks.back': 'Voltar',
    'tasks.refresh': 'Atualizar',
    'tasks.loading': 'Carregando...',
    'tasks.myTasks': 'Minhas tarefas',
    'tasks.areaTasks': 'Tarefas da minha area',
    'tasks.allTasks': 'Todas as tarefas',
    'tasks.assigned': 'Atribuida',
    'tasks.pending': 'Pendente',
    'tasks.available': 'Disponivel',
    'tasks.process': 'Processo',
    'tasks.created': 'Criada',
    'tasks.reference': 'Referencia',
    'tasks.assignment': 'Atribuicao',
    'tasks.area': 'Area',
    'tasks.noTasks': 'Nao ha tarefas para mostrar',
    'tasks.noMine': 'Voce ainda nao tem tarefas atribuidas.',
    'tasks.noArea': 'Nao ha tarefas disponiveis para assumir na sua area.',
    'tasks.noAll': 'Nao ha tarefas ativas no Camunda.',
    'tasks.quickWork': 'Trabalho rapido',
    'tasks.close': 'Fechar',
    'tasks.loadingTask': 'Carregando tarefa...',
    'tasks.assignedTo': 'Atribuida a',
    'tasks.formTitle': 'Formulario da tarefa',
    'tasks.noForm': 'Esta tarefa nao tem formulario configurado.',
    'tasks.submit': 'Enviar formulario e concluir',
    'tasks.saving': 'Enviando...',
    'tasks.directWork': 'Trabalhar agora',
    'tasks.takeTask': 'Assumir tarefa',
    'tasks.missingField': 'Este campo e obrigatorio.',
    'tasks.realtime': 'Caixa sincronizada em tempo real',
    'tasks.initialLoading': 'Carregando tarefas ativas do Camunda...',
    'tasks.instanceReference': 'Instancia',
    'tasks.assignedLabel': 'Atribuida',
    'tasks.availableLabel': 'Disponivel',
    'tasks.workingNow': 'Voce precisa assumir a tarefa antes de trabalhar nela.',
    'tasks.takeHint': 'Voce pode assumir esta tarefa',
    'tasks.takenBy': 'Atribuida a',
    'tasks.areaUnknown': 'Area nao identificada',
    'tasks.processUnknown': 'Processo nao identificado',
    'tasks.instanceUnknown': 'Instancia nao identificada',
    'tasks.noProcess': 'Processo sem nome',
    'tasks.noAssignment': 'Sem atribuicao',
    'tasks.allCamunda': 'Todas as tarefas do Camunda',
    'tasks.mineCount': 'Minhas tarefas',
    'tasks.areaCount': 'Tarefas da minha area',
    'tasks.allCount': 'Todas',
    'tasks.taskTitle': 'Tarefa sem nome',
    'tasks.selectOption': 'Selecione uma opcao',
    'tasks.checkboxHint': 'Marque esta opcao se for o caso.',
    'tasks.fileSelected': 'Arquivo selecionado:',
    'tasks.fileValidation': 'O arquivo sera validado ao seleciona-lo e enviado com o formulario.',
    'tasks.fileLimit': 'O arquivo ultrapassa o limite de 10 MB.',
    'tasks.uploadPending': 'Enviando arquivo...',
    'tasks.formRequired': 'Preencha os campos obrigatorios antes de concluir a tarefa.',
    'tasks.quickCompleteSuccess': 'A tarefa foi concluida com sucesso.',
    'tasks.quickCompleteError': 'Nao foi possivel concluir a tarefa.',
    'tasks.quickOpenError': 'Nao foi possivel abrir a tarefa.',
    'tasks.loadSuccess': 'Tarefas ativas do Camunda carregadas.',
    'tasks.loadError': 'Nao foi possivel carregar as tarefas do Camunda.',
    'tracking.title': 'Acompanhamento da instancia',
    'tracking.subtitle': 'Revise o andamento real do processo, o estado visual do BPMN e a trilha de execucao em um unico lugar.',
    'tracking.back': 'Voltar para tarefas',
    'tracking.refresh': 'Atualizar',
    'tracking.loading': 'Carregando acompanhamento da instancia...',
    'tracking.sync': 'Sincronizacao ao vivo',
    'tracking.lastUpdate': 'Ultima atualizacao:',
    'tracking.initialSync': 'Sincronizacao inicial',
    'tracking.process': 'Processo em acompanhamento',
    'tracking.instance': 'Instancia',
    'tracking.currentState': 'Estado atual',
    'tracking.activeTasks': 'Tarefas ativas',
    'tracking.completedTasks': 'Tarefas concluidas',
    'tracking.pendingTasks': 'Tarefas pendentes',
    'tracking.timeline': 'Linha do tempo de execucao',
    'tracking.viewer': 'Estado visual do BPMN',
    'tracking.viewerHint': 'Mapa do processo',
    'tracking.summary': 'Resumo da instancia',
    'tracking.processUnknown': 'Processo nao identificado',
    'tracking.instanceUnknown': 'Instancia nao identificada',
    'tracking.noTracking': 'Nao foi possivel carregar o acompanhamento da instancia.',
    'tracking.activeState': 'Ativa',
    'tracking.finishedState': 'Finalizada',
    'tracking.noData': 'Sem dados',
    'taskDetail.title': 'Detalhe da tarefa',
    'taskDetail.subtitle': 'Visao detalhada para uma tarefa real do Camunda.',
    'taskDetail.back': 'Voltar',
    'taskDetail.viewTracking': 'Ver acompanhamento',
    'taskDetail.showTechnical': 'Ver mais',
    'taskDetail.hideTechnical': 'Ocultar detalhe tecnico',
    'taskDetail.loading': 'Carregando detalhe...',
    'taskDetail.loadingForm': 'Carregando formulario...',
    'taskDetail.loadingHistory': 'Carregando historico...',
    'taskDetail.name': 'Nome da tarefa',
    'taskDetail.process': 'Processo',
    'taskDetail.area': 'Area',
    'taskDetail.assignedTo': 'Atribuida a',
    'taskDetail.state': 'Estado',
    'taskDetail.created': 'Criada',
    'taskDetail.tracking': 'Acompanhamento',
    'taskDetail.technicalProcess': 'Processo tecnico',
    'taskDetail.technicalInstance': 'Instancia tecnica',
    'taskDetail.taskKey': 'Task Key',
    'taskDetail.form': 'Formulario da tarefa',
    'taskDetail.noForm': 'Esta tarefa nao tem formulario configurado.',
    'taskDetail.selectOption': 'Selecione uma opcao',
    'taskDetail.checkboxHint': 'Marque esta opcao se for o caso.',
    'taskDetail.fileValidation': 'O arquivo sera validado ao seleciona-lo e enviado com o formulario.',
    'taskDetail.fileSelected': 'Arquivo selecionado:',
    'taskDetail.fileUploaded': 'Arquivo carregado:',
    'taskDetail.view': 'Ver',
    'taskDetail.required': 'Este campo e obrigatorio.',
    'taskDetail.history': 'Historico',
    'taskDetail.historyCount': 'tarefa(s) registradas',
    'taskDetail.noHistory': 'Sem registros ainda',
    'taskDetail.historyEmpty': 'Esta execucao nao registrou dados de formulario.',
    'taskDetail.noDetail': 'Nao foi possivel mostrar o detalhe',
    'taskDetail.noId': 'Nao foi recebido o identificador da tarefa.',
    'taskDetail.noDate': 'Sem data',
    'taskDetail.noProcess': 'Processo nao identificado',
    'taskDetail.noInstance': 'Instancia nao identificada',
    'taskDetail.noArea': 'Area nao identificada',
    'taskDetail.noAssignment': 'Sem atribuicao',
    'taskDetail.actionSend': 'Enviar formulario e concluir',
    'taskDetail.actionSending': 'Enviando...',
    'taskDetail.actionLabel': 'Acao pendente',
    'taskDetail.waitTake': 'Voce precisa assumir a tarefa antes de concluir o formulario.',
    'taskDetail.takenBy': 'A tarefa foi assumida por',
    'taskDetail.completeHint': 'Preencha os campos obrigatorios antes de finalizar a tarefa.',
    'taskDetail.completeSuccess': 'A tarefa foi concluida com sucesso.',
    'taskDetail.completeError': 'Nao foi possivel concluir a tarefa.',
    'taskDetail.loadTooLong': 'O carregamento do detalhe demorou demais. Tente atualizar a pagina.',
    'taskDetail.loadError': 'Nao foi possivel carregar o detalhe da tarefa.',
    'taskDetail.formMissing': 'Esta tarefa nao tem formulario configurado.',
    'taskDetail.historyMissing': 'Esta tarefa ainda nao possui historico disponivel.',
    'taskDetail.fileTooLarge': 'O arquivo ultrapassa o limite de 10 MB.',
    'taskDetail.fileAttached': 'Arquivo anexado',
    'taskDetail.noTaskName': 'Tarefa sem nome',
    'taskDetail.noUser': 'Usuario nao identificado',
    'taskDetail.noProcessLabel': 'Sem processo',
    'taskDetail.fieldUnnamed': 'Campo sem nome',
    'taskDetail.instancePrefix': 'Instancia #',
    'processes.families': 'Familias de processos',
    'processes.subtitle': 'Cada familia agrupa suas versoes. Escolha uma versao para abri-la ou criar uma nova.',
    'processes.pageSubtitle': 'Gerencie rascunhos, publique versoes e supervise o ciclo de vida de cada processo em uma unica tela.',
    'processes.loading': 'Carregando processos...',
    'processes.empty': 'Ainda nao ha processos salvos.',
    'processes.back': 'Voltar ao painel',
    'processes.pageTitle': 'Processos BPM',
    'processes.create': 'Novo processo',
    'processes.refresh': 'Atualizar',
    'processes.familyBack': 'Voltar para processos',
    'processes.familyTitle': 'Versoes do processo',
    'processes.familySubtitle': 'Revise as versoes desta familia, seu estado e as acoes disponiveis.',
    'processes.familyMissing': 'A familia de processo nao foi encontrada.',
    'processes.familyEmpty': 'Nao ha versoes para mostrar nesta familia.',
    'processes.searchLabel': 'Buscar',
    'processes.searchPlaceholder': 'Nome, chave ou versao',
    'processes.statusAll': 'Todos',
    'processes.statusDraft': 'Rascunhos',
    'processes.statusPublished': 'Publicados',
    'processes.statusHistoric': 'Historicos',
    'processes.filtersTitle': 'Filtros',
    'processes.filtersHint': 'Use filtros para encontrar rapidamente um processo, seu estado ou versao.',
    'processes.statusLabel': 'Estado',
    'processes.orderLabel': 'Ordenar por',
    'processes.sortLabel': 'Ordenar',
    'processes.sortRecent': 'Mais recentes',
    'processes.sortName': 'Nome',
    'processes.sortVersion': 'Versao',
    'processes.clearFilters': 'Limpar filtros',
    'processes.totalCount': 'Total de processos',
    'processes.visibleCount': 'Mostrando',
    'processes.emptyTitle': 'Sem resultados',
    'processes.emptyDescription': 'Tente ajustar os filtros ou crie um novo processo para comecar.',
    'processes.loadError': 'Nao foi possivel carregar a lista de processos.',
    'processes.createSuccess': 'Processo criado com sucesso.',
    'processes.createError': 'Nao foi possivel criar o processo.',
    'processes.publishSuccess': 'Processo publicado e implantado com sucesso.',
    'processes.publishError': 'Nao foi possivel publicar o processo.',
    'processes.startSuccess': 'Instancia iniciada com sucesso.',
    'processes.startError': 'Nao foi possivel iniciar a instancia do processo.',
    'processes.versionSuccess': 'Uma nova versao foi criada com sucesso.',
    'processes.versionError': 'Nao foi possivel criar a nova versao do processo.',
    'processes.validationError': 'O processo nao atende a validacao necessaria.',
    'processes.version': 'Versao',
    'processes.versions': 'versoes',
    'processes.draft': 'RASCUNHO',
    'processes.published': 'PUBLICADO',
    'processes.historic': 'HISTORICO',
    'processes.lastActivity': 'Ultima atividade:',
    'processes.edit': 'Editar',
    'processes.viewDetails': 'Ver detalhe',
    'processes.publishing': 'Publicando...',
    'processes.publish': 'Publicar',
    'processes.versioning': 'Criando versao...',
    'processes.createVersion': 'Criar versao',
    'processes.starting': 'Iniciando...',
    'processes.startProcess': 'Iniciar processo',
    'processes.executeInCamunda': 'Executar esta versao no Camunda',
    'processes.monitorCycle': 'Monitorar ciclo',
  },
};

@Injectable({
  providedIn: 'root',
})
export class UiPreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly themeSignal = signal<ThemePreference>(this.readThemePreference());
  private readonly languageSignal = signal<LanguagePreference>(this.readLanguagePreference());
  private readonly settingsPanelOpenSignal = signal(false);

  readonly theme = this.themeSignal.asReadonly();
  readonly language = this.languageSignal.asReadonly();
  readonly settingsPanelOpen = this.settingsPanelOpenSignal.asReadonly();
  readonly isDarkMode = computed(() => this.themeSignal() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.themeSignal();
      const language = this.languageSignal();
      const root = this.document.documentElement;

      root.dataset['theme'] = theme;
      root.lang = language;
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    });
  }

  setTheme(theme: ThemePreference): void {
    this.themeSignal.set(theme);
  }

  toggleTheme(): void {
    this.themeSignal.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  setLanguage(language: LanguagePreference): void {
    this.languageSignal.set(language);
  }

  openSettingsPanel(): void {
    this.settingsPanelOpenSignal.set(true);
  }

  closeSettingsPanel(): void {
    this.settingsPanelOpenSignal.set(false);
  }

  toggleSettingsPanel(): void {
    this.settingsPanelOpenSignal.update((value) => !value);
  }

  translate(key: TranslationKey): string {
    return TRANSLATIONS[this.languageSignal()][key] ?? TRANSLATIONS.es[key] ?? key;
  }

  private readThemePreference(): ThemePreference {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private readLanguagePreference(): LanguagePreference {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'es' || storedLanguage === 'en' || storedLanguage === 'pt') {
      return storedLanguage;
    }

    return 'es';
  }
}
