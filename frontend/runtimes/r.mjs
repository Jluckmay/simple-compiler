// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.
// Usa a classe WebR do webr para instanciar um ambiente R e executar código.
// Captura saída via capture.output() + paste() do R.
// Tenta múltiplas abordagens para converter o resultado R para string JS.

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

function toJsText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  // Tenta acessar propriedades comuns de proxy R
  for (const key of ["__value__", "value", "data", "toString"]) {
    try {
      const v = value[key];
      if (v !== undefined && v !== null) {
        if (typeof v === "function") {
          const s = v.call(value);
          if (typeof s === "string") return s;
        } else if (typeof v === "string") return v;
      }
    } catch (_) {}
  }
  return String(value);
}

export async function run(code) {
  await init();
  try {
    // Wrap code to capture printed output and collapse to single string
    const wrapped = `paste(capture.output({${code}}), collapse="\\n")`;
    const result = await r.evalR(wrapped);
    const output = toJsText(result);
    return { output, error: null };
  } catch (err) {
    return { output: "", error: err.message || String(err) };
  }
}
