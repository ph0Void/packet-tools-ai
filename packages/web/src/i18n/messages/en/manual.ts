const manual = {
  page: {
    title: "Documentation Center",
    subtitle:
      "Step-by-step guide to every tab in the system, with quick references for network operators.",
    searchPlaceholder: "Search the manual...",
    searchAria: "Search the manual",
    index: "Manual index",
    sections: "Sections",
    noResultsPrefix: "No sections found for",
  },
  primitives: {
    field: "Field",
    description: "Description",
    example: "Example",
    copied: "Copied to clipboard.",
    copyError: "Could not copy to clipboard.",
    copyAria: "Copy to clipboard",
  },
  sections: {
    primerosPasos: {
      title: "Getting started",
      description: "What Packet Tools is and how to start in 3 steps.",
      keywords: ["login", "session", "sign up", "start", "welcome"],
    },
    inicio: {
      title: "Home",
      description: "The main screen: an overview of your network at a glance.",
      keywords: ["dashboard", "panel", "summary", "home"],
    },
    alertas: {
      title: "Alerts",
      description: "Where network problems are recorded and resolved.",
      keywords: ["incident", "notice", "severity", "resolve", "report"],
    },
    chat: {
      title: "Chat",
      description:
        "Your AI assistant: ask it in plain words.",
      keywords: ["assistant", "ai", "conversation", "chat", "ask"],
    },
    agente: {
      title: "Agent",
      description:
        "Who does the work: per-device helpers and their tools.",
      keywords: [
        "agent",
        "subagent",
        "subagents",
        "tools",
        "packet tracer",
        "gns3",
        "ssh",
        "telnet",
        "serial",
        "planning",
        "hitl",
        "approval",
        "autonomous",
      ],
    },
    conexiones: {
      title: "Connections",
      description:
        "Your list of network devices to use from the Chat and the Terminal.",
      keywords: [
        "devices",
        "equipment",
        "ssh",
        "telnet",
        "serial",
        "gns3",
        "packet tracer",
        "add",
      ],
    },
    terminal: {
      title: "Terminal",
      description:
        "A direct window to your device to type into it and read its response.",
      keywords: ["console", "commands", "connect", "terminal"],
    },
    automatizaciones: {
      title: "Automations",
      description: "Jobs that run on their own on the day and time you choose.",
      keywords: ["jobs", "tasks", "schedule", "automatic", "cron"],
    },
    skills: {
      title: "Skills",
      description: "Saved recipes for repeated work.",
      keywords: ["skills", "recipes", "templates", "@skill"],
    },
    logs: {
      title: "Logs",
      description: "The system journal: what happened and when.",
      keywords: ["events", "history", "journal", "error", "view"],
    },
    datos: {
      title: "Data",
      description:
        "The assistant's library: upload documents for it to consult.",
      keywords: ["rag", "documents", "pdf", "library", "@rag"],
    },
    usuarios: {
      title: "Users",
      description: "Who can sign in, what role they have and what they can do.",
      keywords: [
        "operators",
        "accounts",
        "role",
        "admin",
        "staff",
        "user",
        "permissions",
      ],
    },
    configuracion: {
      title: "Settings",
      description:
        "The assistant's brain: which AI answers.",
      keywords: [
        "settings",
        "models",
        "ai",
        "llm",
        "openai",
        "ollama",
        "api key",
      ],
    },
    anexos: {
      title: "Annexes and references",
      description: "Most used commands for Cisco, MikroTik, Huawei and Aruba.",
      keywords: [
        "commands",
        "cisco",
        "mikrotik",
        "huawei",
        "aruba",
        "cheat sheet",
        "references",
      ],
    },
  },
  primerosPasos: {
    welcomeTitle: "Welcome to Packet Tools",
    welcome:
      "Packet Tools is your helper to take care of your network: it warns you about failures, lets you talk to your devices and does tasks for you. You do not need to know commands: write to it like you would to a person from the Chat.",
    steps: {
      account: {
        title: "Create your account",
        description:
          "On the sign-in screen press Sign up, choose a name and a password, and sign in.",
      },
      device: {
        title: "Add a device",
        description:
          "Go to Connections, press New device and save your first device.",
      },
      ask: {
        title: "Ask the assistant for something",
        description:
          "Go to the Chat and write to it, for example: “tell me if my router responds”.",
      },
    },
    referencesTitle: "Reference links",
    referencesIntro: "Programs and downloads you may need.",
    references: {
      plugin: {
        title: "Packet Tracer Plugin",
        description: "Plugin to connect Packet Tracer with the assistant.",
      },
      windows: {
        title: "Install on Windows",
        description: "Packet Tools installer for Windows.",
      },
      linux: {
        title: "Install on Linux",
        description: "Packet Tools installer for Linux.",
      },
      packetTracer: {
        title: "Packet Tracer Simulator",
        description: "Cisco's official network simulator.",
      },
      gns3: {
        title: "GNS3 Installer",
        description: "Open-source network simulator.",
      },
      github: {
        title: "Packet Tools Github",
        description: "Open-source repository.",
      },
    },
  },
  inicio: {
    intro:
      "is the main screen. Here you see at a glance how your network is doing: how many devices are connected, whether there are pending notices and shortcuts to the most used features.",
    howToUse: "How to use it",
    steps: {
      summary: {
        title: "Look at the summary",
        description:
          "The cards above tell you the essentials: connected devices, unattended notices, scheduled tasks and users.",
      },
      shortcuts: {
        title: "Use the shortcuts",
        description:
          "Press Terminal, Chat or Devices to go straight to what you need without searching the menu.",
      },
      alerts: {
        title: "Check the recent notices",
        description:
          "Below you will see the latest notices. If any is red, take care of it first.",
      },
    },
  },
  alertas: {
    intro:
      "is where network problems are recorded (for example, a device that does not respond). Each notice has a severity level: critical, high, medium or low.",
    howToUse: "How to use it",
    steps: {
      report: {
        title: "Report a problem",
        description:
          "Press New Alert, write what is happening and choose how serious it is.",
      },
      search: {
        title: "Search and filter",
        description:
          "Use the search box or the filters to find a notice by its severity or status.",
      },
      resolve: {
        title: "Mark it as resolved",
        description:
          "When the problem is fixed, press Resolve. If it fails again, you can reopen it.",
      },
    },
  },
  chat: {
    intro:
      "is your AI assistant. You write what you need in plain words (for example, “check whether the router responds”) and it either does it or explains how.",
    howToUse: "How to use it",
    steps: {
      write: {
        title: "Write what you need",
        description:
          "In the text box below describe your problem or question and press send.",
      },
      answer: {
        title: "Answer its questions",
        description:
          "If it asks you to confirm or choose a device, press the button it shows you.",
      },
      result: {
        title: "Review the result",
        description:
          "Read the answer and use the Copy button if you want to keep it.",
      },
    },
    tipTitle: "Tip",
    tip: "You can mention a device with @ (for example @Router1), ask it to search your documents with @rag or the internet with @web.",
  },
  agente: {
    intro:
      "is the assistant that lives in the Chat. You ask it for something in plain words and it distributes the work among its helpers (subagents), where each one knows how to handle a type of device or task.",
    howItWorksTitle: "How it works (in plain terms)",
    howItWorks:
      "You write your request once. The agent understands what you need, calls the right helper and shows you the result. If what you ask changes something important on the device, it first asks for permission.",
    planningTitle: "Planning and approval mode (HITL)",
    planning: {
      prefix: "The agent supports",
      planningMode: "planning mode",
      middle:
        ": before touching anything, it shows you its plan step by step in the Chat so you know what it is going to do. And it uses",
      humanApproval: "human approval (HITL)",
      middle2:
        ": when the plan changes something important on the device, a card appears with the steps and two buttons,",
      confirm: "Confirm and Run",
      or: "or",
      cancel: "Cancel",
      suffix:
        ". Nothing runs without your “yes”. With the",
      autonomous: "Autonomous Mode",
      suffix2:
        "switch (STAFF and ADMIN only) the agent acts without asking for permission, except on dangerous actions, which always require your approval.",
    },
    helpersTitle: "The helpers (subagents)",
    helpersHeaders: {
      helper: "Helper",
      canDo: "What it can do",
      tools: "Tools",
    },
    helpers: {
      packetTracer:
        "Builds and reviews practice networks in Cisco Packet Tracer: adds devices, connects cables, sets IP addresses and tests connectivity.",
      gns3:
        "Builds labs in GNS3: creates projects, adds devices, powers them on or off and saves snapshots.",
      ssh:
        "Talks to real devices over SSH (secure connection): reviews their state and applies changes.",
      telnet:
        "Talks to legacy devices over Telnet to review and configure them.",
      serial:
        "Talks to devices over a physical cable (serial port) when there is no network, command by command.",
      knowledge:
        "Looks for answers in your documents and, if they are not there, on the internet.",
      admin:
        "Takes care of the application itself: scheduled tasks, device list, system numbers and skill management.",
      adminTools: "17 (12 + 5 for skills)",
      general:
        "The wildcard: handles mixed jobs or jobs that need several steps.",
      generalTools: "As many as it needs",
    },
    footnote:
      "The counts are with the ADMIN or STAFF role. With the USER role each helper shows fewer tools.",
  },
  conexiones: {
    intro:
      "is your list of network devices (routers, switches and simulators). You add them here once so you can use them from the Chat and the Terminal.",
    typesTitle: "Connection types it supports",
    types: {
      ssh: "SSH: secure connection to real devices (recommended).",
      telnet: "Telnet: for legacy devices that do not have SSH.",
      serial: "Serial Port: over a physical cable, when there is no network.",
      simulation:
        "Simulation / API Bridge: for virtual labs (Packet Tracer and GNS3).",
    },
    accepts:
      "And it accepts Cisco IOS, Huawei VRP, Aruba OS, MikroTik RouterOS, GNS3 Server, Packet Tracer or Generic devices.",
    howToUse: "How to use it",
    steps: {
      add: {
        title: "Add your device",
        description:
          "Press New device, give it a name, choose the connection type, enter its address (IP) and its username and password.",
      },
      test: {
        title: "Check that it responds",
        description:
          "Press Test connection. If the success message appears, it is properly registered.",
      },
      use: {
        title: "Use it",
        description:
          "Press Terminal to open its console, or ask it for things from the Chat.",
      },
    },
  },
  usuarios: {
    intro:
      "is the list of people who can sign in to the system. Only the administrator sees it, and they are the one who creates or removes accounts.",
    howToUse: "How to use it",
    steps: {
      create: {
        title: "Create an account",
        description:
          "Press Register Operator, enter the name, the password and choose the role.",
      },
      manage: {
        title: "Change or remove accounts",
        description:
          "Use the pencil to change the password or role, and the trash bin to delete.",
      },
    },
    rolesTitle: "Roles and permissions",
    rolesIntro:
      "There are 3 user types, from the one that can do the least to the one that can do the most:",
    rolesAnd: "and",
    rolesSuffix: "Each level includes everything from the previous one.",
    tableHeaders: {
      canDo: "What they can do",
    },
    table: {
      view: "View the system",
      chat: "Use the Chat and see their own notices",
      terminal: "Use the Terminal (view only)",
      devices: "Add and manage devices",
      jobs: "Schedule automatic tasks",
      alerts: "See everyone's notices",
      data: "Upload documents to Data",
      approve: "Approve what the assistant does",
      admin: "Manage users, models and delete records",
    },
    menuPrefix: "The menu changes with your role:",
    menuMiddle: "and",
    menuSuffix: "are only visible to ADMIN.",
  },
  terminal: {
    intro:
      "is a direct window to your device, as if you were in front of it typing commands. What you type reaches the device and its response appears on screen.",
    protocolsPrefix: "It supports connections over",
    ssh: "SSH",
    protocolsMiddle: "(secure, recommended),",
    telnet: "Telnet",
    protocolsMiddle2: "(legacy devices) and",
    serial: "Serial port",
    protocolsSuffix:
      "(physical cable). Virtual labs (GNS3 and Packet Tracer) do not open here: they are used from the Chat.",
    howToUse: "How to use it",
    steps: {
      choose: {
        title: "Choose the device",
        description:
          "Select one from your list and press Connect. You will see the Online notice when it is ready.",
      },
      write: {
        title: "Write and read",
        description:
          "Type whatever you want to query and read the device's response in the window.",
      },
      disconnect: {
        title: "Disconnect when done",
        description:
          "Press Disconnect when you finish to release the connection.",
      },
    },
    noDeviceTitle: "If you have no saved device",
    noDevice: {
      manual:
        "Press Manual and connect by typing the address, the username and the password, without saving anything.",
      serial:
        "For a serial cable choose the port (for example COM3) and the speed (usually 9600).",
    },
  },
  tareas: {
    intro:
      "is for leaving scheduled jobs: you tell the system what to do and when, and it runs on its own (for example, “check the devices every Monday at 8”).",
    howToUse: "How to use it",
    steps: {
      schedule: {
        title: "Schedule the task",
        description:
          "Press Schedule Task, give it a name and choose the day and time.",
      },
      describe: {
        title: "Describe what it should do",
        description:
          "Write in your own words what you want it to do, as if you were asking a person.",
      },
      activate: {
        title: "Activate it",
        description:
          "Leave the switch on active and save. If you need it now, use Run Now.",
      },
    },
  },
  logs: {
    intro:
      "is the system journal: everything important that happens is recorded here (who signed in, which task ran, whether something failed). Use it to review what happened.",
    howToUse: "How to use it",
    steps: {
      search: {
        title: "Search what happened",
        description:
          "Type a word in the search box (for example, a device name) or filter by type.",
      },
      read: {
        title: "Read the details",
        description:
          "Each row shows the date and what happened. If something went wrong, it will be marked as an error.",
      },
      export: {
        title: "Download it if you need it",
        description:
          "Use Export to save the list and send it or keep it as a backup.",
      },
    },
  },
  datos: {
    intro:
      "is the assistant's library: here you upload manuals and documents (PDF or text) so the Chat can consult them and answer you based on them.",
    howToUse: "How to use it",
    steps: {
      upload: {
        title: "Upload your document",
        description:
          "Drag your file to the dotted area or press to choose it. Accepts PDF and text up to 25 MB.",
      },
      name: {
        title: "Give it a clear name",
        description:
          "Write a title that identifies it, for example “Router manual”.",
      },
      ask: {
        title: "Ask from the Chat",
        description:
          "In the Chat write @rag next to your question so it searches your documents for the answer.",
      },
    },
  },
  configuracion: {
    intro:
      "is where the administrator chooses the assistant's “brain”: which AI answers and with what general instructions it works.",
    providersTitle: "Providers it supports",
    providers: {
      cloud:
        "In the cloud: OpenAI, Google, Anthropic and OpenRouter (they need their key/API Key).",
      local:
        "On your own machine: Ollama and LM Studio (no key, only the program's address).",
      custom:
        "Custom: any other compatible service, with its address and key.",
    },
    twoThingsTitle: "Two things you must choose",
    twoThings: {
      type: "Model type: CHAT to converse and answer, or EMBEDDING so it understands your Data documents (without an active EMBEDDING the documents are not indexed).",
      prompt:
        "System Prompt: the general instructions the assistant follows in every conversation (for example, how it should answer). You edit and save it with Save Prompt.",
    },
    howToUse: "How to use it",
    steps: {
      add: {
        title: "Add a model",
        description:
          "Press Add Model, choose the provider and the type (CHAT or EMBEDDING), and paste your key if it is a cloud one.",
      },
      test: {
        title: "Test that it works",
        description:
          "Press Test Connection. If it responds correctly, save the changes.",
      },
      activate: {
        title: "Leave it active",
        description:
          "Make sure the Active switch is on so the Chat uses it.",
      },
    },
  },
  skills: {
    intro:
      "are saved recipes: steps already prepared for repeated work (for example, “configure OSPF” or “check a router”). The assistant uses them to do it faster and without mistakes.",
    howToUse: "How to use it",
    steps: {
      create: {
        title: "Create the recipe",
        description:
          "In Skills press New skill, give it a title, write in one sentence when it should be used and paste the steps in the content.",
      },
      use: {
        title: "Use it from the Chat",
        description:
          "In the Chat write @skill: followed by its name (for example @skill:configurar-ospf-area-0) next to your request.",
      },
    },
    exampleTitle: "Example to copy and edit",
    examplePrefix: "Suggested title:",
    exampleTitleSuggestion: "Configure OSPF area 0",
    exampleMiddle: "When to use it:",
    exampleWhen: "To link OSPF routers in area 0 when the network is simple.",
    exampleSuffix: "And this content (use the copy button):",
    exampleLabel: "Example content (Markdown)",
    exampleSkill:
      "# When to use it\n\nWhen OSPF area 0 must be configured between Cisco routers in a simple network.\nDo not use it if the network has more than one area.\n\n# Steps\n\n1. Enter configuration mode: `configure terminal`.\n2. Enable OSPF: `router ospf 1`.\n3. Announce each network: `network <network> <wildcard> area 0`.\n4. Verify neighbors: `show ip ospf neighbor` (it must say FULL).\n5. Check routes: `show ip route | include O`.\n\n# Precautions\n\n- Do not announce interfaces that do not take part in OSPF.\n- Save at the end with `copy running-config startup-config`.",
    guidelinesTitle: "Guidelines for a good skill",
    guidelines: {
      title: "Short and clear title: reading it alone should explain what it does.",
      when: "The “when to use it” in one sentence, including when NOT to use it.",
      steps:
        "Numbered steps, one per action, with the exact command in quotes.",
      caution:
        "Add a Precautions section with what must not be forgotten.",
      precise:
        "Be precise and actionable: the assistant only reads the title and description first, and opens the content only when it needs it.",
    },
    permissionsTitle: "Permissions",
    permissions:
      "STAFF and ADMIN can create and edit skills. Only ADMIN can delete. You can also ask the Chat: “create a skill to…”.",
  },
  anexos: {
    intro:
      "the most used commands by brand, explained in plain words. Each list has its copy button to paste them into the Terminal or ask the Chat to execute them.",
    tableHeaders: {
      command: "Command",
      purpose: "What it is for",
    },
    copy: {
      cisco: "Copy Cisco commands",
      mikrotik: "Copy MikroTik commands",
      huawei: "Copy Huawei commands",
      aruba: "Copy Aruba commands",
    },
    cisco: {
      interfaces: "View interfaces, their IP and whether they are up.",
      running: "View the device's current configuration.",
      routes: "View where the traffic goes out (routes).",
      vlans: "View the internal networks (VLAN) created.",
      save: "Save the configuration so it is not lost.",
      ping: "Test whether there is internet connectivity.",
    },
    mikrotik: {
      addresses: "View the device's IP addresses.",
      routes: "View the outbound routes.",
      interfaces: "View the interfaces and their status.",
      identity: "Give the device a name.",
      password: "Change the password.",
      ping: "Test whether there is connectivity.",
    },
    huawei: {
      interfaces: "View interfaces, their IP and whether they are up.",
      current: "View the current configuration.",
      routes: "View the routing table.",
      vlans: "View the internal networks (VLAN).",
      save: "Save the configuration.",
      ping: "Test whether there is connectivity.",
    },
    aruba: {
      interfaces: "View interfaces and their status.",
      current: "View the current configuration.",
      routes: "View the outbound routes.",
      vlans: "View the internal networks (VLAN).",
      save: "Save the configuration.",
      ping: "Test whether there is connectivity.",
    },
  },
};

export default manual;
