// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.
// Usa a classe WebR do webr para instanciar um ambiente R e executar código.
// Captura saída via r.print() e converte resultado para string com r.toJson().

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
  const output = [];
  try {
    // Captura print() via globalThis.print override
    const originalPrint = globalThis.print;
    globalThis.print = (...args) => {
      output.push(args.map(String).join(" "));
    };
    try {
      await r.evalR(code);
    } finally {
      globalThis.print = originalPrint;
    }
    // Tenta obter o último resultado como JSON
    try {
      const json = await r.toJson(code);
      if (json && json !== "null") {
        output.push(json);
      }
    } catch (_) {}
    return {
      output: output.join("\n"),
      error: null,
    };
  } catch (err) {
    return { output: output.join("\n"), error: err.message || String(err) };
  }
}
