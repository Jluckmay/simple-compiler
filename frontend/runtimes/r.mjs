// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.
// Usa a classe WebR do webr para instanciar um ambiente R e executar código.
// Captura saída via capture.output() do R e toJson() para o último resultado.

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
    // Wrap code to capture printed output using R's capture.output()
    const wrapped = `capture.output({${code}})`;
    const result = await r.evalR(wrapped);
    // result é um vetor de caracteres R com cada linha de saída
    const lines = await r.toJson(result);
    const output = lines ? String(lines) : "";
    return { output, error: null };
  } catch (err) {
    return { output: "", error: err.message || String(err) };
  }
}
