// runtimes/unsupported.mjs — Linguagens que não possuem runtime WASM distribuído
// via CDN.

export async function run(language) {
  return {
    output: "",
    error: `A linguagem '${language}' não é suportada no modo WASM.`,
  };
}
