const logs = {
  header: {
    title: "Registros",
    description: "Historial de eventos del sistema y de la traza del agente.",
  },
  filters: {
    level: "Nivel",
    levelPlaceholder: "Filtrar por nivel",
    all: "TODOS",
    search: "Buscar",
    searchPlaceholder: "Buscar en la página actual...",
  },
  actions: {
    exportJson: "Exportar JSON",
    exportCsv: "Exportar CSV",
    clear: "Vaciar historial",
  },
  info: "Solo ves tus propios registros. Como administrador, el listado incluye los de todos los usuarios y las ejecuciones programadas.",
  table: {
    date: "Fecha",
    level: "Nivel",
    content: "Contenido",
    actor: "Actor",
    actions: "Acciones",
    empty: "No se encontraron logs disponibles.",
    showing: "Mostrando",
    of: "de",
    entries: "logs",
    previous: "Anterior",
    page: "Pág. {current} de {total}",
    next: "Siguiente",
  },
  row: {
    system: "Sistema",
    delete: "Eliminar log",
  },
  clearDialog: {
    title: "Vaciar historial de logs",
    description:
      "Se eliminarán todos los registros del sistema de forma permanente. Esta acción no se puede deshacer.",
    cancel: "Cancelar",
    confirm: "Vaciar todo",
  },
  toasts: {
    clearError: "Error al vaciar el historial.",
    cleared: "Historial vaciado.",
    deleteError: "Error al eliminar el log.",
    deleted: "Log eliminado.",
  },
};

export default logs;
