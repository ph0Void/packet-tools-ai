# SERVER MCP - PACKET TOOLS

Servidor **MCP (Model Context Protocol)** que habla **stdio** y **HTTP remoto**
(`/mcp` Streamable HTTP y `/sse` legacy) y expone las capacidades de
automatización de red de Packet Tools como herramientas que cualquier terminal
de IA puede invocar: **Claude Code / Claude Desktop, Codex CLI, OpenCode, GitHub
Copilot (VS Code), LM Studio** y cualquier cliente MCP estándar. El transporte
HTTP permite además integrarlo en clientes web como **Gemini Apps**, que no
lanzan procesos locales.

Permite diseñar topologías, configurar equipos IOS por CLI y hablar con
dispositivos reales por **puerto serie, Telnet y SSH**, exactamente con el mismo
motor que usa la aplicación web/desktop.

---

## 1. Qué problema resuelve

Packet Tools ya sabía hacer todo esto, pero **solo desde su propia interfaz**:
había que abrir la app web, escribir en su chat y tener el backend corriendo con
sesión iniciada. Este servidor MCP saca ese motor fuera de la app para que el
usuario trabaje desde **su** terminal de IA, con sus propias reglas y sin
depender de una UI.

### Estructura de carpetas

```
packages/mcp/
├── prisma/schema.prisma      # esquema de la BD propia del MCP
├── skills/*.md               # skills del usuario (markdown libre)
├── plans/*.md                # checklists generados por plan_task
├── scripts/                  # generate de Prisma y reescritor de dist
├── scripts/verify-http.cjs   # prueba de los endpoints HTTP (`npm run test:http`)
├── test/smoke.ts             # prueba de humo
└── src/
    ├── app.ts                # entrypoint (bin)
    ├── config/EnvConfig.ts   # configuración con defaults
    ├── config/CliArgs.ts     # flags --transport / --http-port (mandan sobre el env)
    ├── core/                 # McpServer, ToolRegistry, errores
    ├── core/McpHttpServer.ts # transportes HTTP /mcp y /sse + /health
    ├── domains/              # un módulo por dominio
    ├── transports/           # DeviceTransport + adaptadores + motor
    ├── skills/               # cargador y exposición como resources
    ├── prisma/               # cliente de la BD propia
    └── utils/Logger.ts       # logs SIEMPRE por stderr
```

---

## 3. Herramientas expuestas

**95 herramientas en 7 dominios.** El prefijo de cada nombre indica su dominio,
para que el modelo lo deduzca sin leer la descripción.

### `@packet-tracer` — 40 herramientas

Topologías en Cisco Packet Tracer, a través del **bridge socket.io que aloja este
mismo servidor MCP** (`MCP_BRIDGE_PORT`, 7532 por defecto): la extensión de Packet
Tracer se conecta al MCP, no al backend.

