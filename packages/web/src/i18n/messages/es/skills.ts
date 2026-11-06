const skills = {
  title: "Skills",
  subtitlePrefix:
    "Playbooks que el agente carga bajo demanda. El prompt sólo recibe el identificador y la descripción; el procedimiento se pide cuando hace falta, y el usuario puede invocarlo con",
  subtitleSuffix: ".",
  new: "Nueva skill",
  form: {
    editTitle: "Editar skill",
    createTitle: "Nueva skill",
    titleLabel: "Título",
    titlePlaceholder: "Configurar OSPF área 0",
    whenToUse: "Cuándo usarla",
    whenToUsePlaceholder: "Una frase: para qué sirve y cuándo aplicarla",
    identifier: "Identificador:",
    identifierHintStart:
      "No cambia al renombrar, para que las menciones",
    identifierHintEnd: "sigan resolviendo.",
    content: "Contenido (Markdown)",
    contentTemplate: "# Cuándo usarla\n\n# Pasos\n\n1. ",
    contentHint:
      "El agente recibe sólo el título y la descripción; el contenido se lee bajo demanda, así que conviene que sea preciso y accionable.",
    saveChanges: "Guardar cambios",
    create: "Crear skill",
    disabled: "deshabilitada",
  },
  empty: {
    title: "Todavía no hay skills.",
    hint: "Pídele al agente en el chat: «crea una skill para configurar VLANs».",
  },
  actions: {
    close: "Cerrar",
    enable: "Habilitar {title}",
    disable: "Deshabilitar {title}",
    edit: "Editar {title}",
    delete: "Eliminar {title}",
  },
  toasts: {
    createFailed: "No se pudo crear la skill.",
    updateFailed: "No se pudo actualizar la skill.",
    deleteFailed: "No se pudo eliminar la skill.",
    deleteConfirm:
      "¿Eliminar la skill «{title}»? No se puede deshacer y el agente dejará de poder usarla.",
    toggleFailed: "No se pudo cambiar el estado de la skill.",
  },
};

export default skills;
