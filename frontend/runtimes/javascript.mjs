// runtimes/javascript.mjs — Execução JavaScript via QuickJS (WASM) em sandbox.
// Sem acesso à rede, filesystem ou DOM do host. Limite de memória e pilha.
// Valida padrões perigosos antes da execução.

import { getQuickJS } from 'https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.31.0/+esm';

const DANGEROUS_PATTERNS = [
  'eval\\s*\\(',
  'Function\\s*\\(',
  'setTimeout\\s*\\(',
  'setInterval\\s*\\(',
  'setImmediate\\s*\\(',
  'requestAnimationFrame',
  'XMLHttpRequest',
  'fetch\\s*\\(',
  'WebSocket',
  'Worker\\s*\\(',
  'import\\s*\\(',
  'require\\s*\\(',
  'process\\.',
  'globalThis',
  'global\\s*=',
  'window\\.',
  'document\\.',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'crypto\\.',
  'performance\\.',
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
  const ok = validateCode(code);
  if (!ok.ok) {
    return { output: "", error: ok.error };
  }
  await init();
  const vm = quickjs.newContext();
  const logs = [];
  try {
    const logFn = vm.newFunction("log", (...args) => {
      const nativeArgs = args.map(arg => vm.dump(arg));
      logs.push(nativeArgs.map(a => typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)).join(' '));
    });
    const consoleHandle = vm.newObject();
    vm.setProp(consoleHandle, "log", logFn);
    vm.setProp(consoleHandle, "warn", logFn);
    vm.setProp(consoleHandle, "error", logFn);
    vm.setProp(consoleHandle, "info", logFn);
    vm.setProp(vm.global, "console", consoleHandle);
    consoleHandle.dispose();
    logFn.dispose();

    const result = vm.evalCode(code);
    if (result.error) {
      const errorObj = vm.dump(result.error);
      result.error.dispose();
      const msg = (errorObj && typeof errorObj === 'object')
        ? (errorObj.message || errorObj.name || JSON.stringify(errorObj))
        : String(errorObj || "Unknown error");
      return { output: logs.join('\n'), error: msg };
    }
    const evaluated = vm.dump(result.value);
    result.value.dispose();
    let output = logs.join('\n');
    if (output.length === 0 && evaluated !== undefined) {
      output = typeof evaluated === 'object' && evaluated !== null ? JSON.stringify(evaluated) : String(evaluated);
    }
    return { output, error: null };
  } finally {
    vm.dispose();
  }
}
