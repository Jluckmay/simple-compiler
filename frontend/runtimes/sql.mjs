// runtimes/sql.mjs — Execução SQL (SQLite) via WASM.
// O SQLite WASM requer cabeçalhos COOP/COEP e arquivos .wasm separados que
// não estão disponíveis em CDNs genéricos. Por enquanto, exibe uma mensagem
// informativa direcionando o usuário para o servidor backend.

export async function run(code) {
  return {
    output: "",
    error: "SQL via WASM requer cabeçalhos COOP/COEP e arquivos .wasm separados que não estão disponíveis neste CDN. Use o servidor backend (Flask + Docker) para executar SQL.",
  };
}
