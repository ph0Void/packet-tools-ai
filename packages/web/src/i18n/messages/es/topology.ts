const topology = {
  table: {
    name: "Nombre",
    description: "Descripción",
    createdAt: "Fecha de creación",
    actions: "Acciones",
    empty: "No se encontraron topologías disponibles.",
    showing: "Mostrando {count} de {total} topologías",
    previous: "Anterior",
    next: "Siguiente",
    page: "Pág. {page} de {total}",
  },
  list: {
    noDescription: "Sin descripción",
    load: "Cargar",
    actions: {
      edit: "Editar topología",
      editAria: "Editar {name}",
      delete: "Eliminar topología",
      deleteAria: "Eliminar {name}",
    },
    deleteTitle: "Eliminar {name}",
    deleteFallbackName: "topología",
    deleteDescription:
      "Se eliminará la topología junto con su diagrama. Esta acción no se puede deshacer.",
    deleteConfirm: "Eliminar",
    toasts: {
      fetchFailed: "No se pudo obtener la topología.",
      saveFailed: "No se pudo guardar la topología.",
      updated: "Topología actualizada.",
      updateError: "Error al actualizar la topología.",
      deleted: "Topología eliminada.",
      deleteFailed: "No se pudo eliminar la topología.",
      deleteError: "Error al procesar la eliminación.",
    },
  },
  edit: {
    title: "Editar Topología",
    description: "Modifica el nombre y la descripción. El diagrama se conserva.",
    name: "Nombre",
    namePlaceholder: "Ej: Topología LAN Sede Central",
    nameRequired: "El nombre de la topología es obligatorio.",
    descriptionLabel: "Descripción",
    descriptionPlaceholder: "Descripción breve de la topología",
    saveChanges: "Guardar cambios",
  },
};

export default topology;
