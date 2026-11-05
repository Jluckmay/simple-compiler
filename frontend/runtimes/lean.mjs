// runtimes/lean.mjs — Execução Lean 4 via WASM oficial
// Fallback para backend se WASM não estiver disponível.

import { runViaBackend } from './backend.mjs';

export async function run(code) {
  console.info('Lean: usando backend (WASM oficial não implementado localmente)');
  return await runViaBackend('lean', code);
}
