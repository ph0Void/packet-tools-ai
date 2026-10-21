# Packet Tools AI — Multi-agent network automation platform

[Español](./README.md) | **English**

![License](https://img.shields.io/badge/license-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020-339933)
![Windows](https://img.shields.io/badge/Windows-installer-0078D4)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Express](https://img.shields.io/badge/Express-5-000000)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)

Full-stack platform for network automation and management that unifies **simulators** (Cisco Packet Tracer and GNS3), **physical devices** (SSH, Telnet and serial console) and **AI agents** to configure, diagnose and document network infrastructure in natural language.

It is a TypeScript monorepo with an Express backend that orchestrates agents with Deep Agents, a Next.js frontend with a dashboard, web terminal and topology workspace, a native extension that connects Cisco Packet Tracer to the agent, and an MCP server that exposes the network engine to any coding agent (Claude Code, Codex CLI, OpenCode, Cursor, VS Code, LM Studio…).

It is also distributed as a **desktop application** with its own installer: it packages backend, frontend and database into a single program, without requiring Node.js or Docker on the target machine. Available for Windows (NSIS installer) and Linux (AppImage / `.deb`); see [Windows installer](#windows-installer).

- Repository: [github.com/ph0Void/packet-tools-ai](https://github.com/ph0Void/packet-tools-ai)
- [Website](https://packet-tools-ai.vercel.app)
- [Releases](https://github.com/ph0Void/packet-tools-ai/releases)
- npm packages: [`@packet-tools-ai/root`](https://www.npmjs.com/package/@packet-tools-ai/root) · [`@packet-tools-ai/app`](https://www.npmjs.com/package/@packet-tools-ai/app) · [`@packet-tools-ai/mcp`](https://www.npmjs.com/package/@packet-tools-ai/mcp)
- Per-package docs: [Backend](./packages/server/README.md) · [Frontend](./packages/web/README.md) · [Web app](./packages/app/README.md) · [Desktop](./packages/desktop/README.md) · [MCP](./packages/mcp/README.md) · [Packet Tracer extension](./extension-packetracer/README.md)

## Quick install

The fastest way to use Packet Tools, without cloning the repository or configuring anything:

```bash
npx -y --package=@packet-tools-ai/root packet-tools-ai
```

To keep it always available without going through `npx`:

```bash
npm i -g @packet-tools-ai/root   # installs the packet-tools-ai and packet-tools binaries
packet-tools-ai                  # opens the menu
```

The command asks for the interface language first (**Español** / **English**), remembers it in `~/.packet-tools/preferences.json` (Spanish by default) and then opens a menu with three options. The menu is driven with the **arrow keys** (`↑` / `↓`), confirmed with **Enter** and cancelled with `Ctrl+C`; the MCP multi-select is marked with **Space** (an `x` appears), `A` selects all and **Enter** confirms:

| Option | What it does |
| --- | --- |
| **Web** | Installs and starts the full application (backend + frontend) and opens the browser at `http://localhost:3090`. Uses the [`@packet-tools-ai/app`](https://www.npmjs.com/package/@packet-tools-ai/app) package. |
| **MCP** | Configures the MCP server in your coding agents: Claude Desktop, Claude Code, Cursor, Windsurf, LM Studio, OpenCode, VS Code and Codex CLI. It ships 95 MCP tools grouped in 7 domains. |
| **Desktop** | Opens the [Releases](https://github.com/ph0Void/packet-tools-ai/releases) page to download the Windows installer; Linux is available as AppImage / `.deb`. |

Installer options:

- `--web`, `--mcp`, `--desktop`: run the corresponding flow directly, without going through the menu.
- `--mcp-server`: starts the MCP server over stdio (bin `packet-tools-mcp`).
- `--lang es|en`: forces the language for that run only.
- `--no-color`: disables colors for that run only (also `NO_COLOR=1`).
- `--help` / `--version`: show the help or the version.
- `PACKET_TOOLS_LANG=es|en`: environment variable equivalent to `--lang`.
- `PACKET_TOOLS_NO_TUI=1`: forces the plain-text mode (numbers + Enter) even on a terminal.

If you only want one of the two pieces, without the menu:

```bash
npx -y --package=@packet-tools-ai/app packet-tools-ai-app   # web app only
npx -y @packet-tools-ai/mcp                                 # MCP server only
```

## Installation guide

There are four ways to install Packet Tools. Pick the one that fits what you need:

| Method | You need | Best for |
| --- | --- | --- |
| [1. npm installer](#1-npm-installer-recommended) | Node.js 20+ | Trying the web app, MCP or desktop on your machine |
| [2. Web app directly](#2-web-app-directly) | Node.js 20+ | Running only the web application (backend + frontend) |
| [3. MCP server](#3-mcp-server-in-your-coding-agent) | Node.js 20+ | Connecting your network to coding agents |
| [4. Source, Docker or desktop](#4-from-source-docker-or-desktop) | Git, Docker | Development, deployment or install without Node.js |

### Common requirements

- **Node.js 20 or higher** (22 LTS recommended) and **npm 10+**. Check with `node -v` and `npm -v`.
- **Ports `7531`** (API) and **`3090`** (web) free. If they are taken you can change them: `SERVER_PORT` and `PORT` for the web app, or the `.env` for the source code.
- **~250 MB of disk** to cache the web app. The desktop installer does not need Node.js.
- Internet connection the first time (packages are downloaded from npm).

### 1. npm installer (recommended)

The fastest route: a single command opens a menu and handles everything. You do not need to clone the repository.

**Step 1 — Open a terminal** (PowerShell, CMD, macOS Terminal or a Linux shell).

**Step 2 — Run the installer:**

```bash
npx -y --package=@packet-tools-ai/root packet-tools-ai
```

> `--package=` is required: the package ships three binaries (`packet-tools-ai`, `packet-tools` and `packet-tools-mcp`), so `npx` must be told which one to run.

**Step 3 — Pick a language** (Español / English). It is saved in `~/.packet-tools/preferences.json` and remembered next time.

**Step 4 — Choose a menu option:**

Use `↑` / `↓` to move the cursor and `Enter` to confirm. In the MCP agent list, `Space` marks each one with an `x`, `A` selects all and `Enter` confirms the selection.

| Option | What happens |
| --- | --- |
| **Web** | Downloads `@packet-tools-ai/app`, starts backend and frontend, and opens `http://localhost:3090`. Data lives in `~/.packet-tools/app`. Stop it with `Ctrl+C`. |
| **MCP** | Lists the detected agents, writes their configuration and leaves the server ready to use. |
| **Desktop** | Opens the [Releases](https://github.com/ph0Void/packet-tools-ai/releases) page to download the Windows installer. |

If you prefer to skip the menu, use the shortcuts: `--web`, `--mcp`, `--desktop`, `--mcp-server`, `--lang es|en`, `--no-color`, `--help` and `--version`.

**Step 5 — Sign in** with `admin` / `admin123` and go to **Configuration** to add your AI provider. Change the password if you are going to use it outside your machine.

### 2. Web app directly

If you only want the web application, run it without the menu:

```bash
npx -y --package=@packet-tools-ai/app packet-tools-ai-app
```

On startup it:

- creates the data (SQLite, `uploads/`, `logs/` and the JWT secret) in `~/.packet-tools/app`;
- applies migrations and the seed automatically;
- starts the API at `http://localhost:7531` and opens `http://localhost:3090`.

Useful variables:

| Variable | What it does | Default |
| --- | --- | --- |
| `PACKET_TOOLS_APP_DATA_DIR` | Data folder (SQLite database, `uploads/`, `logs/`, JWT) | `~/.packet-tools/app` |
| `PACKET_TOOLS_NO_OPEN` | `1` = do not open the browser (headless mode) | disabled |
| `SERVER_PORT` | API port | `7531` |
| `PORT` | Frontend port | `3090` |

> Always open the UI through `localhost`, never `127.0.0.1`: the backend bakes that URL and the cookies are bound to that host.

### 3. MCP server in your coding agent

The MCP server exposes the Packet Tools engine (Packet Tracer, GNS3, serial, Telnet and SSH) to agents such as Claude, Cursor, OpenCode, VS Code or Codex CLI. It is a lightweight, standalone package:

```bash
npx -y @packet-tools-ai/mcp
```

Usually you invoke it from your agent configuration. The installer (`packet-tools-ai --mcp`) already writes the entry for you in the 8 supported clients; if you prefer to do it by hand, the entry is:

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

Per-client details (Claude Code, Cursor, Windsurf, LM Studio, OpenCode, VS Code, Codex CLI, DeepSeek) and the HTTP transport are in [`packages/mcp/README.md`](./packages/mcp/README.md).

### 4. From source, Docker or desktop

- **Source** (development): clone the repository and follow the [Quick start guide](#quick-start-guide) — the same flow of `npm run init`, migrations and `npm run dev`.
- **Docker** (deployment): all-in-one image with `docker compose up --build`; see [Docker](#docker).
- **Desktop** (no Node.js): download the Windows installer from [Releases](https://github.com/ph0Void/packet-tools-ai/releases); see [Windows installer](#windows-installer).

### Verify the installation

```bash
packet-tools-ai --version                  # 1.3.0
curl http://localhost:7531/api/health      # {"success":true,...}
```

- **Web**: `http://localhost:3090` should show the sign-in screen.
- **MCP**: `npx -y @packet-tools-ai/mcp` should print `MCP server ready (stdio): 95 tools from 7 domains`.

### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `npm error could not determine executable to run` | `--package=` is missing. Use `npx -y --package=@packet-tools-ai/root packet-tools-ai`. |
| `EADDRINUSE` on `7531` or `3090` | Another process is using the port (sometimes a previous instance). Close it or export a different `SERVER_PORT` / `PORT`. |
| The browser does not open or the web app fails to connect | Open `http://localhost:3090` (not `127.0.0.1`) and confirm the process is still running in the terminal. |
| `Packet Tools AI necesita Node >= 20` | Upgrade Node.js to 20+ (`node -v`) and run the command again. |
| `npx` is slow on every run | Install globally (`npm i -g @packet-tools-ai/root` or `npm i -g @packet-tools-ai/app`) to avoid downloading each time. |
| The agent does not detect the MCP server | Restart the agent after writing the configuration and check that `npx -y @packet-tools-ai/mcp` starts without errors. |
| `packet_tracer_*` tools fail with `EADDRINUSE` on `7532` | Another MCP instance or the backend is holding the bridge. Close the other instance or set `MCP_BRIDGE_PORT`. |

## Description

Packet Tools was born from a simple idea: **a single place to manage the network, with the help of agents**. From the dashboard you can open an SSH console to a real switch, ask the agent to check and configure the network, spin up a topology in Packet Tracer or GNS3, save the resulting topology, schedule recurring tasks and keep a record of everything that happens.

The agent is not a chatbot that only replies with text: it is a **console and simulator controller** with real tools. It connects to devices through the same protocols an engineer would use, classifies the risk of each command and, when an action is sensitive, asks for human approval before executing it (Human-in-the-Loop).

## Main features

### Agentic multi-agent AI

- Orchestration with **Deep Agents**: a supervisor node routes each request to the correct specialist agent and enables chained delegations with visible handoff in the chat.
- **Five specialist agents**: Packet Tracer, GNS3, SSH, Telnet and serial console, each with its own tools.
- **Auto-routing**: if the message carries a target connection (`@device` or the chat selector), the request goes directly to the agent for the corresponding protocol; otherwise the supervisor decides.
- **Autonomous mode** for `STAFF` and `ADMIN`: runs actions without confirmations (destructive commands remain protected).

### Multiple AI providers

- **Supported providers**: OpenAI, Google (Gemini), Anthropic, OpenRouter, Ollama, LM Studio and custom endpoints compatible with the OpenAI API.
- **CHAT** and **EMBEDDING** models, with temperature, `baseUrl`, masked API key, individual activation and per-role permissions (`userPermission`).
- Per-conversation model selector and automatic fallback for local models that return empty streams.
- Global system prompt configurable by the `ADMIN`.

### Built-in web terminal

- **xterm.js** console with **SSH** (full shell via `ssh2`), **Telnet** and **serial port** (RS-232 / USB-Serial) connections with configurable baudrate.
- The agent **operates the active console**: it detects the prompt, waits for the output, respects device timing and does not open parallel connections.
- Cisco output highlighting, local echo, password mode detection, reconnection and markers for AI-injected commands.
- Logged sessions (`GET /api/terminal/sessions`) and **read-only** mode for the `USER` role.

### Human-in-the-Loop (HITL)

- Every tool has a risk policy: read, configuration, destructive or session control.
- **Destructive** commands (`reload`, `write erase`, `erase`, `format`, `delete`, `boot system`) require explicit approval and are never run without an interactive channel.
- The agent cannot close the user's console (`exit`, `quit`, `logout`) and closing batches are blocked entirely.
- Approvals expire (10 minutes), count retries and are recorded in the chat history.

### Simulators and physical devices

- **Cisco Packet Tracer**: own extension (Socket.IO) with more than 30 tools: create topologies, add devices, modules and links, configure IOS, simulate PDUs, move/power on devices, export/import topologies, etc.
- **GNS3**: REST client to create projects, nodes, links, templates and power control for virtual machines.
- **Physical devices**: modeled vendors Cisco, Huawei, Aruba, MikroTik and generic ones, over SSH, Telnet or serial console.

### Knowledge base (RAG) and web search

- Uploading of `.pdf`, `.txt` and `.md` documents (up to 25 MB) from the web, indexed with embeddings from the active provider.
- Deterministic query from the chat with the `@rag` mention and the `search_knowledge_base` tool available to all agents.
- Built-in web search without an API key (DuckDuckGo Lite) for current data.

### Topology workspace

- Interactive canvas (React Flow) with nodes per device type, interface and IP inspector and live states.
- **Packet Tracer sync** (`getNetwork`) to mirror the simulator's real topology.
- Save, update and export/import of topologies in the database.

### Automation and operations

- **Scheduled tasks (cron)**: `STANDARD` type (runs the `payload` commands against the device) and `INTELLIGENT` type (the agent runs the task on the associated topology or device) with validated cron expression and preview.
- **Alerts** by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) linked to topologies.
- **Audit logs** of agents, tools and cron, with filters and deletion only for `ADMIN`.
- Dashboard with metrics, recent alerts and quick access; persistent light/dark theme.

### Security

- **JWT in an httpOnly cookie** authentication, additionally validated against the token stored in the database (logout invalidates the session).
- Hierarchical roles `USER` < `STAFF` < `ADMIN` applied on every API route and on the sockets.
- Rate limit on authentication, `zod` validation, CORS with credentials and automatic masking of secrets (`password`, `token`, `apiKey`) in responses.

### Multimodal chat

- Up to 4 attachments per message: images (sent to the model as base64 blocks) and documents (PDF/TXT/MD/CSV/JSON extracted to text).
- Per-user chat-style conversation history, with tool cards, live reasoning and interleaved segments of text and execution.
- The AI model and connection/device selection is remembered per chat (persisted in the database and in local cache).

### MCP server (Model Context Protocol)

- Exposes the Packet Tools engine (Packet Tracer, GNS3, serial, Telnet and SSH) as **MCP tools** that any coding agent can invoke: **Claude Code, Codex CLI, OpenCode, VS Code (GitHub Copilot), LM Studio, Cursor, Windsurf, DeepSeek** and any standard MCP client.
- Runs straight from npm (and also from GitHub), without cloning or compiling:

  ```json
  {
    "mcp": {
      "packet-tools": {
        "type": "local",
        "command": [
          "npx",
          "-y",
          "--package=@packet-tools-ai/mcp",
          "packet-tools-mcp"
        ],
        "enabled": true
      }
    }
  }
  ```

- The installer (`npx -y --package=@packet-tools-ai/root packet-tools-ai`, **MCP** option) configures it automatically in 8 clients: Claude Desktop, Claude Code, Cursor, Windsurf, LM Studio, OpenCode, VS Code and Codex CLI.
- **95 tools across 7 domains** (`packet_tracer_*`, `gns3_*`, `serial_*`, `telnet_*`, `ssh_*`, `plan_*`, `skills_*`) over the **stdio** transport.
- The Packet Tracer integration requires the **extension v1.1.0 or higher**; the rest of the domains work without it. Details and per-client setup in [`packages/mcp/README.md`](./packages/mcp/README.md).
- Besides **stdio**, it also exposes a **remote HTTP** transport (`/mcp` Streamable HTTP and legacy `/sse`), intended for web clients such as **Gemini Apps** (public HTTPS URL via tunnel); details in [`packages/mcp/README.md`](./packages/mcp/README.md).

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js, TypeScript, Express 5, `tsx`, Socket.IO |
| AI | LangChain + Deep Agents (`deepagents`), OpenAI, Google, Anthropic, OpenRouter, Ollama, LM Studio, custom |
| Database | Prisma 7 + SQLite (`better-sqlite3`) |
| Frontend | Next.js 16 (App Router), React 19 + React Compiler, Tailwind CSS v4, shadcn UI, Zustand |
| Desktop | Electron + electron-builder (NSIS installer, AppImage, `.deb`) |
| Terminal and topologies | `@xterm/xterm`, React Flow (`@xyflow/react`) |
| Connectivity | `ssh2`, Telnet over `net`, `serialport`, GNS3 REST client |
| Testing | Vitest + Supertest (backend) |
| Monorepo | npm workspaces + Turborepo |
| Containers | Docker + Docker Compose |

## Repository structure

```text
packet-tools-ai/
├── packages/
│   ├── server/                 # Backend: API, agents, sockets, Prisma (see packages/server/README.md)
│   ├── web/                    # Frontend: dashboard, chat, terminal, workspace (see packages/web/README.md)
│   ├── app/                    # npm package for the web app: backend + frontend without Electron (see packages/app/README.md)
│   ├── desktop/                # Electron desktop installer (NSIS, AppImage, deb; see packages/desktop/README.md)
│   └── mcp/                    # MCP server (Model Context Protocol; see packages/mcp/README.md)
├── extension-packetracer/      # Cisco Packet Tracer native extension (JavaScript, Socket.IO client)
├── bin/                        # Installer CLI (Web/MCP/Desktop menu, ES/EN i18n)
├── scripts/                    # Installer verification and MCP configuration
├── dockerfile                  # All-in-one image (backend + frontend)
├── docker-compose.yml          # One-command deployment with a volume for SQLite
├── docker-entrypoint.sh        # Migrations + seed + service startup
├── .example.env                # Environment variable template
├── turbo.json                  # Turborepo pipeline
└── package.json                # Root scripts and workspaces
```

## Requirements

- **Node.js 20 or higher** (22 LTS recommended) and **npm 10+**.
- A copy of the `.env` file at the root (generated with `npm run init` from `.example.env`).
- **Desktop installer** (alternative without Node.js): see [Windows installer](#windows-installer).
- Optional:
  - **Docker Desktop** to deploy everything in a container.
  - **Cisco Packet Tracer** with the extension installed to use the simulation agent.
  - **GNS3** (local server at `http://localhost:3080`) for virtual labs.
  - Physical devices reachable over SSH, Telnet or console cable.

## Quick start guide

> Just want to use it on your PC? Skip straight to the [Windows installer](#windows-installer); you do not need Node.js or Docker.

### 1. Clone and install

```bash
git clone https://github.com/ph0Void/packet-tools-ai.git
cd packet-tools-ai
npm run init   # copies .example.env to .env and installs dependencies
```

> `npm run init` uses `cp`; it works on Linux, macOS, Git Bash and PowerShell (`Copy-Item` alias).

### 2. Prepare the database

```bash
npm run migrate    # creates the SQLite database and applies migrations
npm run generate   # generates the Prisma client
npm run seed       # loads initial data (admin user, sample devices and models)
```

### 3. Start the environment

```bash
npm run dev        # backend + frontend in parallel (Turborepo)
```

| Service | URL |
| --- | --- |
| Frontend (dashboard) | `http://localhost:3090` |
| Backend (API + Socket.IO) | `http://localhost:7531` |

Ports are defined in the root `.env` (`PORT` and `SERVER_PORT`).

### 4. Sign in

| User | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | `ADMIN` |

> Warning: change the `admin` password and set your own `JWT_SECRET` before exposing the service outside your machine. The key included in `.example.env` is only a sample.

### 5. Configure an AI provider

1. Sign in to the dashboard with `admin`.
2. Go to **Configuration** (`/dashboard/configuration`).
3. Add or edit a model provider: choose the provider, the model, the `baseUrl` (for Ollama/LM Studio/custom) and the API key when applicable.
4. Enable it and adjust `userPermission` to decide which roles can use it.
5. For RAG, also enable an `EMBEDDING` provider.

### 6. Connect the Packet Tracer extension (optional)

1. Copy the `extension-packetracer/` folder into the `extensions` directory of your Cisco Packet Tracer installation and restart the program.
2. With the backend running, open **Extensions > Packet Tracer API**; a window will open showing the connection status.
3. From the chat or the Packet Tools workspace you can now ask the agent to create topologies, add devices and simulate traffic.

## Windows installer

Packet Tools includes a **desktop installer** (Electron + electron-builder) that packages the backend, the frontend and the SQLite database into a single application. **It does not require Node.js, Docker or additional dependencies** on the machine where it is installed: the application ships its own Node runtime and starts everything automatically.

1. Download `Packet Tools Setup <version>.exe` from the [Releases](https://github.com/ph0Void/packet-tools-ai/releases) section.
2. Run the installer (it allows you to choose the installation folder and creates shortcuts).
3. Open **Packet Tools**: the application starts the backend and the frontend, and opens its own window. The first launch applies migrations, runs the seed and creates the `admin` / `admin123` user.

| Detail | Value |
| --- | --- |
| Requirements | Windows 10/11 (x64); ports `7531` and `3090` free |
| Data and configuration | `%APPDATA%\Packet Tools` (database, `uploads/`, `logs/` and automatically generated JWT secret) |
| Services | Backend at `http://localhost:7531` and frontend at `http://localhost:3090` |
| Other platforms | The same pipeline generates `AppImage` and `.deb` for Linux |

To build the installer from the source code:

```bash
npm run build-desktop -- --win     # NSIS installer (.exe) — built on Windows
npm run build-desktop -- --linux   # AppImage / .deb — built on Linux
```

Artifacts are placed in `packages/desktop/dist/`. The process downloads Electron, the Node runtime and the packaging tools (it requires an internet connection) and does not need Visual Studio Build Tools. Technical packaging details in [`packages/desktop/AGENTS.md`](./packages/desktop/AGENTS.md).

## Docker

The repository includes an **all-in-one** image that runs backend and frontend in the same container (this is the simplest configuration, because `NEXT_PUBLIC_API_URL` points to `http://localhost:7531`, valid both from your browser and inside the container).

```bash
cp .example.env .env     # if it does not exist yet
docker compose up --build
```

| Resource | Detail |
| --- | --- |
| Frontend | `http://localhost:3090` |
| Backend | `http://localhost:7531` |
| Data | `packet-tools-data` volume mounted at `/app/data` (`DATABASE_URL=file:/app/data/packet_tools.db`) |
| Startup | The entrypoint applies migrations (`prisma migrate deploy`), runs the seed and starts both services |
| Health | Healthcheck against `GET /api/health` |

Notes:

- On startup, the container creates the `admin` / `admin123` user. Change it after the first login.
- **Prisma migrations are not versioned** in this repository (`packages/server/prisma/migrations/`): they are generated locally with `npm run migrate` from `schema.prisma`. Run `npm run migrate` at least once before building the image, otherwise the entrypoint's `migrate:deploy` has nothing to apply and the seed will fail.
- The root `.env` values are passed to the container (`env_file`); `NEXT_PUBLIC_API_URL` is also used as a build argument, so if you deploy on a remote server edit it before building (for example `NEXT_PUBLIC_API_URL=http://my-server:7531`).
- For physical devices over **serial port**, uncomment the `devices` mapping in `docker-compose.yml` (`/dev/ttyUSB0:/dev/ttyUSB0`).
- Manual build without Compose:

```bash
docker build -f dockerfile --build-arg NEXT_PUBLIC_API_URL=http://localhost:7531 -t packet-tools .
docker run -p 7531:7531 -p 3090:3090 -v packet-tools-data:/app/data --env-file .env packet-tools
```

## Environment variables

All of them live in the root `.env` of the monorepo. Template: [`.example.env`](./.example.env).

> The `.env`, the SQLite database (`packages/server/.packet_tool_database.db`), the uploaded files (`packages/server/uploads/`) and the logs are gitignored and never published to the repository. See [What is not published](#what-is-not-published).

| Variable | Description | Default value |
| --- | --- | --- |
| `NAME` | Project name | `Packet Tools` |
| `VERSION` | Visible version | `1.3.0` |
| `URL_GITHUB` | Repository URL | `https://github.com/ph0Void/packet-tools-ai` |
| `SERVER_PORT` | Backend port | `7531` |
| `PORT` | Frontend port | `3090` |
| `NODE_ENV` | Environment (`development` / `production` / `test`) | `development` |
| `DATABASE_URL` | SQLite file path (relative to `packages/server`) | `file:.packet_tool_database.db` |
| `JWT_SECRET` | JWT signing key | long random string |
| `JWT_EXPIRATION` | Token lifetime in seconds or string (`30d`) | `36000` |
| `RATE_LIMIT_REFRESH` | Rate limit window in ms | `900000` |
| `RATE_LIMIT_REQUESTS` | Requests per window | `100` |
| `NEXT_PUBLIC_API_URL` | Backend base URL | `http://localhost:7531` |
| `NEXT_PUBLIC_PROYECT_NAME` | Name displayed in the frontend | `Packet Tools AI` |
| `DESKTOP_OBFUSCATE` | Compiles backend and frontend to V8 bytecode before packaging the installer | `true` |
| `NEXT_PUBLIC_COOKIE_NAME` | Session cookie name | `packet-tools-cookie` |

The `AGENT_*` variables (context, token, retry and timeout limits) and the `MCP_*` ones (remote HTTP transport) are optional and documented — commented out — in [`.example.env`](./.example.env).

## Available scripts

From the monorepo root:

| Script | Description |
| --- | --- |
| `npm run init` | Copies `.example.env` to `.env` and installs dependencies |
| `npm run dev` | Starts backend and frontend in parallel |
| `npm run build` | Compiles backend, frontend and MCP server |
| `npm run build:mcp` | Compiles only the MCP server (`packages/mcp`) |
| `npm run build-desktop` | Builds the desktop installer (Electron); accepts `-- --win` / `-- --linux` |
| `npm run lint` | Frontend ESLint |
| `npm run migrate` | Creates and applies migrations (development) |
| `npm run generate` | Regenerates the Prisma client |
| `npm run reset` | Recreates the database (destructive) |
| `npm run seed` | Loads the initial data |
| `npm run studio` | Opens Prisma Studio |
| `npm test` | Runs the backend test suite (87 suites) |
| `npm run test:installer` | Verifies the CLI installer (Web/MCP/Desktop menu, ES/EN) |
| `npm run test-pt` / `test-terminal` / `test-telnet` / `test-ssh` / `test-serial` / `test-gns3` | Live suites against real transports (require connected hardware or simulators) |

Tests:

```bash
npm test                        # full suite
npm test -- test/auth.test.ts   # a single suite
npm test -- --watch             # watch mode
```

Minimum verification before sending changes: `npm run lint` + `npm run build`; if you touched the backend, also `npm test`. The frontend has no typecheck or test script: validate it with `npx tsc --noEmit` and its runnable checks in `packages/web/scripts/` (see `packages/web/AGENTS.md`).

## Roles and permissions

| Role | Scope |
| --- | --- |
| `USER` | Read access to resources, own chats, own alerts, read-only terminal and use of the models enabled by the `ADMIN` |
| `STAFF` | Everything above plus CRUD of devices, topologies, alerts, scheduled tasks and knowledge base; HITL approvals and autonomous mode |
| `ADMIN` | Full management: users, AI providers, global configuration, log deletion and all the operations above |

## What is not published

This repository is public and does **not** include runtime data. `.gitignore` keeps out:

- `.env` and any `.env.*` (only `.example.env` is versioned, with sample values).
- Local SQLite databases: `packages/server/.packet_tool_database.db`, `packages/mcp/.packet_tools_mcp.db` and any `*.db` / `*.sqlite`.
- Files uploaded by users (`packages/server/uploads/`) and logs.
- The generated Prisma migrations (`packages/server/prisma/migrations/`): they are created locally with `npm run migrate` from `schema.prisma`.
- Build artifacts: `dist/`, `.next/`, `.turbo/`, `packages/app/runtime/` and the installer (`packages/desktop/dist/`, `.staging/`, `.cache/`).
- Internal working notes (`PRIVATE.md`, `BACKLOG.md`, `RESUME.md`) and local agent configuration.

API keys are never stored in the code: every user configures their own from the interface and they are kept in that user's local database, masked when read through the API.

## Upcoming changes

- **Per-vendor configuration templates**: the `ConfigTemplate` model is already in the database; the CRUD, the UI and the execution of templates with variables (`hostname`, `ip`, etc.) from the chat and the scheduled tasks are still pending.
- **Deeper multi-agent delegation**: evolve from "one directive → one specialist" to "one directive → multiple agents → delegation → execution → verification → result", with a final synthesis by the supervisor.
- **More devices and protocols**: expand coverage for the already modeled vendors (Huawei, Aruba, MikroTik).
- **Syslog listener for GNS3**: capture the logs of virtualized devices (the GNS3 REST API does not expose them; it would require a UDP receiver in the backend).
- **Extension documentation**: step-by-step installation guide and screenshots of the full flow.
- **Test coverage**: add integration tests for the frontend and for the terminal and topology flows.

## Contributing

Contributions are welcome. If you find a bug or want to propose an improvement, open an [issue](https://github.com/ph0Void/packet-tools-ai/issues) or send a pull request describing the change.

## License

MIT. See [`LICENSE.md`](./LICENSE.md) for more detail.

## Author

Developed by [ph0Void](https://github.com/ph0Void).
