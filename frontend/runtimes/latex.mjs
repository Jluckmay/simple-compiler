// runtimes/latex.mjs — Compilação LaTeX via Tectonic WASM + renderização PDF.js.
// Execução em memória; sem acesso a arquivos ou rede do host.
// Requer que tectonic.wasm e pdf.js estejam disponíveis em CDN com cabeçalhos CORS.
// Se o Tectonic não estiver disponível, recorre ao servidor backend (Render).

import { runViaBackend } from './backend.mjs';
let pdfjs = null;
let ready = false;
let initPromise = null;
let tectonicLoadError = null;

async function initTectonic() {
  // Tenta importar o Tectonic WASM de CDNs conhecidos.
  const candidates = [
    'https://cdn.jsdelivr.net/npm/@tectonic/tectonic@latest/+esm',
    'https://cdn.jsdelivr.net/npm/tectonic-wasm@latest/+esm',
  ];
  for (const url of candidates) {
    try {
      const mod = await import(/* @vite-ignore */ url);
      tectonic = mod.default || mod.tectonic || mod;
      if (tectonic && typeof tectonic.compile === 'function') {
        return true;
      }
    } catch (_) {
      // Tenta próximo candidato
    }
  }
  tectonicLoadError = 'Tectonic WASM não disponível em CDN. Recorrendo ao servidor backend.';
  return false;
}

async function initPdfJs() {
  // Tenta importar o pdf.js para renderização do PDF gerado.
  const candidates = [
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/+esm',
  ];
  for (const url of candidates) {
    try {
      const mod = await import(/* @vite-ignore */ url);
      pdfjs = mod.default || mod;
      if (pdfjs && (typeof pdfjs.getDocument === 'function' || typeof pdfjs.Document === 'function')) {
        return true;
      }
    } catch (_) {
      // Tenta próximo candidato
    }
  }
  // pdf.js não é estritamente necessário; o PDF pode ser baixado pelo usuário.
  return false;
}

async function init() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await initTectonic();
    await initPdfJs();
    ready = true;
  })();
  return initPromise;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function runViaBackend(code) {
  // Tenta até 3 vezes com backoff exponencial
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const resp = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'latex' }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      const data = await resp.json();
      return {
        output: data.output || '',
        error: data.error || null,
      };
    } catch (err) {
      if (attempt < 2) {
        // Espera 3s, 6s entre tentativas
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
      } else {
        return {
          output: '',
          error: `Backend indisponível após ${attempt + 1} tentativas. O servidor pode estar acordando (Render free tier). Tente novamente em alguns segundos.`,
        };
      }
    }
  }
}

export async function run(code) {
  await init();

  if (!tectonic) {
    console.info(tectonicLoadError || 'Tectonic WASM não disponível.');
    return await runViaBackend('latex', code);
  }

  try {
    // O Tectonic compila LaTeX para PDF em memória.
    // A API exata depende da versão do pacote @tectonic/tectonic.
    const result = await tectonic.compile(code, {
      format: 'latex',
      output: 'pdf',
    });

    let pdfBytes = null;
    if (result.pdf) {
      pdfBytes = result.pdf;
    } else if (result.output && result.output.pdf) {
      pdfBytes = result.output.pdf;
    }

    let output = '';
    if (pdfBytes) {
      const base64 = arrayBufferToBase64(pdfBytes);
      const dataUrl = `data:application/pdf;base64,${base64}`;
      output = `PDF gerado com sucesso (${pdfBytes.byteLength} bytes).\n`;
      output += `Visualizar: ${dataUrl}\n`;
      if (pdfjs) {
        output += '(PDF.js carregado para renderização inline)';
      }
    } else {
      output = result.stdout || result.output || 'Compilação concluída sem saída de PDF.';
    }

    return {
      output,
      error: result.error || null,
    };
  } catch (err) {
    // Se o Tectonic falhar na execução, tenta o backend como fallback
    console.warn('Tectonic execution failed, falling back to backend:', err.message);
    return await runViaBackend('latex', code);
  }
}
