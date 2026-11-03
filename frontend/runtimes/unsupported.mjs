// runtimes/unsupported.mjs — Linguagens que não possuem runtime WASM distribuído
// via CDN.

export async function run(language) {
  console.info(`A linguagem '${language}' não é suportada no modo WASM.`);
  return { output: "", error: null };
}