| Herramienta                                | Qué hace                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `packet_tracer_connection_status`          | Estado del bridge del MCP, si la extensión está conectada, y recuento de dispositivos/enlaces |
| `packet_tracer_list_device_models`         | Catálogo REAL de modelos que acepta el motor                                                  |
| `packet_tracer_get_network`                | Topología completa: dispositivos, interfaces y enlaces                                        |
| `packet_tracer_get_device_info`            | Ficha de un dispositivo y sus puertos                                                         |
| `packet_tracer_list_device_modules`        | Módulos de expansión que admite un equipo                                                     |
| `packet_tracer_get_device_config_snapshot` | running-config, startup-config y XML del equipo                                               |
| `packet_tracer_read_console`               | Últimas líneas de la consola                                                                  |
| `packet_tracer_get_command_log`            | Historial de comandos ejecutados                                                              |
| `packet_tracer_get_routing_table`          | Tabla de rutas (`show ip route`)                                                              |
| `packet_tracer_get_vlan_configuration`     | VLANs de un switch                                                                            |
| `packet_tracer_get_device_metrics`         | Estado de encendido e interfaces                                                              |
| `packet_tracer_validate_security_config`   | Auditoría: contraseñas, SSH, Telnet                                                           |
| `packet_tracer_validate_topology`          | Errores, avisos, huérfanos y bucles                                                           |
| `packet_tracer_generate_network_report`    | Informe legible de la red                                                                     |
| `packet_tracer_add_device`                 | Coloca un equipo (valida el modelo contra el catálogo real)                                   |
| `packet_tracer_add_module`                 | Instala un módulo en una ranura                                                               |
| `packet_tracer_add_link`                   | Cablea dos equipos                                                                            |
| `packet_tracer_remove_device`              | Elimina equipos (detalle por equipo)                                                          |
| `packet_tracer_remove_link`                | Retira cables                                                                                 |
| `packet_tracer_move_device`                | Mueve un equipo en el lienzo                                                                  |
| `packet_tracer_rename_device`              | Renombra un equipo                                                                            |
| `packet_tracer_set_power`                  | Enciende / apaga                                                                              |
| `packet_tracer_configure_pc_ip`            | Direcciona un equipo final (estático o DHCP)                                                  |
| `packet_tracer_run_device_commands`        | Comandos CLI síncronos                                                                        |
| `packet_tracer_configure_ios_device`       | **Lote IOS fiable con verificación contra el equipo**                                         |
| `packet_tracer_apply_device_config`        | Bloque de configuración (motor antiguo)                                                       |
| `packet_tracer_run_command_async`          | Lanza un lote en el motor de dos fases                                                        |
| `packet_tracer_poll_command_result`        | Sondea el resultado del lote anterior                                                         |
| `packet_tracer_get_simulation_status`      | Estado de la simulación                                                                       |
| `packet_tracer_set_simulation_mode`        | Tiempo real ↔ simulación                                                                      |
| `packet_tracer_step_simulation`            | Avanza (o reinicia) la simulación                                                             |
| `packet_tracer_send_pdu`                   | Inyecta un paquete entre dos equipos                                                          |
| `packet_tracer_get_pdu_results`            | Fotogramas capturados y su estado                                                             |
| `packet_tracer_ping`                       | Comprueba conectividad (PDU con respaldo CLI)                                                 |
| `packet_tracer_reachability_matrix`        | Un origen contra hasta 10 destinos                                                            |
| `packet_tracer_simulate_link_failure`      | Simula la caída de un enlace                                                                  |
| `packet_tracer_restore_link`               | Restaura el enlace caído                                                                      |
| `packet_tracer_clear_workspace`            | **Borra todo el lienzo (irreversible)**                                                       |
| `packet_tracer_export_workspace`           | Exporta a `.pkt`                                                                              |
| `packet_tracer_import_workspace`           | Carga un `.pkt` (reemplaza el lienzo)                                                         |

### `@gns3` — 35 herramientas

Proyectos, nodos, enlaces, capturas y plantillas del servidor GNS3.

`gns3_list_configured_servers`, `gns3_test_connection`, `gns3_list_projects`,
`gns3_find_project`, `gns3_get_project`, `gns3_create_project`,
`gns3_open_project`, `gns3_close_project`, `gns3_delete_project`,
`gns3_get_project_stats`, `gns3_get_server_resources`, `gns3_list_nodes`,
`gns3_get_templates`, `gns3_create_node`, `gns3_control_node_power`,
`gns3_list_node_files`, `gns3_read_node_log`, `gns3_list_links`,
`gns3_connect_nodes`, `gns3_start_link_capture`, `gns3_stop_link_capture`,
`gns3_get_link_capture`, `gns3_download_link_pcap`, `gns3_list_snapshots`,
`gns3_create_snapshot`, `gns3_restore_snapshot`, `gns3_delete_snapshot`,
`gns3_get_template`, `gns3_create_template`, `gns3_update_template`,
`gns3_delete_template`, `gns3_duplicate_template`, `gns3_export_project`,
`gns3_import_project`, `gns3_auto_layout_project`.

