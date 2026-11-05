// runtimes/csharp.mjs — Execução C# via Blazor WebAssembly (.NET)
// Fallback para backend se WASM não estiver disponível.

import { runViaBackend } from './backend.mjs';

export async function run(code) {
  console.info('C#: usando backend (Blazor WASM não implementado localmente)');
  return await runViaBackend('csharp', code);
}
