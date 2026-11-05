// runtimes/sql.mjs — Execução SQL (SQLite) via WASM.
// O SQLite WASM requer cabeçalhos COOP/COEP e arquivos .wasm separados que
// não estão disponíveis em CDNs genéricos.

export async function run(code) {
  console.info("SQL não é suportado no modo WASM.");
  return { output: "", error: null };
}
