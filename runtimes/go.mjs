// runtimes/go.mjs — Execução Go via WASM nativo (GOOS=js GOARCH=wasm)
// Fallback para backend se WASM não estiver disponível.

import { runViaBackend } from './backend.mjs';

export async function run(code) {
  console.info('Go: usando backend (WASM nativo não implementado localmente)');
  return await runViaBackend('go', code);
}
