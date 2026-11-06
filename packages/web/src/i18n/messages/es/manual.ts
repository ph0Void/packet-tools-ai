const manual = {
  page: {
    title: "Centro de Documentación",
    subtitle:
      "Guía paso a paso de todas las pestañas del sistema, con referencias rápidas para operadores de red.",
    searchPlaceholder: "Buscar en el manual...",
    searchAria: "Buscar en el manual",
    index: "Índice del manual",
    sections: "Secciones",
    noResultsPrefix: "No se encontraron secciones para",
  },
  primitives: {
    field: "Campo",
    description: "Descripción",
    example: "Ejemplo",
    copied: "Copiado al portapapeles.",
    copyError: "No se pudo copiar al portapapeles.",
    copyAria: "Copiar al portapapeles",
  },
  sections: {
    primerosPasos: {
      title: "Primeros pasos",
      description: "Qué es Packet Tools y cómo empezar en 3 pasos.",
      keywords: ["login", "sesión", "registro", "empezar", "bienvenida"],
    },
    inicio: {
      title: "Inicio",
      description: "La pantalla principal: resumen de tu red de un vistazo.",
      keywords: ["dashboard", "panel", "resumen", "inicio"],
    },
    alertas: {
      title: "Alertas",
      description: "Dónde se anotan y resuelven los problemas de la red.",
      keywords: ["incidencia", "aviso", "criticidad", "resolver", "reportar"],
    },
    chat: {
      title: "Chat",
      description:
        "Tu asistente con inteligencia artificial: pídele con palabras normales.",
      keywords: ["asistente", "ia", "conversación", "chat", "preguntar"],
    },
    agente: {
      title: "Agente",
      description:
        "Quién hace el trabajo: ayudantes por equipo y sus herramientas.",
      keywords: [
        "agente",
        "subagente",
        "subagentes",
        "tools",
        "herramientas",
        "packet tracer",
        "gns3",
        "ssh",
        "telnet",
        "serial",
        "planificación",
        "hitl",
        "aprobación",
        "autónomo",
      ],
    },
    conexiones: {
      title: "Conexiones",
      description:
        "Tu lista de equipos de red para usarlos desde el Chat y la Terminal.",
      keywords: [
        "dispositivos",
        "equipos",
        "ssh",
        "telnet",
        "serial",
        "gns3",
        "packet tracer",
        "agregar",
      ],
    },
    terminal: {
      title: "Terminal",
      description:
        "Ventana directa a tu equipo para escribirle y leer su respuesta.",
      keywords: ["consola", "comandos", "conectar", "terminal"],
    },
    automatizaciones: {
      title: "Automatizaciones",
      description: "Trabajos que se hacen solos en el día y hora que elijas.",
      keywords: ["jobs", "tareas", "programar", "automático", "cron"],
    },
    skills: {
      title: "Skills",
      description: "Recetas guardadas para trabajos repetidos.",
      keywords: ["skills", "recetas", "plantillas", "@skill"],
    },
    logs: {
      title: "Logs",
      description: "El diario del sistema: qué pasó y cuándo.",
      keywords: ["eventos", "historial", "diario", "error", "ver"],
    },
    datos: {
      title: "Datos",
      description:
        "La biblioteca del asistente: sube documentos para que los consulte.",
      keywords: ["rag", "documentos", "pdf", "biblioteca", "@rag"],
    },
    usuarios: {
      title: "Usuarios",
      description: "Quién puede entrar, qué rol tiene y qué puede hacer.",
      keywords: [
        "operadores",
        "cuentas",
        "rol",
        "admin",
        "staff",
        "user",
        "permisos",
      ],
    },
    configuracion: {
      title: "Configuración",
      description:
        "El cerebro del asistente: qué inteligencia artificial responde.",
      keywords: [
        "configuración",
        "modelos",
        "ia",
        "llm",
        "openai",
        "ollama",
        "api key",
      ],
    },
    anexos: {
      title: "Anexos y referencias",
      description: "Comandos más usados de Cisco, MikroTik, Huawei y Aruba.",
      keywords: [
        "comandos",
        "cisco",
        "mikrotik",
        "huawei",
        "aruba",
        "cheat sheet",
        "referencias",
      ],
    },
  },
  primerosPasos: {
    welcomeTitle: "Bienvenido a Packet Tools",
    welcome:
      "Packet Tools es tu ayudante para cuidar tu red: te avisa de fallos, te deja hablar con tus equipos y hace tareas por ti. No necesitas saber comandos: escríbele como a una persona desde el Chat.",
    steps: {
      account: {
        title: "Crea tu cuenta",
        description:
          "En la pantalla de acceso pulsa Regístrate, elige un nombre y una contraseña, y entra.",
      },
      device: {
        title: "Agrega un equipo",
        description:
          "Ve a Conexiones, pulsa Nuevo dispositivo y guarda tu primer equipo.",
      },
      ask: {
        title: "Pide algo al asistente",
        description:
          "Ve al Chat y escríbele, por ejemplo: “dime si mi router responde”.",
      },
    },
    referencesTitle: "Enlaces de referencia",
    referencesIntro: "Programas y descargas que te pueden hacer falta.",
    references: {
      plugin: {
        title: "Plugin Packet Tracer",
        description: "Plugin para conectar Packet Tracer con el asistente.",
      },
      windows: {
        title: "Instalar en Windows",
        description: "Instalador de Packet Tools para Windows.",
      },
      linux: {
        title: "Instalar en Linux",
        description: "Instalador de Packet Tools para Linux.",
      },
      packetTracer: {
        title: "Simulador Packet Tracer",
        description: "Simulador oficial de redes de Cisco.",
      },
      gns3: {
        title: "Instalador GNS3",
        description: "Simulador de redes open-source.",
      },
      github: {
        title: "Packet Tools Github",
        description: "Repositorio de código abierto.",
      },
    },
  },
  inicio: {
    intro:
      "es la pantalla principal. Aquí ves de un vistazo cómo está tu red: cuántos equipos están conectados, si hay avisos pendientes y accesos directos a lo más usado.",
    howToUse: "Cómo se usa",
    steps: {
      summary: {
        title: "Mira el resumen",
        description:
          "Las tarjetas de arriba te dicen lo esencial: equipos conectados, avisos sin atender, tareas programadas y usuarios.",
      },
      shortcuts: {
        title: "Usa los accesos directos",
        description:
          "Pulsa Terminal, Chat o Dispositivos para ir directo a lo que necesites sin buscar en el menú.",
      },
      alerts: {
        title: "Revisa los avisos recientes",
        description:
          "Abajo verás los últimos avisos. Si hay alguno en rojo, atiéndelo primero.",
      },
    },
  },
  alertas: {
    intro:
      "es donde se anotan los problemas de la red (por ejemplo, un equipo que no responde). Cada aviso tiene un nivel de importancia: crítico, alto, medio o bajo.",
    howToUse: "Cómo se usa",
    steps: {
      report: {
        title: "Reporta un problema",
        description:
          "Pulsa Nueva Alerta, escribe qué está pasando y elige qué tan grave es.",
      },
      search: {
        title: "Busca y filtra",
        description:
          "Usa el buscador o los filtros para encontrar un aviso por su gravedad o estado.",
      },
      resolve: {
        title: "Marca como resuelta",
        description:
          "Cuando el problema quede arreglado, pulsa Resolver. Si vuelve a fallar, puedes reabrirla.",
      },
    },
  },
  chat: {
    intro:
      "es tu asistente con inteligencia artificial. Le escribes lo que necesitas con palabras normales (por ejemplo, “revisa si el router responde”) y él se encarga de hacerlo o explicarte cómo.",
    howToUse: "Cómo se usa",
    steps: {
      write: {
        title: "Escribe lo que necesitas",
        description:
          "En la caja de texto de abajo describe tu problema o pregunta y pulsa enviar.",
      },
      answer: {
        title: "Responde a sus preguntas",
        description:
          "Si te pide confirmar o elegir un equipo, pulsa el botón que te muestra.",
      },
      result: {
        title: "Revisa el resultado",
        description:
          "Lee la respuesta y usa el botón Copiar si quieres guardarla.",
      },
    },
    tipTitle: "Consejo",
    tip: "Puedes mencionar un equipo con @ (por ejemplo @Router1), pedir que busque en tus documentos con @rag o en internet con @web.",
  },
  agente: {
    intro:
      "es el asistente que vive en el Chat. Tú le pides algo con palabras normales y él reparte el trabajo entre sus ayudantes (subagentes), donde cada uno sabe manejar un tipo de equipo o tarea.",
    howItWorksTitle: "Cómo funciona (en sencillo)",
    howItWorks:
      "Tú escribes tu pedido una sola vez. El agente entiende qué necesitas, llama al ayudante indicado y te muestra el resultado. Si lo que pides cambia algo importante del equipo, primero te pide permiso.",
    planningTitle: "Modo planificación y aprobación (HITL)",
    planning: {
      prefix: "El agente admite",
      planningMode: "modo planificación",
      middle:
        ": antes de tocar nada, te muestra su plan paso a paso en el Chat para que sepas qué va a hacer. Y usa",
      humanApproval: "aprobación humana (HITL)",
      middle2:
        ": cuando el plan cambia algo importante del equipo, te aparece una tarjeta con los pasos y dos botones,",
      confirm: "Confirmar y Ejecutar",
      or: "o",
      cancel: "Cancelar",
      suffix: ". Nada se ejecuta sin tu “sí”. Con el interruptor",
      autonomous: "Modo Autónomo",
      suffix2:
        "(solo STAFF y ADMIN) el agente actúa sin pedir permiso, salvo en acciones peligrosas, que siempre requieren tu aprobación.",
    },
    helpersTitle: "Los ayudantes (subagentes)",
    helpersHeaders: {
      helper: "Ayudante",
      canDo: "Qué sabe hacer",
      tools: "Herramientas",
    },
    helpers: {
      packetTracer:
        "Arma y revisa redes de práctica en Cisco Packet Tracer: agrega equipos, conecta cables, pone direcciones IP y prueba si hay conexión.",
      gns3:
        "Arma laboratorios en GNS3: crea proyectos, agrega equipos, los enciende o apaga y guarda copias (snapshots).",
      ssh:
        "Habla con equipos reales por SSH (conexión segura): revisa cómo están y les aplica cambios.",
      telnet:
        "Habla con equipos viejos por Telnet para revisarlos y configurarlos.",
      serial:
        "Habla con equipos por cable físico (puerto serie) cuando no hay red, comando por comando.",
      knowledge:
        "Busca respuestas en tus documentos y, si no están ahí, en internet.",
      admin:
        "Cuida la propia aplicación: tareas programadas, lista de equipos, números del sistema y manejo de skills.",
      adminTools: "17 (12 + 5 de skills)",
      general:
        "El comodín: atiende trabajos mezclados o que necesitan varios pasos.",
      generalTools: "Las que necesite",
    },
    footnote:
      "Las cantidades son con rol ADMIN o STAFF. Con rol USER cada ayudante muestra menos herramientas.",
  },
  conexiones: {
    intro:
      "es tu lista de equipos de red (routers, switches y simuladores). Aquí los agregas una vez para poder usarlos desde el Chat y la Terminal.",
    typesTitle: "Tipos de conexión que maneja",
    types: {
      ssh: "SSH: conexión segura a equipos reales (la recomendada).",
      telnet: "Telnet: para equipos viejos que no tienen SSH.",
      serial: "Puerto Serial: por cable físico, cuando no hay red.",
      simulation:
        "Simulación / API Bridge: para laboratorios virtuales (Packet Tracer y GNS3).",
    },
    accepts:
      "Y acepta equipos Cisco IOS, Huawei VRP, Aruba OS, MikroTik RouterOS, GNS3 Server, Packet Tracer o Genérico.",
    howToUse: "Cómo se usa",
    steps: {
      add: {
        title: "Agrega tu equipo",
        description:
          "Pulsa Nuevo dispositivo, ponle un nombre, elige el tipo de conexión, escribe su dirección (IP) y su usuario y contraseña.",
      },
      test: {
        title: "Comprueba que responde",
        description:
          "Pulsa Probar conexión. Si sale el mensaje de éxito, ya quedó bien registrado.",
      },
      use: {
        title: "Úsalo",
        description:
          "Pulsa Terminal para abrir su consola, o pídele cosas desde el Chat.",
      },
    },
  },
  usuarios: {
    intro:
      "es la lista de personas que pueden entrar al sistema. Solo el administrador la ve y es quien crea o quita cuentas.",
    howToUse: "Cómo se usa",
    steps: {
      create: {
        title: "Crea una cuenta",
        description:
          "Pulsa Registrar Operador, escribe el nombre, la contraseña y elige su rol.",
      },
      manage: {
        title: "Cambia o quita cuentas",
        description:
          "Usa el lápiz para cambiar la contraseña o el rol, y la papelera para eliminar.",
      },
    },
    rolesTitle: "Roles y permisos",
    rolesIntro:
      "Hay 3 tipos de usuario, del que menos puede al que más puede:",
    rolesAnd: "y",
    rolesSuffix: "Cada nivel incluye lo del anterior.",
    tableHeaders: {
      canDo: "Qué puede hacer",
    },
    table: {
      view: "Ver el sistema",
      chat: "Usar el Chat y ver sus propios avisos",
      terminal: "Usar la Terminal (solo mirar)",
      devices: "Agregar y manejar equipos",
      jobs: "Programar tareas automáticas",
      alerts: "Ver los avisos de todos",
      data: "Subir documentos a Datos",
      approve: "Aprobar lo que hace el asistente",
      admin: "Manejar usuarios, modelos y borrar registros",
    },
    menuPrefix: "El menú cambia según tu rol:",
    menuMiddle: "y",
    menuSuffix: "solo las ven los ADMIN.",
  },
  terminal: {
    intro:
      "es una ventana directa a tu equipo, como si estuvieras frente a él escribiendo comandos. Lo que escribes llega al equipo y su respuesta aparece en pantalla.",
    protocolsPrefix: "Soporta conexiones por",
    ssh: "SSH",
    protocolsMiddle: "(segura, la recomendada),",
    telnet: "Telnet",
    protocolsMiddle2: "(equipos viejos) y",
    serial: "puerto Serial",
    protocolsSuffix:
      "(cable físico). Los laboratorios virtuales (GNS3 y Packet Tracer) no se abren aquí: se usan desde el Chat.",
    howToUse: "Cómo se usa",
    steps: {
      choose: {
        title: "Elige el equipo",
        description:
          "Selecciona uno de tu lista y pulsa Conectar. Verás el aviso En línea cuando esté listo.",
      },
      write: {
        title: "Escribe y lee",
        description:
          "Escribe lo que quieras consultar y lee la respuesta del equipo en la ventana.",
      },
      disconnect: {
        title: "Desconecta al terminar",
        description:
          "Pulsa Desconectar cuando acabes para liberar la conexión.",
      },
    },
    noDeviceTitle: "Si no tienes equipo guardado",
    noDevice: {
      manual:
        "Pulsa Manual y conéctate escribiendo la dirección, el usuario y la contraseña, sin guardar nada.",
      serial:
        "Para cable serie elige el puerto (por ejemplo COM3) y la velocidad (normalmente 9600).",
    },
  },
  tareas: {
    intro:
      "sirve para dejar trabajos programados: le dices al sistema qué hacer y cuándo, y él lo ejecuta solo (por ejemplo, “revisa los equipos cada lunes a las 8”).",
    howToUse: "Cómo se usa",
    steps: {
      schedule: {
        title: "Programa la tarea",
        description:
          "Pulsa Programar Tarea, ponle un nombre y elige el día y la hora.",
      },
      describe: {
        title: "Describe qué debe hacer",
        description:
          "Escribe con tus palabras lo que quieres que haga, como si se lo pidieras a una persona.",
      },
      activate: {
        title: "Actívala",
        description:
          "Deja el interruptor en activo y guarda. Si la necesitas ya, usa Ejecutar Ahora.",
      },
    },
  },
  logs: {
    intro:
      "es el diario del sistema: aquí queda anotado todo lo importante que pasa (quién se conectó, qué tarea se ejecutó, si algo falló). Sirve para revisar qué ocurrió.",
    howToUse: "Cómo se usa",
    steps: {
      search: {
        title: "Busca lo que pasó",
        description:
          "Escribe una palabra en el buscador (por ejemplo, el nombre de un equipo) o filtra por tipo.",
      },
      read: {
        title: "Lee el detalle",
        description:
          "Cada fila dice la fecha y qué sucedió. Si algo salió mal, aparecerá marcado como error.",
      },
      export: {
        title: "Descarga si lo necesitas",
        description:
          "Usa Exportar para guardar la lista y enviarla o guardarla como respaldo.",
      },
    },
  },
  datos: {
    intro:
      "es la biblioteca del asistente: aquí subes manuales y documentos (PDF o texto) para que el Chat pueda consultarlos y responderte con base en ellos.",
    howToUse: "Cómo se usa",
    steps: {
      upload: {
        title: "Sube tu documento",
        description:
          "Arrastra tu archivo a la zona punteada o pulsa para elegirlo. Acepta PDF y texto de hasta 25 MB.",
      },
      name: {
        title: "Ponle un nombre claro",
        description:
          "Escribe un título que lo identifique, por ejemplo “Manual del router”.",
      },
      ask: {
        title: "Pregunta desde el Chat",
        description:
          "En el Chat escribe @rag junto a tu pregunta para que busque la respuesta en tus documentos.",
      },
    },
  },
  configuracion: {
    intro:
      "es donde el administrador elige el “cerebro” del asistente: qué inteligencia artificial responde y con qué instrucciones generales trabaja.",
    providersTitle: "Proveedores que acepta",
    providers: {
      cloud:
        "En la nube: OpenAI, Google, Anthropic y OpenRouter (necesitan su clave/API Key).",
      local:
        "En tu propio equipo: Ollama y LM Studio (sin clave, solo la dirección del programa).",
      custom:
        "Personalizado (Custom): cualquier otro servicio compatible, con su dirección y clave.",
    },
    twoThingsTitle: "Dos cosas que debes elegir",
    twoThings: {
      type: "Tipo de modelo: CHAT para conversar y responder, o EMBEDDING para que entienda tus documentos de Datos (sin un EMBEDDING activo, los documentos no se indexan).",
      prompt:
        "Prompt del Sistema: las instrucciones generales que el asistente sigue en cada conversación (por ejemplo, cómo debe responder). Se edita y se guarda con Guardar Prompt.",
    },
    howToUse: "Cómo se usa",
    steps: {
      add: {
        title: "Agrega un modelo",
        description:
          "Pulsa Agregar Modelo, elige el proveedor y el tipo (CHAT o EMBEDDING), y pega tu clave si es de la nube.",
      },
      test: {
        title: "Prueba que funciona",
        description:
          "Pulsa Probar Conexión. Si responde correctamente, guarda los cambios.",
      },
      activate: {
        title: "Déjalo activo",
        description:
          "Asegúrate de que el interruptor de Activo quede encendido para que el Chat lo use.",
      },
    },
  },
  skills: {
    intro:
      "son recetas guardadas: pasos ya preparados para trabajos repetidos (por ejemplo, “configurar OSPF” o “revisar un router”). El asistente las usa para hacerlo más rápido y sin equivocarse.",
    howToUse: "Cómo se usa",
    steps: {
      create: {
        title: "Crea la receta",
        description:
          "En Skills pulsa Nueva skill, ponle un título, escribe en una frase cuándo debe usarse y pega los pasos en el contenido.",
      },
      use: {
        title: "Úsala desde el Chat",
        description:
          "En el Chat escribe @skill: seguido de su nombre (por ejemplo @skill:configurar-ospf-area-0) junto a tu pedido.",
      },
    },
    exampleTitle: "Ejemplo para copiar y editar",
    examplePrefix: "Título sugerido:",
    exampleTitleSuggestion: "Configurar OSPF área 0",
    exampleMiddle: "Cuándo usarla:",
    exampleWhen: "Para enlazar routers OSPF en área 0 cuando la red es simple.",
    exampleSuffix: "Y este contenido (usa el botón de copiar):",
    exampleLabel: "Contenido de ejemplo (Markdown)",
    exampleSkill:
      "# Cuándo usarla\n\nCuando hay que configurar OSPF área 0 entre routers Cisco en una red simple.\nNo usar si la red tiene más de un área.\n\n# Pasos\n\n1. Entrar en modo de configuración: `configure terminal`.\n2. Activar OSPF: `router ospf 1`.\n3. Anunciar cada red: `network <red> <wildcard> area 0`.\n4. Verificar vecinos: `show ip ospf neighbor` (debe decir FULL).\n5. Comprobar rutas: `show ip route | include O`.\n\n# Precauciones\n\n- No anunciar interfaces que no participan en OSPF.\n- Guardar al final con `copy running-config startup-config`.",
    guidelinesTitle: "Pautas para una buena skill",
    guidelines: {
      title: "Título corto y claro: que con solo leerlo se entienda qué hace.",
      when: "El “cuándo usarla” en una frase, incluyendo cuándo NO usarla.",
      steps:
        "Pasos numerados, uno por acción, con el comando exacto entre comillas.",
      caution:
        "Agrega una sección de Precauciones con lo que no se debe olvidar.",
      precise:
        "Sé preciso y accionable: el asistente solo lee el título y la descripción primero, y abre el contenido solo cuando lo necesita.",
    },
    permissionsTitle: "Permisos",
    permissions:
      "Crear y editar skills lo pueden hacer STAFF y ADMIN. Borrar, solo ADMIN. También puedes pedirle al Chat: “crea una skill para…”.",
  },
  anexos: {
    intro:
      "los comandos más usados por marca, explicados con palabras sencillas. Cada lista trae su botón de copiar para pegarlos en la Terminal o pedirle al Chat que los ejecute.",
    tableHeaders: {
      command: "Comando",
      purpose: "Para qué sirve",
    },
    copy: {
      cisco: "Copiar comandos de Cisco",
      mikrotik: "Copiar comandos de MikroTik",
      huawei: "Copiar comandos de Huawei",
      aruba: "Copiar comandos de Aruba",
    },
    cisco: {
      interfaces: "Ver interfaces, su IP y si están activas.",
      running: "Ver la configuración actual del equipo.",
      routes: "Ver por dónde sale el tráfico (rutas).",
      vlans: "Ver las redes internas (VLAN) creadas.",
      save: "Guardar lo configurado para que no se borre.",
      ping: "Probar si hay conexión a internet.",
    },
    mikrotik: {
      addresses: "Ver las direcciones IP del equipo.",
      routes: "Ver las rutas de salida.",
      interfaces: "Ver las interfaces y su estado.",
      identity: "Ponerle nombre al equipo.",
      password: "Cambiar la contraseña.",
      ping: "Probar si hay conexión.",
    },
    huawei: {
      interfaces: "Ver interfaces, su IP y si están activas.",
      current: "Ver la configuración actual.",
      routes: "Ver la tabla de rutas.",
      vlans: "Ver las redes internas (VLAN).",
      save: "Guardar la configuración.",
      ping: "Probar si hay conexión.",
    },
    aruba: {
      interfaces: "Ver interfaces y su estado.",
      current: "Ver la configuración actual.",
      routes: "Ver las rutas de salida.",
      vlans: "Ver las redes internas (VLAN).",
      save: "Guardar la configuración.",
      ping: "Probar si hay conexión.",
    },
  },
};

export default manual;
