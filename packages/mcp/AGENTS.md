# MCP — Packet Tools (`@packet-tools-ai/mcp`)

Servidor **MCP** que expone el motor de Packet Tools (Packet Tracer, GNS3, serial,
Telnet, SSH, planes y skills) como herramientas para cualquier cliente MCP.
El paquete se publica como `@packet-tools-ai/mcp` en npm y puede
lanzarse por **stdio**, por **HTTP** (`/mcp` y `/sse`) o por ambos.

## Mapa de carpetas

- `src/core/` — `McpServer`, `ToolRegistry`, errores y `McpHttpServer` (transportes HTTP `/mcp` y `/sse` + `/health`).
- `src/domains/` — un módulo por dominio (`packetTracer`, `gns3`, `serial`, `telnet`, `ssh`, `plan`, `skills`).
- `src/transports/` — `DeviceTransport`, adaptadores y motor multi-fabricante.
- `src/skills/` — cargador de skills y exposición como resources MCP.
- `src/prisma/` — cliente de la BD propia y `Migrator` (aplica migraciones en runtime).
- `src/config/` — `EnvConfig.ts` (defaults) y `CliArgs.ts` (flags `--transport` y `--http-port`).
- `prisma/` — esquema y migraciones del SQLite propio.
- `scripts/` — `prisma-generate.mjs`, `rewrite-dist.mjs` (reescribe el alias `@/` en `dist`), `verify-protocol.cjs`, `verify-http.cjs` e `inspect-db.cjs`.
- `test/` — `smoke.ts` y `bridge.test.ts`.
- `skills/*.md` y `plans/*.md` — datos de usuario (en un clon; con `npx`, en `~/.packet-tools/mcp`).

## Comandos (dentro del paquete)

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | `tsx watch src/app.ts` |
| `npm run build` | `prisma generate` + `tsc` + reescritura del alias en `dist` |
| `npm start` | `node dist/app.js` |
| `npm run migrate` / `migrate:deploy` | migraciones del SQLite propio |
| `npm test` | prueba de humo (stdio) |
| `npm run test:protocol` | verifica el protocolo MCP contra el servidor |
| `npm run test:http` | verifica `/mcp`, `/sse` y `/health` |
| `npm run inspect-db` | inspecciona la BD del MCP |

## Transportes y endpoints

- `MCP_TRANSPORT` (`stdio` default | `http` | `both`) o flags `--transport=` y `--http-port=` (los flags mandan sobre el env).
- `POST/GET/DELETE /mcp` — Streamable HTTP (protocolo `2025-03-26`), sesiones con header `mcp-session-id`.
- `GET /sse` + `POST /messages?sessionId=` — HTTP+SSE legacy (`2024-11-05`).
- `GET /health` — estado JSON sin auth.

## Variables de entorno propias

`MCP_TRANSPORT`, `MCP_HTTP_HOST`, `MCP_HTTP_PORT`, `MCP_HTTP_TOKEN`,
`MCP_HTTP_CORS_ORIGIN`, `MCP_BRIDGE_PORT`, `MCP_BRIDGE_ENABLED`, `MCP_DATA_DIR`,
`DATABASE_URL_MCP`, `MCP_GNS3_URL`, `PT_EXTENSION_SECRET` y `MCP_DEBUG`. Las
nuevas deben listarse en el `globalEnv` de `turbo.json` del root.

## Reglas de código

- **Sin comentarios** en `src/`, `scripts/` y `test/` (se eliminan a propósito).
- Identificadores en **inglés**; documentación y mensajes para el usuario en español.
- El alias `@/` de los imports lo reescribe `scripts/rewrite-dist.mjs` al compilar.
- `dist/` **se commitea a propósito**: es lo que ejecuta el `npx` desde GitHub y lo que se publica en npm. Corre `npm run build` antes de hacer push de cambios del MCP.

## Publicación npm

- Nombre `@packet-tools-ai/mcp`; `files` incluye `dist`, `prisma/schema.prisma` y `prisma/migrations` (el `Migrator` aplica las migraciones en runtime).
- `prepublishOnly` compila (`npm run build`) antes de publicar.
- Al correr desde `node_modules`, los datos de usuario (BD, skills, planes) se guardan en `~/.packet-tools/mcp`.
