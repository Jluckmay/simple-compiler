// runtimes/lua.mjs — Execução Lua via wasmoon (Lua 5.4 compilado para WASM).
// Sem bibliotecas de sistema de arquivos/rede; saída capturada através de print().

import { LuaFactory } from 'https://cdn.jsdelivr.net/npm/wasmoon@1.16.0/+esm';

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
