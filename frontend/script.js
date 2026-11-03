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
  },
};

const EXEC_TIMEOUT_MS = 5000; // tempo máximo de execução do código (ms)
const DEFAULT_INIT_TIMEOUT_MS = 30000; // tempo padrão para baixar/inicializar o runtime WASM (ms)
const WORKER_INIT_TIMEOUT_MS = 60000; // tempo máximo para criar o worker (ms)

// Runtimes grandes (sqlite-wasm, webr) precisam de mais tempo para baixar.
const INIT_TIMEOUT_BY_LANG = {
  sql: 120000,  // sqlite-wasm é grande (~several MB)
  r: 120000,    // webr é grande (~several MB)
};

const LANGUAGE_MAP = {
  js: 'javascript',
  ts: 'typescript',
};

const WASM_LANGUAGES = new Set([
  'python', 'javascript', 'typescript', 'lua', 'sql', 'r', 'htmlcss',
]);

function runtimeKey(language) {
  return LANGUAGE_MAP[language] || language;
}

function initTimeoutFor(language) {
  return INIT_TIMEOUT_BY_LANG[language] || DEFAULT_INIT_TIMEOUT_MS;
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
  const w = new Worker('worker.mjs?v=20261103h', { type: 'module' });
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
    const timeoutMs = runtimeLoaded[language] ? EXEC_TIMEOUT_MS : initTimeoutFor(language);
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

  try {
    runBtn.disabled = true;
    runBtn.textContent = t(langKey, 'loadingRuntime');

    const key = runtimeKey(language);
    if (!WASM_LANGUAGES.has(key)) {
      resultEl.textContent = t(langKey, 'error') + ': ' +
        `A linguagem '${language}' requer um servidor backend para execução. ` +
        `O modo WASM suporta: Python, JavaScript, TypeScript, Lua, SQL e R.`;
      return;
    }

    const result = await runInWorker(key, code);

    if (result.error) {
      resultEl.textContent = t(langKey, 'error') + ': ' + result.error;
    } else if (result.output) {
      resultEl.textContent = result.output;
    } else {
      resultEl.textContent = '(no output)';
    }
  } catch (err) {
    resultEl.textContent = t(langKey, 'error') + ': ' + err.message;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = t(langKey, 'runButton');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadThemeFromPref();
  loadLangFromPref();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('code').addEventListener('keydown', handleCodeKeydown);
  document.getElementById('run').addEventListener('click', runCode);
});
