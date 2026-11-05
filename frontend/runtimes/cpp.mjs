// runtimes/cpp.mjs — Execução C++ via Emscripten WASM (clang++ -> wasm)
// Fallback para backend se WASM não estiver disponível.

import { runViaBackend } from './backend.mjs';

export async function run(code) {
  console.info('C++: usando backend (Emscripten WASM não implementado localmente)');
  return await runViaBackend('cpp', code);
}
