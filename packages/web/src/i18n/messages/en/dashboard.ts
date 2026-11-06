const dashboard = {
  home: {
    welcome: "Welcome {name} 👋",
    monitoring: "General network and system monitoring.",
    subtitle: "Operational system summary.",
    quickStats: "Quick stats",
    shortcuts: "Shortcuts",
    stats: {
      onlineDevices: "Devices online",
      ofRegistered: "of {count} registered",
      activeAlerts: "Active alerts",
      noIncidents: "no open incidents · {total} total",
      worstSeverity: "worst severity: {severity}",
      scheduledTasks: "Scheduled tasks",
      configured: "{count} configured",
      registeredUsers: "Registered users",
      session: "Session: {user}",
    },
    severityChart: {
      title: "Alerts by severity",
      total: "{count} total",
      empty:
        "No alerts recorded yet. When a topology reports an event it will appear here.",
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
    },
    recentAlerts: {
      title: "Recent alerts",
      unresolved: "{count} unresolved",
      empty: "No alerts recorded. Topology events will appear here.",
      resolved: "Resolved",
    },
    topology: {
      title: "Active topology",
      noDescription: "No description recorded.",
      open: "Open in the workspace",
      empty: "There are no topologies yet. Create one to see the workspace.",
      goToTopologies: "Go to topologies",
    },
    quickAccess: {
      terminal: "Terminal",
      terminalHint: "SSH and Telnet consoles",
      chat: "AI Chat",
      chatHint: "Network assistant",
      skills: "Skills",
      skillsHint: "New agent capabilities",
      connections: "Connections",
      connectionsHint: "Configured devices and services",
    },
  },
  chart: {
    empty: "No data to display.",
  },
  deviceMetrics: {
    total: "Total devices",
    routers: "Routers",
    switches: "Switches",
    endDevices: "End devices / PCs",
    others: "Others",
  },
  providers: {
    title: "LLM model providers",
    description:
      "Manage the cloud and local models available to the network agent.",
  },
  resources: {
    title: "User manual",
    description:
      "Step-by-step guide to configure and operate every Packet Tools tab.",
  },
  topology: {
    title: "Topology management",
    description:
      "General information about the topologies generated on the network. (in progress)",
  },
  metadata: {
    home: {
      title: "Monitoring Dashboard",
      description: "System metrics and real-time network monitoring",
    },
    alert: {
      title: "Alerts",
      description: "Network incident logging, auditing and resolution",
    },
    chat: {
      title: "Chat",
      description:
        "Multimodal agentic chat: your virtual assistant for device configuration, commands, logs and alerts",
    },
    configuration: {
      title: "Settings",
      description: "Sound preferences and system settings",
    },
    connection: {
      title: "Connections",
      description: "Management of registered network devices",
    },
    data: {
      title: "Knowledge Base",
      description: "Management of documents and technical manuals for the AI",
    },
    jobs: {
      title: "Automation",
      description:
        "Management and scheduling of network automations with AI or manual scripts.",
    },
    log: {
      title: "Logs",
      description: "History of events generated on the network",
    },
    providers: {
      title: "AI Providers",
      description: "CRUD management of AI model providers",
    },
    resources: {
      title: "User Manual",
      description:
        "Documentation hub with cheat sheets, templates and references",
    },
    skills: {
      title: "Skills",
      description:
        "Administration and management of playbooks that extend the AI agent's capabilities",
    },
    terminal: {
      title: "Terminal",
      description:
        "Access to the network terminal to run commands and scripts on connected devices",
    },
    topology: {
      title: "Topologies",
      description: "Network topology management",
    },
    users: {
      title: "Users",
      description: "NOC operators directory",
    },
    workspace: {
      title: "Workspace",
      description: "Network topology workspace",
    },
    workspaceDetail: {
      title: "Workspace",
      description: "Network topology editor",
    },
  },
};

export default dashboard;
