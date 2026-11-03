// worker.mjs — Web Worker (módulo) que orquestra a execução WASM por linguagem.
// Cada linguagem carrega seu próprio runtime sob demanda. O worker é terminado
// externamente (script.js) quando o tempo limite é atingido, interrompendo
// loops infinitos sem travar a thread principal da UI.

const RUNTIMES = {
  python: () => import('./runtimes/python.mjs'),
  javascript: () => import('./runtimes/javascript.mjs'),
  typescript: () => import('./runtimes/typescript.mjs'),
  lua: () => import('./runtimes/lua.mjs'),
  sql: () => import('./runtimes/sql.mjs'),
  r: () => import('./runtimes/r.mjs'),
  htmlcss: () => import('./runtimes/htmlcss.mjs'),
  // c, cpp, csharp, java, go, lean, latex -> backend requerido
};

const runtimeCache = new Map();

async function getRuntime(language) {
  if (runtimeCache.has(language)) return runtimeCache.get(language);
  const loader = RUNTIMES[language];
  if (!loader) {
    const mod = await import('./runtimes/unsupported.mjs');
    runtimeCache.set(language, mod);
    return mod;
  }
  const mod = await loader();
  runtimeCache.set(language, mod);
  return mod;
}

self.onmessage = async (event) => {
  const { language, code, id } = event.data || {};
  try {
    const mod = await getRuntime(language);
    let result;
    if (language === 'htmlcss') {
      result = await mod.run();
    } else if (language === 'unsupported' || !RUNTIMES[language]) {
      result = await mod.run(language);
    } else {
      result = await mod.run(code);
    }
    self.postMessage({ id, output: result.output || "", error: result.error || null });
  } catch (err) {
    self.postMessage({
      id,
      output: "",
      error: err.message || String(err),
    });
  }
};
