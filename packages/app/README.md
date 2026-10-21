# @packet-tools-ai/app

Aplicación web completa de **Packet Tools AI** para ejecutar en local: API Express (puerto 7531), frontend Next.js en modo standalone (puerto 3090) y base de datos SQLite propia. No incluye Electron ni un runtime de Node empaquetado: usa el Node del sistema (>= 20).

## Uso

```
npx -y --package=@packet-tools-ai/app packet-tools-ai-app
```

Al arrancar:

- crea los datos en `~/.packet-tools/app` (o en `PACKET_TOOLS_APP_DATA_DIR`);
- migra/siembra la base SQLite y abre `http://localhost:3090` en el navegador;
- imprime `✅ Web corriendo en http://localhost:3090 (Ctrl+C para detener)`.

Detén la aplicación con Ctrl+C.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `PACKET_TOOLS_APP_DATA_DIR` | Directorio de datos (base SQLite, `uploads/`, `logs/`, JWT secret). Por defecto `~/.packet-tools/app`. |
| `PACKET_TOOLS_NO_OPEN` | `1` = no abre el navegador automáticamente (modo headless). En ese modo, cerrar stdin también detiene la aplicación. |
| `SERVER_PORT` | Puerto del backend (7531 por defecto). El frontend se compila contra `http://localhost:7531`. |
| `PORT` | Puerto del frontend (3090 por defecto). La interfaz debe abrirse con `localhost`, nunca `127.0.0.1`. |

## Publicación

Publicado en npm como [`@packet-tools-ai/app`](https://www.npmjs.com/package/@packet-tools-ai/app). Para empaquetarlo en local: `npm run build` en la raíz del monorepo (ensambla `runtime/` con el server y el web ya compilados) y después `npm pack` dentro de este paquete.
