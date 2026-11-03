// runtimes/typescript.mjs — Transpila TypeScript para JavaScript e executa via QuickJS (WASM).
// Sem emissão de arquivos; execução em memória, sandbox do QuickJS.

import * as tsMod from 'https://cdn.jsdelivr.net/npm/typescript@5.7.2/lib/typescript.js';
import { getQuickJS } from 'https://cdn.jsdelivr.net/npm/quickjs-emscripten@0.31.0/+esm';

const ts = tsMod.default || tsMod;

const MEMORY_LIMIT = 64 * 1024 * 1024;
const STACK_LIMIT = 1024 * 1024;

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
  await init();
  let transpiled;
  try {
    transpiled = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
        strict: false,
        esModuleInterop: true,
      },
    }).outputText;
  } catch (err) {
    return {
      output: "",
      error: `TypeScript transpile error: ${err.message || String(err)}`,
    };
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
