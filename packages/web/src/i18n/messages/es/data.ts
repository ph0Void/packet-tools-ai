const data = {
  header: {
    title: "Base de Conocimiento RAG",
    description:
      "Documentos y manuales técnicos indexados vectorialmente para consulta agéntica.",
  },
  upload: {
    title: "Subir documento",
    hint: "Archivos .pdf, .txt o .md de hasta 25MB. Quedarán indexados para RAG.",
    dropzone: "Arrastra un archivo aquí o haz clic para seleccionarlo",
    selected: "Seleccionado: {name} ({size} MB)",
    formats: ".pdf · .txt · .md · máx 25MB",
    titleLabel: "Título personalizado (opcional)",
    titlePlaceholder: "Ej: Manual de comandos Cisco IOS 15",
    submit: "Subir Documento",
    submitting: "Subiendo e indexando...",
    success: "Documento subido correctamente.",
    ringUploading: "Subiendo documento…",
    ringProcessing: "Procesando e indexando…",
    doneTitle: "Documento subido",
    doneBody: "El documento se añadió a la base de conocimiento.",
    errorTitle: "No se pudo subir",
    errorBody: "Revisa el archivo o inténtalo de nuevo.",
  },
  errors: {
    format: "Formato no permitido. Solo se aceptan archivos .pdf, .txt y .md.",
    size: "El archivo supera el límite de 25MB.",
  },
  list: {
    title: "Documentos indexados",
    hintManage: "Gestiona los documentos disponibles para la IA.",
    hintRead: "Consulta los documentos disponibles para la IA.",
    searchPlaceholder: "Buscar documentos...",
    searchAria: "Buscar documentos",
    columnTitle: "Título",
    columnType: "Tipo",
    columnDate: "Fecha",
    columnActions: "Acciones",
    empty: "No hay documentos en la base de conocimiento.",
    noResults: "Sin resultados para la búsqueda.",
    viewAria: "Ver {title}",
    deleteAria: "Eliminar {title}",
  },
  remove: {
    confirm: '¿Eliminar el documento "{title}" de la base de conocimiento?',
    success: "Documento eliminado.",
    error: "Error al eliminar el documento.",
  },
};

export default data;
