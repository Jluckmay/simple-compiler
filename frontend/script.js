// script.js — Frontend WASM multi-linguagem (sem servidor backend).
// Cada linguagem executa em um Web Worker dedicado via seu runtime WASM.
// Um tempo limite externo (5 s) encerra o worker em caso de looping infinito.

const i18n = {
  en: {
    title: "Simple Compiler",
    languageLabel: "Language",
    runButton: "Run",
    outputTitle: "Output",
    error: "Error",
    placeholder: "Write your code here...",
    loadingRuntime: "Loading WASM runtime...",
    timeout: "Execution timed out after {seconds} seconds",
    runButton: "Run",
    backendFallback: "WASM execution failed, falling back to backend server...",
    backendError: "Backend error",
    wakingBackend: "Waking up backend server...",
  },
  pt: {
    title: "Compilador Simples",
    languageLabel: "Linguagem",
    runButton: "Executar",
    outputTitle: "Saída",
    error: "Erro",
    placeholder: "Escreva seu código aqui...",
    loadingRuntime: "Carregando runtime WASM...",
    timeout: "Execução excedeu {seconds} segundos",
    runButton: "Executar",
    backendFallback: "Falha na execução WASM, recorrendo ao servidor backend...",
    backendError: "Erro do servidor backend",
    wakingBackend: "Acordando servidor backend...",
  },
};

const EXEC_TIMEOUT_MS = 5000; // tempo máximo de execução do código (ms)
const DEFAULT_INIT_TIMEOUT_MS = 30000; // tempo padrão para baixar/inicializar o runtime WASM (ms)
const WORKER_INIT_TIMEOUT_MS = 60000; // tempo máximo para criar o worker (ms)

// Runtimes grandes (sqlite-wasm, webr) precisam de mais tempo para baixar.
// Linguagens que executam no backend precisam de tempo extra para cold start.
const INIT_TIMEOUT_BY_LANG = {
  sql: 120000,  // sqlite-wasm é grande (~several MB)
  r: 120000,    // webr é grande (~several MB)
  latex: 180000, // tectonic + pdf.js são grandes (~several MB)
  c: 150000,    // backend cold start (Render free tier)
  cpp: 150000,  // backend cold start
  csharp: 150000, // backend cold start
  java: 150000, // backend cold start
  go: 150000,   // backend cold start
  lean: 150000, // backend cold start
};

const BACKEND_LANGUAGES = new Set([
  'c', 'cpp', 'csharp', 'java', 'go', 'lean', 'sql', 'latex',
]);

const LANGUAGE_MAP = {
  js: 'javascript',
  ts: 'typescript',
};

const WASM_LANGUAGES = new Set([
  'python', 'javascript', 'typescript', 'lua', 'sql', 'r', 'latex', 'htmlcss',
  'c', 'cpp', 'csharp', 'java', 'go', 'lean',
]);

function runtimeKey(language) {
  return LANGUAGE_MAP[language] || language;
}

function initTimeoutFor(language) {
  if (BACKEND_LANGUAGES.has(language)) {
    return INIT_TIMEOUT_BY_LANG[language] || 150000;
  }
  return INIT_TIMEOUT_BY_LANG[language] || DEFAULT_INIT_TIMEOUT_MS;
}

function getApiUrl() {
  return 'https://simple-compiler-ldj7.onrender.com/compile';
}

async function wakeBackend() {
  // Tenta acordar o backend até 3 vezes com intervalo
  for (let i = 0; i < 3; i++) {
    try {
      await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '\\documentclass{article}\\begin{document}Hello\\end{document}', language: 'latex' }),
      });
      return; // Sucesso, não precisa tentar novamente
    } catch (_) {
      // Ignore wake-up errors; the backend may be spinning down
      await new Promise(r => setTimeout(r, 2000)); // Espera 2s entre tentativas
    }
  }
}

async function runViaBackend(code, language) {
  // Tenta até 3 vezes com backoff exponencial
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const resp = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
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
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1))); // Espera 3s, 6s entre tentativas
      } else {
        throw err;
      }
    }
  }
}

const workers = {}; // language -> Worker
const pending = new Map(); // id -> { resolve, reject, timer, worker }
const runtimeLoaded = {}; // language -> boolean (runtime já baixado/inicializado)
let msgCounter = 0;

function setLang(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[lang][key]) el.placeholder = i18n[lang][key];
  });
}

function loadLangFromPref() {
  const stored = localStorage.getItem('lang') || navigator.language.slice(0, 2);
  const lang = stored.startsWith('pt') ? 'pt' : 'en';
  document.getElementById('lang-toggle').textContent = lang === 'pt' ? 'PT' : 'EN';
  setLang(lang);
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  updateThemeIcon();
}

function loadThemeFromPref() {
  const stored = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', stored);
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  const theme = document.documentElement.getAttribute('data-theme');
  btn.textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleLang() {
  const btn = document.getElementById('lang-toggle');
  const current = btn.textContent.trim();
  const next = current === 'EN' ? 'PT' : 'EN';
  btn.textContent = next;
  const lang = next === 'PT' ? 'pt' : 'en';
  localStorage.setItem('lang', lang);
  setLang(lang);
}

function handleCodeKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.substring(0, start) + '  ' + value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  }
}