### `@serial` — 5 herramientas

Consola física (RS-232 / USB) con detección de fabricante.

| Herramienta            | Qué hace                                                    |
| ---------------------- | ----------------------------------------------------------- |
| `serial_list_ports`    | Enumera los puertos serie del sistema (`SerialPort.list()`) |
| `serial_detect_vendor` | Lee el banner/prompt e identifica el fabricante             |
| `serial_send_commands` | Envía comandos con la sintaxis del fabricante detectado     |
| `serial_read_console`  | Lee sin enviar nada (arranque, logs)                        |
| `serial_disconnect`    | Libera el puerto                                            |

### `@telnet` y `@ssh` — 3 herramientas cada uno

| Herramienta                                  | Qué hace                                     |
| -------------------------------------------- | -------------------------------------------- |
| `telnet_detect_vendor` / `ssh_detect_vendor` | Identifica el fabricante del equipo remoto   |
| `telnet_send_commands` / `ssh_send_commands` | Envía comandos con el motor multi-fabricante |
| `telnet_disconnect` / `ssh_disconnect`       | Cierra la sesión                             |

### `@plan` — 4 herramientas

`plan_task` (crea el plan), `plan_execute` (devuelve los pasos pendientes),
`plan_mark_step` (marca hecho/fallido) y `plan_list` (lista los planes).

### `@skills` — 5 herramientas

`skills_list`, `skills_read`, `skills_create`, `skills_delete` y
`skills_directory`.

---

## 4. Detección de fabricante (motor multi-marca)

Es lo que permite configurar equipos reales sin saber de antemano con qué
sintaxis hablarles. Se resuelve en **tres niveles**:

1. **Declarado** — el `typeDevice` del dispositivo configurado en la BD del MCP.
   Solo es concluyente para `CISCO`, `HUAWEI`, `ARUBA`, `MIKROTIK` y `JUNOS`.
2. **Detectado por el prompt** — reglas ordenadas de más a menos específica:

   | Prompt                            | Fabricante        |
   | --------------------------------- | ----------------- |
   | `[admin@MikroTik] >`              | MikroTik RouterOS |
   | `[edit interfaces]`, `user@host>` | Juniper JunOS     |
   | `<R1>`, `[R1-GigabitEthernet0/0]` | Huawei VRP        |
   | `(host) (config) #`               | ArubaOS           |
   | `R1(config)#`                     | Cisco IOS         |

3. **Conservador** — sin datos concluyentes. Reconoce prompts y paginadores
   genéricos, pero **no inventa transiciones de modo**: es preferible no tocar la
   consola que teclear un comando que no existe.

El perfil decide qué preámbulo se envía (por ejemplo `terminal length 0` en Cisco
para que un `show run` no se quede en `--More--`), cómo se detecta un sub-modo y
qué comando sale de él (`exit` en Cisco, `quit` en Huawei, `..` en MikroTik).

**Nunca se envían comandos que cerrarían la consola** (`exit`, `quit`, `logout`,
`disconnect`, `close`): se descartan y se avisa en la respuesta.

---

## 5. `@plan` y `@execute`

`@plan` y `@execute`Se implementan como herramientas
que el modelo invoca cuando el usuario escribe esa mención en el chat.

### Flujo

```
Usuario:  @plan crea una topología con 2 routers y 3 PCs con OSPF
   │
   ├─ El modelo llama a plan_task(objective, steps, openQuestions, risks)
   │     └─ escribe plans/plan-2026-01-15T10-30-00-topologia-2-routers.md
   │        y lo devuelve para que el usuario lo revise
   │
Usuario:  @execute
   │
   ├─ El modelo llama a plan_execute()          → pasos PENDIENTES
   ├─ ejecuta cada paso llamando a la herramienta correspondiente
   └─ tras cada paso: plan_mark_step(step, success)
```

