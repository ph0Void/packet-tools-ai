const users = {
  list: {
    title: "Usuarios",
    subtitle: "Gestione a los usuarios del sistema",
    register: "Registrar Operador",
    table: {
      user: "Usuario",
      role: "Rol",
      createdAt: "Fecha de registro",
      actions: "Acciones",
      empty: "No se encontraron operadores disponibles.",
      showing: "Mostrando {count} de {total} usuarios",
      previous: "Anterior",
      next: "Siguiente",
      page: "Pág. {page} de {total}",
    },
    actions: {
      edit: "Editar operador",
      editAria: "Editar {name}",
      delete: "Eliminar operador",
      deleteAria: "Eliminar {name}",
    },
    deleteConfirm:
      "¿Eliminar al operador {name}? Esta acción borrará todas sus asociaciones.",
    toasts: {
      deleted: "Operador eliminado correctamente.",
      deleteFailed: "No se pudo eliminar al operador.",
      deleteError: "Error al procesar la eliminación.",
    },
  },
  modal: {
    createTitle: "Registrar Nuevo Operador",
    editTitle: "Editar Operador",
    username: "Nombre de Usuario",
    usernamePlaceholder: "Ej: admin_noc",
    password: "Contraseña",
    keepPassword: "Dejar en blanco para no cambiar",
    passwordPlaceholder: "••••••••",
    newPasswordPlaceholder: "Ingrese una contraseña fuerte",
    role: "Rol del Sistema",
    roleUser: "USER (Acceso básico de consulta)",
    roleStaff: "STAFF (Monitoreo de red y soporte)",
    roleAdmin: "ADMIN (Control absoluto de sistema)",
    processing: "Procesando...",
    register: "Registrar",
    saveChanges: "Guardar Cambios",
  },
};

export default users;
