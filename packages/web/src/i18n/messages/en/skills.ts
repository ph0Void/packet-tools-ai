const skills = {
  title: "Skills",
  subtitlePrefix:
    "Playbooks the agent loads on demand. The prompt only receives the identifier and the description; the procedure is requested when needed, and the user can invoke it with",
  subtitleSuffix: ".",
  new: "New skill",
  form: {
    editTitle: "Edit skill",
    createTitle: "New skill",
    titleLabel: "Title",
    titlePlaceholder: "Configure OSPF area 0",
    whenToUse: "When to use it",
    whenToUsePlaceholder: "One sentence: what it is for and when to apply it",
    identifier: "Identifier:",
    identifierHintStart: "It does not change on rename, so the mentions",
    identifierHintEnd: "keep resolving.",
    content: "Content (Markdown)",
    contentTemplate: "# When to use it\n\n# Steps\n\n1. ",
    contentHint:
      "The agent only receives the title and the description; the content is read on demand, so it should be precise and actionable.",
    saveChanges: "Save changes",
    create: "Create skill",
    disabled: "disabled",
  },
  empty: {
    title: "There are no skills yet.",
    hint: "Ask the agent in the chat: «create a skill to configure VLANs».",
  },
  actions: {
    close: "Close",
    enable: "Enable {title}",
    disable: "Disable {title}",
    edit: "Edit {title}",
    delete: "Delete {title}",
  },
  toasts: {
    createFailed: "The skill could not be created.",
    updateFailed: "The skill could not be updated.",
    deleteFailed: "The skill could not be deleted.",
    deleteConfirm:
      "Delete the skill «{title}»? It cannot be undone and the agent will no longer be able to use it.",
    toggleFailed: "The skill status could not be changed.",
  },
};

export default skills;
