const logs = {
  header: {
    title: "Logs",
    description: "History of system events and the agent trace.",
  },
  filters: {
    level: "Level",
    levelPlaceholder: "Filter by level",
    all: "ALL",
    search: "Search",
    searchPlaceholder: "Search the current page...",
  },
  actions: {
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    clear: "Clear history",
  },
  info: "You only see your own entries. As an administrator, the list includes every user's entries and the scheduled runs.",
  table: {
    date: "Date",
    level: "Level",
    content: "Content",
    actor: "Actor",
    actions: "Actions",
    empty: "No logs available.",
    showing: "Showing",
    of: "of",
    entries: "logs",
    previous: "Previous",
    page: "Page {current} of {total}",
    next: "Next",
  },
  row: {
    system: "System",
    delete: "Delete log",
  },
  clearDialog: {
    title: "Clear log history",
    description:
      "Every system entry will be permanently deleted. This action cannot be undone.",
    cancel: "Cancel",
    confirm: "Clear all",
  },
  toasts: {
    clearError: "Error clearing the history.",
    cleared: "History cleared.",
    deleteError: "Error deleting the log.",
    deleted: "Log deleted.",
  },
};

export default logs;