### Ejemplo de plan generado

```markdown
# Plan: crea una topología con 2 routers y 3 PCs con OSPF

- **Archivo**: `plan-2026-01-15T10-30-00-topologia-2-routers.md`
- **Pasos**: 8

## Riesgos detectados

> Estas acciones son destructivas o ambiguas. Confírmalas con el usuario.

- ⚠️ Se vaciará el lienzo actual con packet_tracer_clear_workspace

## Pasos

- [ ] 1. packet_tracer_clear_workspace()
- [ ] 2. packet_tracer_add_device(name="R1", model="2911", x=100, y=100)
- [ ] 3. packet_tracer_add_device(name="R2", model="2911", x=400, y=100)
- [ ] 4. packet_tracer_add_link(device1Name="R1", device1Interface="GigabitEthernet0/0", ...)
- [ ] 5. packet_tracer_configure_ios_device(deviceName="R1", commands=["hostname R1", ...])
     ...
```

Tras ejecutarlo, el mismo archivo queda como registro auditable:

```markdown
- [x] 1. packet_tracer_clear_workspace()
- [x] 2. packet_tracer_add_device(...) — nota: verificado
- [!] 4. packet_tracer_add_link(...) — error: el puerto GigabitEthernet0/1 ya está en uso
```

**Ante un fallo, el plan se detiene**: `plan_execute` devuelve los pasos fallidos
con su error y avisa de que hay que preguntar al usuario si reintentar, saltar o
abortar. No hay reintentos en bucle.

Los planes se pueden **editar a mano** antes de ejecutarlos: el parser lee el
checklist, así que añadir, quitar o reordenar pasos funciona mientras se respete
el formato `- [ ] <número>. <acción>`.

---

## 6. Skills del usuario

Instrucciones propias (convenciones de nombres, políticas de seguridad,
procedimientos) que el modelo debe respetar, sin tocar el código del MCP.

### Dónde se ponen

`packages/mcp/skills/*.md` — hay un ejemplo en
[ejemplo-convencion-nombres.md](./skills/ejemplo-convencion-nombres.md).
El agente también puede crearlas desde el chat con `skills_create`.

### Formato

```markdown
---
title: Convención de nombres
description: Cómo nombrar los dispositivos de la red
slug: convencion-nombres
---

# Convención de nombres

- Routers: R<n>
- Switches: SW<n>
```

El frontmatter es **opcional**: sin él, el título se toma del primer encabezado
`# ` y el slug del nombre del archivo.

### Cómo llegan al modelo: dos mecanismos a la vez

| Mecanismo                               | Ventaja                                                                                    | Limitación                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **`resources`** MCP (`skill://<slug>`)  | Nativo del protocolo; el cliente puede listarlos y leerlos sin gastar una tool             | **No todos los clientes lo implementan** (LM Studio y clientes ligeros, por ejemplo) |
| **Tools** `skills_list` / `skills_read` | Funciona en **cualquier** cliente: las tools son la parte del protocolo que todos soportan | Consume una llamada a herramienta                                                    |

Se implementan **las dos** porque el objetivo es no depender de que el cliente
soporte `resources`. Ambas leen del mismo sitio, así que nunca se contradicen.

Las skills se leen **en cada llamada** (no al arrancar), así que una skill nueva
aparece sin reiniciar el servidor MCP — y sin obligar a reiniciar el cliente de IA.

> Nota sobre `skills-lock.json`: el del repositorio es el manifiesto de las skills
> de **los agentes de desarrollo** (`ai-sdk`, `impeccable`...), no de las de este
> servidor. Son cosas distintas y por eso el MCP no lo reutiliza.

---

## 7. Conexión remota por HTTP (`/mcp` y `/sse`)

