// runtimes/r.mjs — Execução R via webr (R compilado para WASM).
// Execução em memória; sem acesso a rede ou sistema de arquivos do host.
// A API do webr varia entre versões; tenta múltiplos pontos de entrada.

import * as webr from 'https://cdn.jsdelivr.net/npm/webr@0.4.2/+esm';

let rApi = null;
let ready = false;
let initPromise = null;

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    // Tenta diferentes pontos de entrada da API do webr
    if (typeof webr.init === 'function') {
      await webr.init({});
      rApi = webr;
    } else if (typeof webr.default?.init === 'function') {
      await webr.default.init({});
      rApi = webr.default;
    } else if (typeof webr.R === 'function') {
      rApi = webr;
    } else {
      // Lista as chaves disponíveis para debug
      const keys = Object.keys(webr).filter(k => k.toLowerCase().includes('r') || k.toLowerCase().includes('init') || k.toLowerCase().includes('eval'));
      throw new Error(`webr API não reconhecida. Chaves disponíveis: ${Object.keys(webr).slice(0, 20).join(', ')}${keys.length > 0 ? ' (relevantes: ' + keys.join(', ') + ')' : ''}`);
    }
    ready = true;
  })();
  return initPromise;
}

export async function run(code) {
  await init();
  try {
    let result;
    if (typeof rApi.evalR === 'function') {
      result = rApi.evalR(code);
    } else if (typeof rApi.R === 'function') {
      result = rApi.R(code);
    } else {
      throw new Error('Nenhuma função de execução R encontrada na API do webr');
    }
    const output = result === undefined || result === null ? "" : String(result);
    return { output, error: null };
  } catch (err) {
    return { output: "", error: err.message || String(err) };
  }
}
