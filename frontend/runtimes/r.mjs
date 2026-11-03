// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.
// Usa a classe WebR do webr para instanciar um ambiente R e executar código.
// Captura saída via interceptação de console.log (webr envia saída R para console).

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
  const originalLog = console.log;
  console.log = (...args) => {
    const msg = args.map(String).join(" ");
    // Captura saída do R (webr envia como "[log] [1] 2" ou similar)
    if (msg.includes("[1]") || msg.match(/^\[/)) {
      output.push(msg.replace(/^\[log\]\s*/, ""));
    }
    originalLog.apply(console, args);
  };
  try {
    await r.evalR(code);
  } finally {
    console.log = originalLog;
  }
  const text = output.join("\n");
  return { output: text, error: null };
}
