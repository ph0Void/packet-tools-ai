const workspace = {
  header: {
    backToTopologies: "Volver a topologías",
    newTopology: "Nueva Topología",
    syncLive: "Sincronizar Live",
    reloadTitle: "Recargar topología desde la base de datos",
    reloadSr: "Recargar desde la base de datos",
    clear: "Limpiar",
    save: "Guardar Topología",
    update: "Actualizar",
    readOnly: "Modo solo lectura",
  },
  toasts: {
    emptyLive:
      "Packet Tracer no reporta una topología activa (0 dispositivos)",
    synced: "Sincronizado: {devices} dispositivos, {links} enlaces",
    syncError: "No se pudo sincronizar con Packet Tracer",
    nameRequired: "Por favor ingresa un nombre para la topología",
    emptyCanvas: "No hay nada que guardar: el lienzo está vacío",
    saved: "Topología guardada con éxito",
    saveError: "Error al guardar la topología",
    saveUnexpected: "Error inesperado al guardar la topología",
    cleared: "Lienzo limpiado",
  },
  saveDialog: {
    title: "Guardar Topología",
    description:
      "Guarda el estado actual del diagrama de red en la base de datos.",
    nameLabel: "Nombre de la Topología",
    namePlaceholder: "Ej. Topología de Laboratorio 1",
    descriptionLabel: "Descripción",
    descriptionPlaceholder: "Describe brevemente la configuración de red...",
    saving: "Guardando...",
    confirmUpdate: "Confirmar Actualización",
    confirmSave: "Confirmar Guardado",
  },
  inspector: {
    aria: "Detalles de {name}",
    close: "Cerrar inspector",
    status: "Estado",
    powerOn: "Encendido",
    powerAria: "Encendido (solo lectura)",
    operability: "Operatividad",
    info: "Información",
    position: "Posición",
    interfaces: "Interfaces ({count})",
    noInterfaces: "Sin interfaces reportadas.",
    name: "Nombre",
    ip: "IP",
    mask: "Máscara",
    statusLabels: {
      online: "En línea",
      offline: "Fuera de línea",
      error: "Con errores",
    },
  },
  index: {
    emptyTitle: "No hay topología cargada",
    emptyDescription:
      "El puente lee en tiempo real la topología abierta en Packet Tracer y la dibuja aquí.",
    syncing: "SINCRONIZANDO...",
    connectLive: "CONECTAR WORKSPACE LIVE",
    connecting: "CONECTANDO AL PUENTE...",
    notDetected: "PUENTE PT NO DETECTADO",
    savedTopologies: "Ver Topologías Guardadas",
    toasts: {
      empty: "Topología vacía: abre tu proyecto en Packet Tracer",
      loaded: "{devices} dispositivos, {links} enlaces cargados",
      readError: "No se pudo leer la red desde Packet Tracer",
    },
  },
  bridge: {
    live: "LIVE PT",
    connecting: "CONECTANDO",
    local: "LOCAL",
  },
};

export default workspace;
