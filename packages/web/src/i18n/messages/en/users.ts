const users = {
  list: {
    title: "Users",
    subtitle: "Manage the system users",
    register: "Register Operator",
    table: {
      user: "User",
      role: "Role",
      createdAt: "Registration date",
      actions: "Actions",
      empty: "No operators found.",
      showing: "Showing {count} of {total} users",
      previous: "Previous",
      next: "Next",
      page: "Page {page} of {total}",
    },
    actions: {
      edit: "Edit operator",
      editAria: "Edit {name}",
      delete: "Delete operator",
      deleteAria: "Delete {name}",
    },
    deleteConfirm:
      "Delete operator {name}? This will remove all their associations.",
    toasts: {
      deleted: "Operator deleted successfully.",
      deleteFailed: "The operator could not be deleted.",
      deleteError: "An error occurred while deleting.",
    },
  },
  modal: {
    createTitle: "Register New Operator",
    editTitle: "Edit Operator",
    username: "Username",
    usernamePlaceholder: "e.g. admin_noc",
    password: "Password",
    keepPassword: "Leave blank to keep current",
    passwordPlaceholder: "••••••••",
    newPasswordPlaceholder: "Enter a strong password",
    role: "System Role",
    roleUser: "USER (Basic read-only access)",
    roleStaff: "STAFF (Network monitoring and support)",
    roleAdmin: "ADMIN (Full system control)",
    processing: "Processing...",
    register: "Register",
    saveChanges: "Save Changes",
  },
};

export default users;