Además de **stdio**, el servidor puede hablar **MCP por HTTP** en un servidor
`node:http` propio. Es lo que permite usarlo desde clientes que no lanzan
procesos locales, como **Gemini Apps** (Gemini Desktop), que exigen una **URL
pública HTTPS**.

### Modos de transporte

Se eligen con la variable `MCP_TRANSPORT` o con flags de línea de comandos; **los
flags mandan sobre la variable**:

| Modo    | Qué levanta                                                  |
| ------- | ------------------------------------------------------------ |
| `stdio` | Sólo stdio (el comportamiento de siempre; es el **default**) |
| `http`  | Sólo el servidor HTTP (`/mcp`, `/sse` y `/health`)           |
| `both`  | Los dos a la vez: agentes locales por stdio + clientes web   |

Con variables de entorno:

```powershell
# Windows PowerShell — modo http
$env:MCP_TRANSPORT="http"; npx -y --package=@packet-tools-ai/mcp packet-tools-mcp

# Windows PowerShell — modo both
$env:MCP_TRANSPORT="both"; npx -y --package=@packet-tools-ai/mcp packet-tools-mcp
```

```bash
# Linux / macOS / Git Bash — modo http
MCP_TRANSPORT=http npx -y --package=@packet-tools-ai/mcp packet-tools-mcp

# Linux / macOS / Git Bash — modo both
MCP_TRANSPORT=both npx -y --package=@packet-tools-ai/mcp packet-tools-mcp
```

Con flags (útiles si ya tienes el binario en el `PATH`):

```bash
packet-tools-mcp --transport=both --http-port=7533
```

El servidor HTTP escucha en `http://127.0.0.1:7533` por defecto
(`MCP_HTTP_HOST` y `MCP_HTTP_PORT`); el modo `stdio` no abre ningún puerto. El
CORS está abierto por defecto y es configurable con `MCP_HTTP_CORS_ORIGIN`.

### Endpoints

| Endpoint    | Método   | Para qué sirve                                                                                                             |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/mcp`      | `POST`   | **Streamable HTTP** (protocolo MCP `2025-03-26`): mensajes JSON-RPC. Al abrir sesión responde con el header `mcp-session-id` |
| `/mcp`      | `GET`    | Stream de eventos (SSE) de la sesión Streamable HTTP abierta                                                               |
| `/mcp`      | `DELETE` | Cierra la sesión Streamable HTTP                                                                                           |
| `/sse`      | `GET`    | **HTTP+SSE legacy** (protocolo MCP `2024-11-05`): abre el stream de eventos                                                |
| `/messages` | `POST`   | HTTP+SSE legacy: recibe los mensajes del cliente (`?sessionId=…`)                                                          |
| `/health`   | `GET`    | JSON de estado **sin autenticación**: comprueba que el servidor responde (diagnóstico de túneles)                          |

Los dos transportes conviven: la misma instancia atiende `/mcp` y `/sse` a la
vez.

### Conectarlo a Gemini Apps

1. Arranca el MCP en modo `http` o `both` y comprueba en local que responde:
   abre `http://127.0.0.1:7533/health`.
2. Abre un **túnel HTTPS** hacia el puerto local:
   - cloudflared: `cloudflared tunnel --url http://localhost:7533`
   - ngrok: `ngrok http 7533`
3. Copia la URL `https://…` que imprime el túnel.
4. En **Gemini Apps**: Ajustes → **Connected Apps** → **Add custom app**, y pega
   la URL del túnel **con el sufijo `/mcp`**:
   `https://algo.trycloudflare.com/mcp`.
