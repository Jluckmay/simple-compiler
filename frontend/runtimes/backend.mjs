// runtimes/backend.mjs — Helper compartilhado para execução via servidor backend.
// Retries com backoff exponencial e AbortController timeout (30s).
// Em localhost (app desktop), usa o proxy /api/compile para evitar CORS.

const REMOTE_BACKEND_URL = 'https://simple-compiler-ldj7.onrender.com/compile';

function getApiUrl() {
  const host = self.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
    return '/api/compile';
  }
  return REMOTE_BACKEND_URL;
}

export async function runViaBackend(language, code) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const resp = await fetch(getApiUrl(), {
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
