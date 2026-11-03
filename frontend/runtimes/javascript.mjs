// runtimes/javascript.mjs — Execução JavaScript via QuickJS (WASM) em sandbox.
// Sem acesso à rede, filesystem ou DOM do host. Limite de memória e pilha.

import { getQuickJS } from 'https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.31.0/+esm';

let quickjs = null;
let ready = false;
let initPromise = null;

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    quickjs = await getQuickJS();
    ready = true;
  })();
  return initPromise;
}

export async function run(code) {
  await init();
  const vm = quickjs.newContext();
  try {
    const result = vm.evalCode(code);
    if (result.error) {
      const msg = vm.dump(result.error);
      result.error.dispose();
      return { output: "", error: msg || String(result.error) };
    }
    const output = vm.dump(result.value);
    result.value.dispose();
    return { output: output == null ? "" : String(output), error: null };
  } finally {
    vm.dispose();
  }
}