5. Los requisitos los pone Google: URL pública HTTPS, cuenta **personal** (no
   corporativa), 18+, inglés y EE. UU. Su documentación recomienda revisar los
   riesgos de conectar apps antes de usarlas
   ([doc oficial](https://support.google.com/gemini/answer/17209137)); además,
   Gemini pide confirmación manual en las acciones de escritura.
6. Para forzar que Gemini use la app conectada (en lugar de buscar en la web o
   en otra herramienta), menciónala con `@` en el prompt:
   `@packet-tools lista los equipos`.
7. Si la conexión acaba cayendo por `/sse` (el transporte legacy), no hay
   problema: el servidor lo sirve igual. Para Gemini la URL recomendada sigue
   siendo la que termina en `/mcp`.

### Seguridad

> ⚠️ **Sin `MCP_HTTP_TOKEN` el endpoint queda abierto** a cualquiera que tenga la
> URL: podría listar e invocar las herramientas, incluidas las destructivas
> (por ejemplo, vaciar el lienzo de Packet Tracer). Úsalo con túneles
> **efímeros**: levántalos sólo mientras los necesites y ciérralos al terminar.
>
> Si quieres exigir un token, define `MCP_HTTP_TOKEN` con un valor largo. El
> cliente puede enviarlo como `Authorization: Bearer <token>` o incrustarlo en
> la URL: `https://…/mcp?token=<token>` (Gemini sólo acepta la URL, así que ahí
> se usa la variante `?token=`).
>
> El quick tunnel de cloudflared **cambia de URL en cada arranque**: si lo
> reinicias, tendrás que volver a agregar la app en Gemini.

### Sesiones en memoria

Las sesiones de `/mcp` y `/sse` viven **en memoria** del proceso: al reiniciar
el MCP, los clientes deben reconectar.

---

## 8. Instalación en tu agente de código

El servidor se lanza **siempre igual**; lo único que cambia es dónde se declara.
La vía recomendada no requiere clonar ni compilar nada: se ejecuta directo desde
npm con `npx`.

```bash
npx -y @packet-tools-ai/mcp
# o de forma explícita, paquete + binario:
npx -y -p @packet-tools-ai/mcp packet-tools-mcp
```

`npx` descarga el paquete publicado, instala sus dependencias y deja el servidor
MCP escuchando en **stdio**. La primera ejecución tarda más (descarga); las
siguientes usan la caché de `npx`.

> 💡 **Sobre el `--package=`.** El paquete publica su binario como
> `packet-tools-mcp`, así que `npx -y @packet-tools-ai/mcp` resuelve solo. Si en
> tu cliente necesitas declarar paquete y binario por separado, usa
> `--package=@packet-tools-ai/mcp` **primero** y `packet-tools-mcp` después.
> Desde un clon sin compilar también sirve
> `npx -y --package=github:ph0Void/packet-tools-ai packet-tools-mcp`.

> ⚠️ **Compatibilidad con el plugin de Packet Tracer**
>
> La integración de Packet Tracer (el puente `packet_tracer_*` en el puerto
> `7532`) necesita la **extensión de Packet Tracer v1.1.0 o superior**. Con una
> versión anterior el MCP arranca y el resto de dominios (GNS3, serial, SSH,
> Telnet, plan y skills) funcionan con normalidad, pero la extensión no se
> conectará al puente y `packet_tracer_connection_status` lo reportará como
> desconectado. Actualiza la extensión a `v1.1.0+` antes de usar Packet Tracer.

Durante el desarrollo (sin compilar) puede usarse
`npx tsx C:/.../packages/mcp/src/app.ts`.

### Claude Code / Claude Desktop

`claude_desktop_config.json` (o `.mcp.json` en la raíz del proyecto para Claude Code):

```json
{
  "mcpServers": {
    "packet-tools": {
      "command": "npx",
      "args": ["-y", "--package=@packet-tools-ai/mcp", "packet-tools-mcp"]
    }
  }
}
```

### OpenCode

`opencode.json`:

```json
{
  "mcp": {
    "packet-tools": {
      "type": "local",
      "command": ["npx", "-y", "--package=@packet-tools-ai/mcp", "packet-tools-mcp"],
      "enabled": true
    }
  }
}
```

### Codex CLI

`~/.codex/config.toml`:

```toml
[mcp_servers.packet-tools]
command = "npx"
args = ["-y", "--package=@packet-tools-ai/mcp", "packet-tools-mcp"]
```

### GitHub Copilot (VS Code)

`.vscode/mcp.json`:

```json
{
  "servers": {
    "packet-tools": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "--package=@packet-tools-ai/mcp", "packet-tools-mcp"]
    }
  }
}
```

### Cursor / Windsurf / otros clientes MCP

Mismo bloque `command` + `args`, en el archivo `mcp.json` del cliente:

```json
{
  "mcpServers": {
    "packet-tools": {
      "command": "npx",
      "args": ["-y", "--package=@packet-tools-ai/mcp", "packet-tools-mcp"]
    }
  }
}
```

### LM Studio

`mcp.json` en la carpeta de LM Studio (usa la variante con `command` + `args`):

```json
{
  "mcpServers": {
    "packet-tools": {
      "command": "npx",
      "args": ["-y", "--package=@packet-tools-ai/mcp", "packet-tools-mcp"]
    }
  }
}
```

### DeepSeek / agentes que sólo aceptan un comando

Algunos agentes (DeepSeek y clientes minimalistas) piden el lanzador como una
única línea. Equivale a lo anterior:

```bash
npx -y --package=@packet-tools-ai/mcp packet-tools-mcp
```

### Variables de entorno opcionales

Se pueden añadir a cualquier configuración de las anteriores. Todas tienen un
valor por defecto razonable:

| Variable              | Para qué sirve                                                       | Default                   |
| --------------------- | -------------------------------------------------------------------- | ------------------------- |
| `MCP_BRIDGE_PORT`     | Puerto del puente de Packet Tracer del MCP                            | `7532`                    |
| `MCP_BRIDGE_ENABLED`  | `false` deja el MCP sin puente (sólo GNS3/serial/SSH/Telnet)          | `true`                    |
| `MCP_DATA_DIR`        | Carpeta de la BD, skills y planes                                     | `~/.packet-tools/mcp`     |
| `DATABASE_URL_MCP`    | Ruta del SQLite del MCP (relativa a `MCP_DATA_DIR`)                   | `file:.packet_tools_mcp.db` |
| `MCP_GNS3_URL`        | URL por defecto del API de GNS3 cuando no hay una configurada         | vacío                     |
| `PT_EXTENSION_SECRET` | Secreto compartido con la extensión (vacío = identidad por user-agent)| vacío                     |
| `MCP_DEBUG`           | Logs de depuración por **stderr**                                     | `false`                   |
| `MCP_TRANSPORT`       | Transporte(s) del servidor: `stdio`, `http` o `both`                  | `stdio`                   |
| `MCP_HTTP_HOST`       | Interfaz donde escucha el servidor HTTP                               | `127.0.0.1`               |
| `MCP_HTTP_PORT`       | Puerto del servidor HTTP (`/mcp`, `/sse`, `/health`)                  | `7533`                    |
| `MCP_HTTP_TOKEN`      | Token estático opcional (`Authorization: Bearer` o `?token=`); vacío = abierto | vacío             |
| `MCP_HTTP_CORS_ORIGIN` | Origen permitido por CORS (para clientes web)                        | `*`                       |

> **Datos del MCP:** cuando se ejecuta con `npx` (caché inmutable), la base
> SQLite, las skills y los planes se guardan en `~/.packet-tools/mcp`, así que
> sobreviven a limpiezas de la caché de npm. Al ejecutar desde un clon se guardan
> dentro de `packages/mcp`.

> **Compatibilidad de `resources`:** si un cliente no soporta `resources` MCP (es
> el caso de los más ligeros, como LM Studio), las skills siguen siendo accesibles
> por las tools `skills_list` y `skills_read`. No se pierde funcionalidad.
