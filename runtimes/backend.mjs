// runtimes/backend.mjs — Helper compartilhado para execução via servidor backend.
// Retries com backoff exponencial e AbortController timeout (30s).

const BACKEND_URL = 'https://simple-compiler-ldj7.onrender.com/compile';

export async function runViaBackend(language, code) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await resp.json();
      return { output: data.output || '', error: data.error || null };
    } catch (err) {
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
      } else {
        return {
          output: '',
          error: 'Backend indisponível após 3 tentativas. Servidor pode estar acordando.',
        };
      }
    }
  }
}
