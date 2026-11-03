// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.
// Usa a classe WebR do webr para instanciar um ambiente R e executar código.

import { WebR } from 'https://cdn.jsdelivr.net/npm/webr@0.4.2/+esm';

let r = null;
let ready = false;
let initPromise = null;

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    r = new WebR();
    await r.init();
    ready = true;
  })();
  return initPromise;
}

export async function run(code) {
  await init();
  try {
    const result = await r.evalR(code);
    const output = result === undefined || result === null ? "" : String(result);
    return { output, error: null };
  } catch (err) {
    return { output: "", error: err.message || String(err) };
  }
}