function createWorker(language) {
  const w = new Worker('worker.mjs?v=20261105b', { type: 'module' });
  w.language = language;
  return new Promise((resolve, reject) => {
    const initTimeout = setTimeout(() => {
      w.terminate();
      reject(new Error('Worker initialization timeout'));
    }, initTimeoutFor(language));

    w.onmessage = (event) => {
      const { id, output, error } = event.data || {};
      const cb = pending.get(id);
      if (!cb || cb.worker !== w) return;
      pending.delete(id);
      clearTimeout(cb.timer);
      if (error) {
        cb.reject(new Error(error));
      } else {
        runtimeLoaded[w.language] = true;
        cb.resolve({ output, error: null });
      }
    };

    w.onerror = (err) => {
      clearTimeout(initTimeout);
      w.terminate();
      const detail = `${err.message || ''} | ${err.filename || ''}:${err.lineno || ''}:${err.colno || ''} | ${err.error ? err.error.stack : ''}`;
      // Rejeita todas as chamadas pendentes deste worker
      for (const [id, cb] of pending) {
        if (cb.worker === w) {
          pending.delete(id);
          clearTimeout(cb.timer);
          cb.reject(new Error(`Worker error: ${detail}`));
        }
      }
      reject(new Error(`Worker error: ${detail}`));
    };

    resolve(w);
  });
}

function getWorker(language) {
  if (!workers[language]) {
    workers[language] = createWorker(language);
  }
  return workers[language];
}

function removeWorker(language) {
  const w = workers[language];
  if (w) {
    try { w.terminate(); } catch (_) {}
    delete workers[language];
  }
}

function runInWorker(language, code) {
  return new Promise(async (resolve, reject) => {
    const id = ++msgCounter;
    let worker = null;

    try {
      worker = await getWorker(language);
    } catch (err) {
      removeWorker(language);
      reject(err);
      return;
    }

    // Primeira execução de uma linguagem inclui o download do runtime WASM.
    // Linguagens backend mantêm timeout longo mesmo após runtime carregado.
    const timeoutMs = (runtimeLoaded[language] && !BACKEND_LANGUAGES.has(language))
      ? EXEC_TIMEOUT_MS
      : initTimeoutFor(language);
    const langKey = document.getElementById('lang-toggle').textContent.trim() === 'PT' ? 'pt' : 'en';

    const timer = setTimeout(() => {
      pending.delete(id);
      removeWorker(language);
      runtimeLoaded[language] = false;
      reject(new Error(i18n[langKey].timeout.replace('{seconds}', timeoutMs / 1000)));
    }, timeoutMs);

    pending.set(id, { resolve, reject, timer, worker });

    worker.postMessage({ language, code, id });
  });
}

function t(langKey, key) {
  return i18n[langKey][key] || key;
}

async function runCode() {
  const code = document.getElementById('code').value;
  const language = document.getElementById('language').value;
  const resultEl = document.getElementById('result');
  const runBtn = document.getElementById('run');
  const langKey = document.getElementById('lang-toggle').textContent.trim() === 'PT' ? 'pt' : 'en';
  resultEl.textContent = '';

  if (!code.trim()) {
    resultEl.textContent = '';
    return;
  }

  const key = runtimeKey(language);
  if (!WASM_LANGUAGES.has(key)) {
    console.info(`A linguagem '${language}' não é suportada no modo WASM.`);
    runBtn.disabled = false;
    runBtn.textContent = t(langKey, 'runButton');
    return;
  }

  let wasmResult = null;
  let wasmError = null;

  try {
    runBtn.disabled = true;
    runBtn.textContent = t(langKey, 'loadingRuntime');

    wasmResult = await runInWorker(key, code);
  } catch (err) {
    wasmError = err;
  }

  // Se o WASM falhou, recorre ao servidor backend (mensagem apenas no console)
  if (wasmError || (wasmResult && wasmResult.error)) {
    console.info(`WASM falhou para '${language}', recorrendo ao servidor backend.`);
    try {
      const backendResult = await runViaBackend(code, language);
      if (backendResult.error) {
        resultEl.textContent = t(langKey, 'backendError') + ': ' + backendResult.error;
      } else if (backendResult.output) {
        resultEl.textContent = backendResult.output;
      } else {
        resultEl.textContent = '(no output)';
      }
    } catch (backendErr) {
      resultEl.textContent = t(langKey, 'backendError') + ': ' + backendErr.message;
    }
  } else if (wasmResult && wasmResult.output) {
    resultEl.textContent = wasmResult.output;
  } else {
    resultEl.textContent = '(no output)';
  }

  runBtn.disabled = false;
  runBtn.textContent = t(langKey, 'runButton');
}

document.addEventListener('DOMContentLoaded', () => {
  loadThemeFromPref();
  loadLangFromPref();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('code').addEventListener('keydown', handleCodeKeydown);
  document.getElementById('run').addEventListener('click', runCode);

  // Acorda o servidor backend em segundo plano (Render free tier hiberna após inatividade)
  wakeBackend();
});
