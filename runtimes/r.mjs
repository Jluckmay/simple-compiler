// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.
// Usa a classe WebR do webr para instanciar um ambiente R e executar código.
// Captura saída via interceptação de console.log (webr envia saída R para console).
// Valida padrões perigosos antes da execução.

import { WebR } from 'https://cdn.jsdelivr.net/npm/webr@0.4.2/+esm';

const DANGEROUS_PATTERNS = [
  'system\\s*\\(',
  'shell\\s*\\(',
  'file\\.create',
  'file\\.remove',
  'file\\.rename',
  'file\\.copy',
  'download\\.file',
  'url\\s*\\(',
  'socketConnection',
  'make\\.socket',
  'readLines\\s*\\(',
  'writeLines\\s*\\(',
  'source\\s*\\(',
  'setwd\\s*\\(',
  'getwd\\s*\\(',
  'Sys\\.setenv',
  'Sys\\.getenv',
  '\\.C\\s*\\(',
  '\\.Fortran\\s*\\(',
  '\\.Call\\s*\\(',
  '\\.External\\s*\\(',
];

const MAX_CODE_SIZE = 100 * 1024;

function validateCode(code) {
  if (typeof code !== 'string') {
    return { ok: false, error: "Código inválido: esperado uma string." };
  }
  if (new TextEncoder().encode(code).length > MAX_CODE_SIZE) {
    return { ok: false, error: "Código excede o tamanho máximo de 100 KB." };
  }
  for (const pattern of DANGEROUS_PATTERNS) {
    if (new RegExp(pattern, 'i').test(code)) {
      return { ok: false, error: `Padrão perigoso detectado: ${pattern}` };
    }
  }
  return { ok: true, error: null };
}

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
  const ok = validateCode(code);
  if (!ok.ok) {
    return { output: "", error: ok.error };
  }
  await init();
  const output = [];
  const originalLog = console.log;
  console.log = (...args) => {
    const msg = args.map(String).join(" ");
    if (!msg.startsWith('webR') && !msg.startsWith('[webR]') && !msg.includes('Downloading webR')) {
      output.push(msg.replace(/^\[log\]\s*/, ""));
    }
    originalLog.apply(console, args);
  };
  try {
    const evalResult = await r.evalR(code);
    if (output.length === 0 && evalResult) {
      try {
        const jsVal = await evalResult.toJs();
        if (jsVal && jsVal.values !== undefined) {
          output.push(Array.isArray(jsVal.values) ? jsVal.values.join(' ') : String(jsVal.values));
        }
      } catch (_) {}
    }
  } catch (err) {
    return { output: output.join("\n"), error: err.message || String(err) };
  } finally {
    console.log = originalLog;
  }
  const text = output.join("\n");
  return { output: text, error: null };
}
