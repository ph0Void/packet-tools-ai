const jobs = {
  header: {
    title: "Tareas y Automatizaciones",
    description:
      "Gestiona tareas programadas y ejecuciones manuales o impulsadas por IA.",
    scheduledOne: "{count} automatización programada",
    scheduledMany: "{count} automatizaciones programadas",
    running: "{count} en ejecución",
    newJob: "Nueva Tarea",
  },
  table: {
    name: "Nombre de la Tarea",
    type: "Tipo",
    target: "Destino",
    schedule: "Programación",
    nextRun: "Próxima Ejecución",
    lastRun: "Última Ejecución",
    status: "Estado",
    active: "Activo",
    actions: "Acciones",
    empty: "No hay tareas o automatizaciones programadas.",
    noTopology: "Sin topología",
    once: "Única",
    recurring: "Recurrente",
    running: "EN CURSO",
  },
  row: {
    runNow: "Ejecutar Ahora",
    running: "Ejecutando…",
    edit: "Editar",
    delete: "Eliminar",
    activateAria: "Activar {name}",
  },
  actionTypes: {
    intelligent: {
      label: "Inteligente (Prompt IA)",
      hint: "El agente de IA opera la red siguiendo tu prompt.",
    },
    standard: {
      label: "Estándar (Script / CLI)",
      hint: "Envía una lista de comandos a un dispositivo.",
    },
  },
  dialog: {
    createTitle: "Programar Nueva Tarea",
    editTitle: "Editar Tarea Programada",
    subtitle: "Define qué se ejecuta, cuándo y sobre qué equipo.",
    general: "Información general",
    nameLabel: "Nombre de la Tarea *",
    namePlaceholder: "Ej: Backup nocturno del switch core",
    descriptionLabel: "Descripción Breve",
    descriptionPlaceholder: "Ej: Ejecuta respaldo de configuración a las 2 AM",
    actionType: "Tipo de acción",
    actionTypeHint: "Define cómo se ejecuta la tarea.",
    actionTypeAria: "Tipo de acción",
    schedule: "Programación",
    scheduleHint:
      "La tarea se ejecuta una sola vez en la fecha y hora elegidas.",
    dateLabel: "Fecha de ejecución *",
    selectDate: "Seleccionar fecha",
    timeLabel: "Hora de ejecución *",
    statusLabel: "Estado",
    activeTask: "Tarea activa",
    activeAria: "Tarea activa",
    willRunOnce: "Se ejecutará una sola vez el {date}",
    expiredKept:
      "La programación ya venció; se conservará tal cual. Elige una nueva fecha y hora para reprogramarla.",
    mustBeFuture: "La fecha debe ser futura.",
    legacyCron:
      "Programación actual: recurrente (cron: {cron}). Selecciona fecha y hora para convertirla en ejecución única.",
    target: "Destino",
    targetHint:
      "El dispositivo es obligatorio: es el equipo que recibe los comandos.",
    device: "Dispositivo",
    deviceRequired: "Dispositivo *",
    devicePlaceholderRequired: "Elige el equipo",
    devicePlaceholderOptional: "Opcional",
    noDevice: "Sin dispositivo",
    commands: "Comandos a ejecutar *",
    commandsHint: "Uno por línea, en el orden en que se enviarán.",
    commandsAria: "Comandos a ejecutar",
    commandsHelp:
      "Se ejecutan en el dispositivo elegido el {date}, no en la consola del navegador.",
    commandsHelpFallback: "día y hora programados",
    commandsCount: "{count} / {max} comandos",
    commandsOver: "Llevas {count} comandos y el máximo es {max}.",
    prompt: "Prompt del Agente de IA",
    promptHint: "Indica qué debe hacer el agente cuando llegue la hora.",
    promptPlaceholder:
      "Ej: Realiza un ping entre los routers principales y genera un reporte...",
    promptAria: "Prompt del Agente de IA",
    promptHelp:
      "Se recomienda que el prompt sea conciso y claro para obtener mejores resultados.",
    cancel: "Cancelar",
    save: "Guardar Tarea",
    deleteTitle: "Eliminar Tarea Programada",
    deleteConfirmStart: "¿Seguro que deseas eliminar",
    deleteConfirmEnd: "? Esta acción no se puede deshacer.",
  },
  toasts: {
    nameRequired: "El nombre de la tarea es obligatorio.",
    selectDateTime: "Selecciona la fecha y hora de ejecución.",
    invalidTime: "Indica una hora de ejecución válida (HH:mm).",
    futureDate: "La fecha debe ser futura.",
    expiredReactivate:
      "Esta tarea ya venció. Selecciona una nueva fecha y hora para reactivarla.",
    commandsRequired:
      "Una automatización estándar necesita al menos un comando: sin ellos fallaría en cada ejecución.",
    commandsMax:
      "El máximo es de {max} comandos por ejecución (has escrito {count}).",
    deviceRequired:
      "Selecciona el dispositivo que hay que comandar: es lo que dice a qué equipo se envían los comandos (una topología no basta).",
    saveError: "Error al guardar la tarea.",
    updated: "Tarea actualizada.",
    created: "Tarea programada creada.",
    expiredOneTime:
      "Esta tarea de ejecución única ya venció. Edítala para elegir una nueva fecha.",
    statusError: "Error actualizando el estado.",
    activated: "Tarea activada.",
    deactivated: "Tarea desactivada.",
    statusUpdateError: "Error actualizando el estado de la tarea.",
    runError: "No se pudo ejecutar la tarea.",
    runFailed: "Error al ejecutar la tarea.",
    deleteError: "Error al eliminar.",
    deleted: "Tarea eliminada.",
    deleteUnexpected: "Error al eliminar la tarea.",
    noResult: "La ejecución no devolvió resultado.",
    runDone: "«{name}» ejecutada en {ms} ms.",
    runFailedDetail: "Falló: {error}",
    runFinishedError: "«{name}» terminó con error.",
  },
  standardNotSupported: {
    gns3: "Las automatizaciones estándar no ejecutan comandos sobre nodos GNS3: no hay forma de abrir una sesión de consola contra un nodo de GNS3 desde el backend. Usa una automatización inteligente (el agente sí sabe operar la topología) o un dispositivo con SSH, Telnet o serie.",
    simulation:
      "Protocolo SIMULATION con tipo de dispositivo '{tipo}' sin ejecución de comandos automática.",
    protocol:
      "Protocolo '{protocolo}' no soportado por las automatizaciones estándar.",
  },
};

export default jobs;
