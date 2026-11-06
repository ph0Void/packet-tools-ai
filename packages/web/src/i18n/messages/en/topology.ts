const topology = {
  table: {
    name: "Name",
    description: "Description",
    createdAt: "Creation date",
    actions: "Actions",
    empty: "No topologies found.",
    showing: "Showing {count} of {total} topologies",
    previous: "Previous",
    next: "Next",
    page: "Page {page} of {total}",
  },
  list: {
    noDescription: "No description",
    load: "Load",
    actions: {
      edit: "Edit topology",
      editAria: "Edit {name}",
      delete: "Delete topology",
      deleteAria: "Delete {name}",
    },
    deleteTitle: "Delete {name}",
    deleteFallbackName: "topology",
    deleteDescription:
      "The topology and its diagram will be deleted. This action cannot be undone.",
    deleteConfirm: "Delete",
    toasts: {
      fetchFailed: "The topology could not be retrieved.",
      saveFailed: "The topology could not be saved.",
      updated: "Topology updated.",
      updateError: "An error occurred while updating the topology.",
      deleted: "Topology deleted.",
      deleteFailed: "The topology could not be deleted.",
      deleteError: "An error occurred while deleting.",
    },
  },
  edit: {
    title: "Edit Topology",
    description: "Change the name and description. The diagram is preserved.",
    name: "Name",
    namePlaceholder: "e.g. Headquarters LAN Topology",
    nameRequired: "The topology name is required.",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Short description of the topology",
    saveChanges: "Save changes",
  },
};

export default topology;
