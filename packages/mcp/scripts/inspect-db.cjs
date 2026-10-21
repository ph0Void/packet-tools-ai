
const Database = require("better-sqlite3");
const path = require("node:path");

const dbPath = process.argv[2] || path.join(__dirname, "..", ".packet_tools_mcp.db");
const db = new Database(dbPath, { readonly: true });

const tables = db
  .prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' " +
      "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name",
  )
  .all();

console.log(`Base de datos: ${dbPath}\n`);
console.log("Tablas y filas:");
for (const { name } of tables) {
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get();
  console.log(`  ${name.padEnd(24)} ${n} fila(s)`);
}

db.close();
