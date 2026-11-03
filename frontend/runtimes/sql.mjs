// runtimes/sql.mjs — Execução SQL (SQLite) via sqlite-wasm (WASM).
// Banco de dados em memória; sem acesso a arquivos ou rede.

import initSqlJs from 'https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.46.0-build1/sqlite-wasm/jswasm/sqlite3-bundler-friendly.mjs';

let SQL = null;
let db = null;
let ready = false;
let initPromise = null;

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    SQL = await initSqlJs({});
    db = new SQL.Database();
    ready = true;
  })();
  return initPromise;
}

function formatRow(columns, values) {
  return columns.join(" | ") + "\n" + values.map((row) => row.join(" | ")).join("\n");
}

export async function run(code) {
  await init();
  const output = [];
  const statements = code
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      const prepared = db.prepare(stmt);
      const result = prepared.execute();
      prepared.free();
      if (result.columns && result.values && result.values.length > 0) {
        output.push(formatRow(result.columns, result.values));
      } else {
        output.push("OK");
      }
    } catch (err) {
      // Tenta como execução direta (CREATE, INSERT, etc.)
      try {
        db.exec(stmt);
        output.push("OK");
      } catch (err2) {
        output.push(`Erro: ${err2.message || String(err2)}`);
      }
    }
  }

  return {
    output: output.join("\n"),
    error: null,
  };
}
