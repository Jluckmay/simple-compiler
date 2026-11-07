// runtimes/typescript.mjs — Executa TypeScript via QuickJS (WASM).
// TypeScript sem anotações de tipo é JavaScript válido, roda direto.
// Sem dependência externa de CDN — sem risco de falha de importação.

import { getQuickJS } from 'https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.31.0/+esm';

const MEMORY_LIMIT = 64 * 1024 * 1024;
const STACK_LIMIT = 1024 * 1024;

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
  'declare\\s+module',
  '<\\s*reference\\s+path',
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

  // TypeScript sem anotações de tipo é JavaScript válido, roda direto no QuickJS.
  const transpiled = code;

  const vm = quickjs.newContext();
  try {
    // Set up console.log shim and output capture
    vm.evalCode(`globalThis.__output = '';`);
    vm.evalCode(`
      globalThis.console = {
        log: (...args) => { globalThis.__output += args.join(' ') + '\\n'; },
        error: (...args) => { globalThis.__output += args.join(' ') + '\\n'; },
        warn: (...args) => { globalThis.__output += args.join(' ') + '\\n'; },
        info: (...args) => { globalThis.__output += args.join(' ') + '\\n'; }
      };
    `);

    const result = vm.evalCode(transpiled);

    // Retrieve captured console output
    const outResult = vm.evalCode(`globalThis.__output`);
    const captured = vm.dump(outResult);
    outResult.dispose();

    if (result.error) {
      const msg = vm.dump(result.error);
      result.error.dispose();
      return { output: captured || "", error: msg || String(result.error) };
    }

    const output = vm.dump(result.value);
    result.value.dispose();
    return { output: (captured || "") + (output == null ? "" : String(output)), error: null };
  } finally {
    vm.dispose();
  }
}
