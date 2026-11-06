const configuration = {
  page: {
    title: "Configuración",
    description: "Preferencias de sonido y ajustes del sistema.",
  },
  sounds: {
    title: "Preferencias de sonido",
    subtitle:
      "Sonidos de la interfaz para los eventos clave. Se guardan solo en este navegador.",
    enabled: "Activados",
    disabled: "Desactivados",
    masterAria: "Activar o desactivar los sonidos",
    volume: "Volumen",
    preview: "Probar",
    previewAria: "Probar sonido de {event}",
    reset: "Restablecer valores",
    footnote:
      "Los sonidos se generan localmente con Web Audio API, sin archivos ni librerías externas. Tu preferencia solo se guarda en este navegador.",
    events: {
      agentComplete: {
        label: "Agente termina",
        description: "Cuando el asistente finaliza su respuesta en el chat.",
      },
      error: {
        label: "Error",
        description:
          "Cuando algo falla: sin conexión, validación o acción rechazada.",
      },
      create: {
        label: "Crear",
        description:
          "Al crear dispositivos, automatizaciones, skills, usuarios y más.",
      },
      update: {
        label: "Actualizar",
        description: "Al guardar cambios sobre elementos existentes.",
      },
      upload: {
        label: "Subida de archivos",
        description: "Al subir un documento a la base de conocimiento.",
      },
    },
  },
  agentLogs: {
    title: "Activar logs",
    description: "Captura el registro de actividad de los agentes.",
    saving: "Guardando…",
    enabled: "Activada",
    disabled: "Desactivada",
    aria: "Activar o desactivar el registro de la traza del agente",
    error: "No se pudo cambiar el registro de la traza.",
  },
  systemPrompt: {
    title: "Prompt del Sistema",
    description:
      "Instrucciones globales que recibe el agente de red en cada sesión.",
    label: "Contenido del prompt",
    placeholder: "Eres un asistente experto en redes...",
    hint: "Se aplica a los agentes de chat, terminales y topologías.",
    saving: "Guardando...",
    save: "Guardar Prompt",
  },
  models: {
    title: "Proveedores de Inteligencia Artificial",
    description:
      "Compatible con OpenAI, Google Gemini, Anthropic, Ollama, LM Studio y otros.",
    add: "Añadir",
    columnName: "Nombre",
    columnProvider: "Proveedor",
    columnModel: "Modelo",
    columnType: "Tipo",
    columnUrl: "URL / Endpoint",
    columnApiKey: "API Key",
    columnStatus: "Estado",
    columnActions: "Acciones",
    loading: "Cargando modelos...",
    empty: "No hay modelos de IA configurados. Agrega uno nuevo para comenzar.",
    defaultCloud: "Cloud por defecto",
    toggleAria: "Activar o desactivar {name}",
    editAria: "Editar {name}",
    deleteAria: "Eliminar {name}",
    newTitle: "Nuevo Proveedor de Modelo",
    editTitle: "Editar Proveedor de Modelo",
    fields: {
      name: "Nombre del modelo",
      namePlaceholder: "Ej: deepseek-v4.1-flash, claude-haiku-5.5",
      provider: "Proveedor",
      typeModel: "Tipo de modelo",
      modelId: "ID del modelo",
      modelIdPlaceholder:
        "Ej: deepseek/deepseek-v4.1-flash, anthropic/claude-haiku-5.5",
      baseUrl: "URL base",
      baseUrlPlaceholder: "Ej: http://127.0.0.1:1234/v1",
      defaultEndpoint: "Endpoint por defecto de {provider}:",
      apiKey: "API Key",
      apiKeyOptional: "(opcional)",
      apiKeyPlaceholderEdit:
        "[configured] — deja vacío para conservar la actual",
      apiKeyPlaceholderNew: "sk-...",
      temperature: "Temperatura",
      permissions: "Permisos",
      permissionsPlaceholder: "USER,STAFF,ADMIN (opcional)",
      active: "Activo",
      activeHint: "Los modelos inactivos no se asignan al agente.",
      activeAria: "Activar modelo",
    },
    providers: {
      custom: "Personalizado (OpenAI-compatible)",
    },
    testing: "Probando…",
    test: "Probar Conexión",
    cancel: "Cancelar",
    save: "Guardar Configuración",
    toasts: {
      loadError: "Error al cargar los proveedores de modelos.",
      required: "El nombre y el modelo son obligatorios.",
      temperatureRange: "La temperatura debe estar entre 0 y 2.",
      saved: "Proveedor de modelo guardado.",
      saveError: "Error al guardar el modelo.",
      activated: "Modelo activado.",
      deactivated: "Modelo desactivado.",
      toggleError: "No se pudo cambiar el estado del modelo.",
      deleteConfirm:
        '¿Eliminar el proveedor de modelo "{name}"? Esta acción no se puede deshacer.',
      deleted: "Modelo eliminado correctamente.",
      deleteError: "Error al eliminar el modelo.",
      modelNameRequired: "Define el nombre exacto del modelo antes de validar.",
      apiKeyMissing: "Falta la API Key para este proveedor.",
      testOk: "Conexión correcta.",
      testError: "No se pudo completar la prueba de conexión.",
    },
  },
};

export default configuration;
