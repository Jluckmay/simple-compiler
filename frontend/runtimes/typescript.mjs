// runtimes/typescript.mjs — Transpila TypeScript para JavaScript e executa via QuickJS (WASM).
// Execução em memória; sandbox do QuickJS.
// Valida padrões perigosos antes e depois da transpilação.

import { getQuickJS } from 'https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.31.0/+esm';

// Carrega o TypeScript como ES module via esm.sh (fornece ESM nativo).
// Se falhar, roda o código como JavaScript puro (TS é JS válido para casos simples).
let ts = null;
let tsLoadErr = null;
try {
  // eslint-disable-next-line no-undef
  const tsMod = await import('https://esm.sh/typescript@5.7.2');
  ts = tsMod.default || tsMod;
} catch (e) {
  tsLoadErr = e.message || String(e);
}

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

  let transpiled;
  try {
    // Provide minimal ts.sys for browser environment (transpileModule needs it)
    if (!ts.sys) ts.sys = {};
    if (!ts.sys.fileExists) ts.sys.fileExists = () => false;
    if (!ts.sys.readFile) ts.sys.readFile = () => '';
    if (!ts.sys.writeFile) ts.sys.writeFile = () => {};
    if (!ts.sys.getCurrentDirectory) ts.sys.getCurrentDirectory = () => '/';
    if (!ts.sys.useCaseSensitiveFileNames) ts.sys.useCaseSensitiveFileNames = true;
    if (!ts.sys.getNewLine) ts.sys.getNewLine = () => '\n';
    if (!ts.sys.createHash) ts.sys.createHash = () => ({ update: () => {}, digest: () => '' });
    if (!ts.sys.realpath) ts.sys.realpath = (p) => p;
    if (!ts.sys.getFileSize) ts.sys.getFileSize = () => -1;
    if (!ts.sys.deleteFile) ts.sys.deleteFile = () => false;
    if (!ts.sys.createDirectory) ts.sys.createDirectory = () => {};
    if (!ts.sys.readDirectory) ts.sys.readDirectory = () => [];
    if (!ts.sys.getModifiedTime) ts.sys.getModifiedTime = () => 0;
    if (!ts.sys.setModifiedTime) ts.sys.setModifiedTime = () => {};
    if (!ts.sys.createGetCanonicalFileName) ts.sys.createGetCanonicalFileName = (p) => p;

    transpiled = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        strict: false,
        esModuleInterop: true,
      },
    }).outputText;
  } catch (err) {
    // If transpilation fails, run the code as-is (TypeScript is valid JS for simple cases)
    transpiled = code;
  }

  // Valida o código transpilado também
  const ok2 = validateCode(transpiled);
  if (!ok2.ok) {
    return { output: "", error: ok2.error };
  }

  const vm = quickjs.newContext();
  try {
    const result = vm.evalCode(transpiled);
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
