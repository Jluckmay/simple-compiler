// runtimes/lua.mjs — Execução Lua via wasmoon (Lua 5.4 compilado para WASM).
// Sem bibliotecas de sistema de arquivos/rede; saída capturada através de print().
// Valida padrões perigosos antes da execução.

import { LuaFactory } from 'https://cdn.jsdelivr.net/npm/wasmoon@1.16.0/+esm';

const DANGEROUS_PATTERNS = [
  'os\\.execute',
  'os\\.remove',
  'os\\.rename',
  'os\\.tmpname',
  'os\\.getenv',
  'io\\.open',
  'io\\.popen',
  'io\\.lines',
  'dofile\\s*\\(',
  'loadfile\\s*\\(',
  'require\\s*\\(',
  'package\\.loadlib',
  'package\\.path',
  'package\\.cpath',
  'debug\\.',
  'collectgarbage',
  'loadstring',
  'load\\s*\\(',
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

let lua = null;
let ready = false;
let initPromise = null;

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const factory = new LuaFactory();
    lua = await factory.createEngine();
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
  lua.global.set("print", (...args) => {
    output.push(args.map(String).join("\t"));
  });
  try {
    await lua.doString(code);
    return {
      output: output.join("\n"),
      error: null,
    };
  } catch (err) {
    return {
      output: output.join("\n"),
      error: err.message || String(err),
    };
  }
}
