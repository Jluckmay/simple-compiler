// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.

import * as webr from 'https://cdn.jsdelivr.net/npm/webr@0.4.2/+esm';

let ready = false;
let initPromise = null;

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await webr.init({});
    ready = true;
  })();
  return initPromise;
}

export async function run(code) {
  await init();
  try {
    const result = webr.evalR(code);
    const output = result === undefined || result === null ? "" : String(result);
    return { output, error: null };
  } catch (err) {
    return { output: "", error: err.message || String(err) };
  }
}
