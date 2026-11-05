// runtimes/java.mjs — Execução Java via CheerpJ WASM
// Fallback para backend se WASM não estiver disponível.

import { runViaBackend } from './backend.mjs';

export async function run(code) {
  console.info('Java: usando backend (CheerpJ WASM não implementado localmente)');
  return await runViaBackend('java', code);
}
