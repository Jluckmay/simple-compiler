// runtimes/unsupported.mjs — Linguagens que não possuem runtime WASM distribuído
// via CDN e, portanto, requerem um servidor backend (mantido em backend/).

export async function run(language) {
  return {
    output: "",
    error: `A linguagem '${language}' requer um servidor backend para execução. O modo WASM suporta: Python, JavaScript, TypeScript, Lua, SQL e R.`,
  };
}
