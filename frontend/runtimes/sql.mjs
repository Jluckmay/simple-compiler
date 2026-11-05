// runtimes/sql.mjs — Execução SQL (SQLite) via WASM.
// O SQLite WASM requer cabeçalhos COOP/COEP e arquivos .wasm separados que
// não estão disponíveis em CDNs genéricos. Fallback para backend.

import { runViaBackend } from './backend.mjs';

export async function run(code) {
  console.info('SQL: usando backend (SQLite WASM requer COOP/COEP headers)');
  return await runViaBackend('sql', code);
}
