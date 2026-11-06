const dashboard = {
  home: {
    welcome: "Bienvenido {name} 👋",
    monitoring: "Monitoreo general de red y sistema.",
    subtitle: "Resumen operativo del sistema.",
    quickStats: "Estadísticas rápidas",
    shortcuts: "Accesos directos",
    stats: {
      onlineDevices: "Equipos online",
      ofRegistered: "de {count} registrados",
      activeAlerts: "Alertas activas",
      noIncidents: "sin incidencias abiertas · {total} en total",
      worstSeverity: "peor severidad: {severity}",
      scheduledTasks: "Tareas programadas",
      configured: "{count} configuradas",
      registeredUsers: "Usuarios registrados",
      session: "Sesión: {user}",
    },
    severityChart: {
      title: "Alertas por severidad",
      total: "{count} en total",
      empty:
        "Ninguna alerta registrada todavía. Cuando una topología reporte un evento aparecerá aquí.",
      critical: "Crítica",
      high: "Alta",
      medium: "Media",
      low: "Baja",
    },
    recentAlerts: {
      title: "Alertas recientes",
      unresolved: "{count} sin resolver",
      empty:
        "Ninguna alerta registrada. Los eventos de las topologías aparecerán aquí.",
      resolved: "Resuelta",
    },
    topology: {
      title: "Topología activa",
      noDescription: "Sin descripción registrada.",
      open: "Abrir en el workspace",
      empty: "Todavía no hay topologías. Crea una para ver el workspace.",
      goToTopologies: "Ir a topologías",
    },
    quickAccess: {
      terminal: "Terminal",
      terminalHint: "Consolas SSH y Telnet",
      chat: "Chat IA",
      chatHint: "Asistente de red",
      skills: "Skills",
      skillsHint: "Nuevas capacidades del agente",
      connections: "Conexiones",
      connectionsHint: "Dispositivos y servicios configurados",
    },
  },
  chart: {
    empty: "Sin datos para mostrar.",
  },
  deviceMetrics: {
    total: "Dispositivos Totales",
    routers: "Routers",
    switches: "Switches",
    endDevices: "End Devices / PCs",
    others: "Others",
  },
  providers: {
    title: "Proveedores de Modelos LLM",
    description:
      "Administra los modelos cloud y locales disponibles para el agente de red.",
  },
  resources: {
    title: "Manual del usuario",
    description:
      "Guía paso a paso para configurar y operar todas las pestañas de Packet Tools.",
  },
  topology: {
    title: "Gestión de Topologías",
    description:
      "Información general de las topologías que se generan en la red. (en desarrollo)",
  },
  metadata: {
    home: {
      title: "Panel de Monitoreo General",
      description: "Métricas del sistema y monitoreo de red en tiempo real",
    },
    alert: {
      title: "Alertas",
      description: "Registro, auditoría y resolución de incidencias de red",
    },
    chat: {
      title: "Chat",
      description:
        "Chat agéntico multimodal, donde tu asistente virtual te ayuda en tu trabajo con la configuración de dispositivos, comandos, logs y alertas",
    },
    configuration: {
      title: "Configuración",
      description: "Preferencias de sonido y ajustes del sistema",
    },
    connection: {
      title: "Conexiones",
      description: "Gestión de dispositivos de red registrados",
    },
    data: {
      title: "Base de Conocimiento",
      description: "Gestión de documentos y manuales técnicos para la IA",
    },
    jobs: {
      title: "Automatización",
      description:
        "Gestión y programación de automatizaciones de red con IA o scripts manuales.",
    },
    log: {
      title: "Logs",
      description: "Historial de eventos generados en la red",
    },
    providers: {
      title: "Proveedores de IA",
      description: "Gestión CRUD de proveedores de modelos de IA",
    },
    resources: {
      title: "Manual de Usuario",
      description:
        "Centro de documentación con cheat sheets, plantillas y referencias",
    },
    skills: {
      title: "Habilidades",
      description:
        "Administración y gestión de playbooks para ampliar las capacidades del agente IA",
    },
    terminal: {
      title: "Terminal",
      description:
        "Acceso a la terminal de red para ejecutar comandos y scripts en dispositivos conectados",
    },
    topology: {
      title: "Topologías",
      description: "Gestión de topologías de red",
    },
    users: {
      title: "Usuarios",
      description: "Directorio de operadores del NOC",
    },
    workspace: {
      title: "Workspace",
      description: "Workspace de topologías de red",
    },
    workspaceDetail: {
      title: "Workspace",
      description: "Editor de topología de red",
    },
  },
};

export default dashboard;
